// src/pages/api/absences/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import Absence, { IAbsence } from "@/models/Absence";
import Resource from "@/models/Resource";
import { getTokenFromHeader, verifyJwt, JWTPayload } from "@/lib/auth";

type ErrorResponse = { error: string };
type SuccessResponse = IAbsence;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
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
    const { method, query: { id }, body } = req;

    // Ensure the absence exists and belongs to a resource in the caller's company
    async function guard(abs: IAbsence | null) {
        if (!abs) {
            res.status(404).json({ error: "Not found" });
            return null;
        }

        // lookup the Resource to check its companyId
        const resource = await Resource.findById(abs.resourceId);
        if (!resource) {
            res.status(404).json({ error: "Not found" });
            return null;
        }

        // block if not same company
        if (resource.companyId.toString() !== payload.companyId) {
            res.status(403).json({ error: "Forbidden" });
            return null;
        }

        // optional: if you want absences to be “private” to their owner:
        // if (abs.ownerId.toString() !== payload.userId) {
        //   res.status(403).json({ error: "Forbidden" });
        //   return null;
        // }

        return abs;
    }

    switch (method) {
        case "GET": {
            const abs = await Absence.findById(id);
            if (!(await guard(abs))) return;
            return res.status(200).json(abs!);
        }

        case "PUT": {
            const existing = await Absence.findById(id);
            if (!(await guard(existing))) return;

            try {
                const updates = body as Partial<IAbsence>;
                const updated = await Absence.findByIdAndUpdate(id, updates, {
                    new: true,
                    runValidators: true,
                });
                if (!(await guard(updated))) return;
                return res.status(200).json(updated!);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating absence";
                return res.status(400).json({ error: message });
            }
        }

        case "DELETE": {
            const existing = await Absence.findById(id);
            if (!(await guard(existing))) return;

            await Absence.findByIdAndDelete(id);
            return res.status(204).end();
        }

        default:
            res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
            return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}
