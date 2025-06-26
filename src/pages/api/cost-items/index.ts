// pages/api/cost-items/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import CostItem, { ICostItem } from '@/models/CostItem';
import Project from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ICostItem[] | ICostItem | ErrorResponse>
) {
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
            // only cost-items whose project belongs to your company
            const projects = await Project.find(
                { companyId: payload.companyId },
                '_id'
            );
            const projIds = projects.map(p => p._id);
            const items = await CostItem.find({ projectId: { $in: projIds } });
            return res.status(200).json(items);
        }

        case 'POST': {
            const { projectId, type, description, amount, dateIncurred, vendor } = req.body;
            // check that project belongs to your company
            const proj = await Project.findOne({
                _id: projectId,
                companyId: payload.companyId
            });
            if (!proj) {
                return res.status(403).json({ success: false, error: 'Forbidden: project not in your company' });
            }
            try {
                const created = await CostItem.create({
                    projectId, type, description, amount, dateIncurred, vendor
                });
                return res.status(201).json(created);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding cost item";
                return res.status(400).json({ success: false, error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET','POST']);
            return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
}
