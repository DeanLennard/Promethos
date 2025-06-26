// src/pages/api/monthly-records/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { FilterQuery } from "mongoose";
import dbConnect from "@/lib/mongodb";
import MonthlyRecord, { IMonthlyRecord } from "@/models/MonthlyRecord";
import Project from "@/models/Project";
import { getTokenFromHeader, verifyJwt, JWTPayload } from "@/lib/auth";

type ErrorResponse = { error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        IMonthlyRecord[] | IMonthlyRecord | ErrorResponse
    >
) {
    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ error: "Missing auth token" });
    }

    let payload: JWTPayload;
    try {
        payload = verifyJwt(token);
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    await dbConnect();

    switch (req.method) {
        case "GET": {
            const { projectId, resourceId, period } = req.query;

            // If they passed a projectId, ensure it's in their company
            if (projectId) {
                const ok = await Project.exists({
                    _id: projectId as string,
                    companyId: payload.companyId,
                });
                if (!ok) {
                    return res.status(403).json({ error: "Access denied" });
                }
            }

            // Build our filter with proper typing
            const filter: FilterQuery<IMonthlyRecord> = {};
            if (projectId)  filter.projectId  = projectId;
            if (resourceId) filter.resourceId = resourceId;
            if (period)     filter.period     = period;

            const records = await MonthlyRecord.find(filter).lean();
            return res.status(200).json(records);
        }

        case "POST": {
            const {
                projectId,
                resourceId,
                period,
                forecastDays,
                actualCost,
            } = req.body as IMonthlyRecord & {
                forecastDays: number;
                actualCost: number;
            };

            // Make sure this project belongs to them
            const project = await Project.findOne({
                _id: projectId,
                companyId: payload.companyId,
            });
            if (!project) {
                return res.status(403).json({ error: "Cannot create on that project" });
            }

            try {
                // Upsert
                const existing = await MonthlyRecord.findOne({
                    projectId,
                    resourceId,
                    period,
                });
                if (existing) {
                    existing.forecastDays = forecastDays;
                    existing.actualCost   = actualCost;
                    await existing.save();
                    return res.status(200).json(existing);
                }

                const created = await MonthlyRecord.create({
                    projectId,
                    resourceId,
                    period,
                    forecastDays,
                    actualCost,
                });
                return res.status(201).json(created);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding monthly record";
                return res.status(400).json({ error: message });
            }
        }

        default:
            res.setHeader("Allow", ["GET","POST"]);
            return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
