// pages/api/allocations/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Allocation, { IAllocation } from '@/models/Allocation';
import Resource from '@/models/Resource';
import Project from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ListResponse = { success: true; data: IAllocation[] };
type ItemResponse = { success: true; data: IAllocation };
type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ListResponse | ItemResponse | ErrorResponse>
) {
    // 1. Authenticate
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ success: false, error: 'Missing auth token' });

    let payload: JWTPayload;
    try {
        payload = verifyJwt(token);
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    await dbConnect();

    switch (req.method) {
        case 'GET': {
            const companyResources = await Resource.find({ companyId: payload.companyId }, '_id').lean();
            const ids = companyResources.map(r => r._id);
            const allocs = await Allocation.find({ resourceId: { $in: ids } }).lean();
            // instead of { success: true, data: allocs }:
            return res.status(200).json(allocs);
        }
        case 'POST': {
            const { projectId, resourceId, fromDate, toDate, allocationPct, plannedDays } = req.body;

            // 2. Basic validation
            if (!projectId || !resourceId || !fromDate || !toDate || allocationPct == null || plannedDays == null) {
                return res.status(400).json({ success: false, error: 'Missing required fields' });
            }

            // 3. Authorize project
            const project = await Project.findOne({ _id: projectId, companyId: payload.companyId });
            if (!project) {
                return res.status(403).json({ success: false, error: 'Forbidden: project not in your company' });
            }

            // 4. Authorize resource
            const resource = await Resource.findOne({ _id: resourceId, companyId: payload.companyId });
            if (!resource) {
                return res.status(403).json({ success: false, error: 'Forbidden: resource not in your company' });
            }

            try {
                // 5. Create, including projectId!
                const created = await Allocation.create({
                    projectId,
                    resourceId,
                    fromDate,
                    toDate,
                    allocationPct,
                    plannedDays,
                });
                return res.status(201).json({ success: true, data: created });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding allocation";
                return res.status(400).json({ success: false, error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET','POST']);
            return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
}
