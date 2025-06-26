// src/pages/api/absences/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose, { FilterQuery } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Absence, { IAbsence } from "@/models/Absence";
import Resource from "@/models/Resource";
import { getTokenFromHeader, verifyJwt, JWTPayload } from "@/lib/auth";

type ErrorResponse = { error: string };
type AbsenceResponse = IAbsence[];

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AbsenceResponse | IAbsence | ErrorResponse>
) {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    let payload: JWTPayload;
    try {
        payload = verifyJwt(token);
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    await dbConnect();
    const { method } = req;

    // Helper: ensure resource belongs to the caller's company
    async function assertCompanyResource(resourceId: string) {
        const r = await Resource.findById(resourceId);
        if (!r) {
            res.status(404).json({ error: "Resource not found" });
            return false;
        }
        if (r.companyId.toString() !== payload.companyId) {
            res.status(403).json({ error: "Forbidden" });
            return false;
        }
        return true;
    }

    switch (method) {
        case "GET": {
            // optionally filter by resourceId (but only if it's yours)
            const { resourceId } = req.query as { resourceId?: string };
            // fetch only your company's resources
            const ownedResources = await Resource
                .find({ companyId: payload.companyId })
                .select("_id")
                .lean();
            const ownedIds = ownedResources.map(r => String(r._id));

            const filter: FilterQuery<IAbsence> = {};
            if (resourceId) {
                if (!ownedIds.includes(resourceId)) {
                    return res.status(403).json({ error: "Forbidden" });
                }
                filter.resourceId = resourceId;
            } else {
                filter.resourceId = { $in: ownedIds };
            }

            const absences = await Absence.find(filter)
                .sort({ fromDate: 1 })
                .lean<IAbsence>();
            return res.status(200).json(absences);
        }

        case "POST": {
            // treat everything coming in from JSON as strings
            const {
                resourceId: rawResourceId,
                fromDate,
                toDate,
                type,
                note,
            } = req.body as {
                resourceId?: string;
                fromDate?: string;
                toDate?: string;
                type?: IAbsence["type"];
                note?: string;
            };

            if (!rawResourceId || !fromDate || !toDate || !type) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // coerce to a string
            const resourceId = rawResourceId.toString();

            // make sure that resource belongs to you
            if (!(await assertCompanyResource(resourceId))) return;

            // now you can either pass the string directly and let Mongoose cast it,
            // or explicitly wrap it in an ObjectId:
            const created = await Absence.create({
                resourceId: new mongoose.Types.ObjectId(resourceId),
                fromDate,
                toDate,
                type,
                note,
            });

            return res.status(201).json(created);
        }

        default:
            res.setHeader("Allow", ["GET", "POST"]);
            return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}
