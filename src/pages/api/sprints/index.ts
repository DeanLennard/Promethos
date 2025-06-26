// pages/api/sprints/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Sprint, { ISprint } from '@/models/Sprint';
import { getTokenFromHeader, verifyJwt } from '@/lib/auth';

type ListResponse = { success: true; data: ISprint[] };
type ItemResponse = { success: true; data: ISprint };
type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ListResponse | ItemResponse | ErrorResponse>
) {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ success: false, error: 'Missing auth token' });

    try {
        verifyJwt(token);
    } catch {
        return res
            .status(401)
            .json({ success: false, error: 'Invalid or expired token' });
    }

    await dbConnect();

    switch (req.method) {
        case 'GET': {
            // optional ?projectId=…
            const projectId = req.query.projectId as string | undefined;
            if (!projectId) {
                return res
                    .status(400)
                    .json({ success: false, error: 'projectId query parameter is required' });
            }

            // find sprints for this project
            const sprints = await Sprint.find({ projectId }).sort({ startDate: 1 }).lean();
            return res.status(200).json({ success: true, data: sprints });
        }

        case 'POST': {
            const { projectId, name, startDate, endDate } = req.body;
            if (!projectId || !name || !startDate || !endDate) {
                return res.status(400).json({ success: false, error: 'Missing required fields' });
            }

            // You may want to verify projectId belongs to this user’s company here.

            try {
                const created = await Sprint.create({ projectId, name, startDate, endDate });
                return res.status(201).json({ success: true, data: created });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding sprint";
                return res.status(400).json({ success: false, error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET','POST']);
            return res
                .status(405)
                .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
}
