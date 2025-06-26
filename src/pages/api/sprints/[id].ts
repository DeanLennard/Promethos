// pages/api/sprints/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Sprint, { ISprint } from '@/models/Sprint';
import { getTokenFromHeader, verifyJwt } from '@/lib/auth';

type ItemResponse = { success: true; data: ISprint };
type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ItemResponse | ErrorResponse>
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
    const { id } = req.query;

    // helper to check existence
    async function restrict(doc: ISprint | null) {
        if (!doc) {
            res.status(404).json({ success: false, error: 'Not found' });
            return null;
        }
        // optionally verify doc.projectId belongs to payload.companyId
        return doc;
    }

    switch (req.method) {
        case 'GET': {
            const sprint = await Sprint.findById(id);
            if (!(await restrict(sprint))) return;
            return res.status(200).json({ success: true, data: sprint! });
        }

        case 'PUT': {
            const sprint = await Sprint.findById(id);
            if (!(await restrict(sprint))) return;

            try {
                const updated = await Sprint.findByIdAndUpdate(
                    id,
                    req.body,
                    { new: true, runValidators: true }
                );
                if (!(await restrict(updated))) return;
                return res.status(200).json({ success: true, data: updated! });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating sprint";
                return res.status(400).json({ success: false, error: message });
            }
        }

        case 'DELETE': {
            const sprint = await Sprint.findById(id);
            if (!(await restrict(sprint))) return;

            try {
                await Sprint.findByIdAndDelete(id);
                return res.status(200).json({ success: true, data: sprint! });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating sprint";
                return res.status(400).json({ success: false, error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET','PUT','DELETE']);
            return res
                .status(405)
                .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
}
