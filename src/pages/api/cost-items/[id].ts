// pages/api/cost-items/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import CostItem, { ICostItem } from '@/models/CostItem';
import Project from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ICostItem | ErrorResponse>
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
    const { query: { id }, method } = req;

    // helper to verify that the cost-item’s project is in your company
    async function authorizeCostItem(ci: ICostItem) {
        const proj = await Project.findOne({
            _id: ci.projectId,
            companyId: payload.companyId
        });
        return Boolean(proj);
    }

    switch (method) {
        case 'GET': {
            const ci = await CostItem.findById(id);
            if (!ci) return res.status(404).json({ success: false, error: 'Not found' });
            if (!(await authorizeCostItem(ci))) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }
            return res.status(200).json(ci);
        }

        case 'PUT': {
            const ci = await CostItem.findById(id);
            if (!ci) return res.status(404).json({ success: false, error: 'Not found' });
            if (!(await authorizeCostItem(ci))) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }
            try {
                Object.assign(ci, req.body);
                await ci.save();
                return res.status(200).json(ci);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating cost item";
                return res.status(400).json({ success: false, error: message });
            }
        }

        case 'DELETE': {
            const ci = await CostItem.findById(id);
            if (!ci) return res.status(404).json({ success: false, error: 'Not found' });
            if (!(await authorizeCostItem(ci))) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }
            await ci.remove();
            return res.status(204).end();
        }

        default:
            res.setHeader('Allow', ['GET','PUT','DELETE']);
            return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
    }
}
