// pages/api/monthly-records/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import MonthlyRecord, { IMonthlyRecord } from "@/models/MonthlyRecord";
import Project from "@/models/Project";
import { getTokenFromHeader, verifyJwt, JWTPayload } from "@/lib/auth";

type ErrorResponse = { error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<IMonthlyRecord | ErrorResponse>
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
    const {
        method,
        query: { id },
        body,
    } = req;

    // Before doing anything, ensure this record belongs to a project in your company:
    const existing = await MonthlyRecord.findById(id).lean();
    if (!existing) {
        return res.status(404).json({ error: "Not found" });
    }
    const project = await Project.findOne({
        _id: existing.projectId,
        companyId: payload.companyId,
    }).lean();
    if (!project) {
        return res.status(403).json({ error: "Access denied" });
    }

    switch (method) {
        case "GET":
            return res.status(200).json(existing);

        case "PUT":
            try {
                const updates: Partial<IMonthlyRecord> = {};
                for (const key of ["forecastDays", "actualCost"] as const) {
                    if (body[key] != null) updates[key] = body[key];
                }
                const updated = await MonthlyRecord.findByIdAndUpdate(id, updates, {
                    new: true,
                    runValidators: true,
                });
                if (!updated) return res.status(404).json({ error: "Not found" });
                return res.status(200).json(updated);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating monthly record";
                return res.status(400).json({ error: message });
            }

        case "DELETE":
            await MonthlyRecord.findByIdAndDelete(id);
            return res.status(204).end();

        default:
            res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
            return res
                .status(405)
                .json({ error: `Method ${method} Not Allowed` });
    }
}
