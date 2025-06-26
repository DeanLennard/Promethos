// pages/api/projects/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Project, { IProject } from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ResponseBody =
    | { success: true; data: IProject }
    | { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseBody>
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
    const {
        query: { id },
        method,
        body,
    } = req;

    // helper: make sure the project belongs to this company (and optionally, to this user if private)
    async function restrict<T extends IProject>(doc: T | null) {
        if (!doc) {
            res.status(404).json({ success: false, error: 'Not found' });
            return null;
        }
        if (doc.companyId.toString() !== payload.companyId) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return null;
        }
        // if you support a `private` flag and also want only the creator:
        // if (doc.private && doc.ownerId.toString() !== payload.userId) { … }
        return doc;
    }

    switch (method) {
        case 'GET': {
            const doc = await Project.findById(id);
            const project = await restrict(doc);
            if (!project) return;
            return res.status(200).json({ project });
        }

        case 'PUT': {
            // ensure project exists & belongs to this company before updating
            const existing = await Project.findById(id);
            if (!(await restrict(existing))) return;

            try {
                const updated = await Project.findByIdAndUpdate(id, body, {
                    new: true,
                    runValidators: true,
                });
                const project = await restrict(updated);
                if (!project) return;
                return res.status(200).json({ success: true, data: project });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating project";
                return res.status(400).json({ success: false, error: message });
            }
        }

        case 'DELETE': {
            // ensure project exists & belongs to this company before deleting
            const existing = await Project.findById(id);
            if (!(await restrict(existing))) return;

            try {
                await Project.findByIdAndDelete(id);
                return res.status(200).json({ success: true, data: existing! });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating project";
                return res.status(400).json({ success: false, error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
            return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
    }
}
