// pages/api/resources/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Resource, { IResource } from '@/models/Resource';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ResponseBody = IResource | { error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseBody>
) {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    let payload: JWTPayload;
    try { payload = verifyJwt(token) }
    catch { return res.status(401).json({ error: 'Invalid or expired token' }); }

    await dbConnect();
    const { id } = req.query;

    // helper to load & enforce companyId
    async function loadResource() {
        const r = await Resource.findById(id);
        if (!r) {
            res.status(404).json({ error: 'Not found' });
            return null;
        }
        if (r.companyId.toString() !== payload.companyId) {
            res.status(403).json({ error: 'Forbidden' });
            return null;
        }
        return r;
    }

    switch (req.method) {
        case 'GET': {
            const r = await loadResource();
            if (!r) return;
            return res.status(200).json(r);
        }
        case 'PUT': {
            const existing = await loadResource();
            if (!existing) return;
            try {
                const updated = await Resource.findByIdAndUpdate(id, req.body, {
                    new: true, runValidators: true
                });
                return res.status(200).json(updated!);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating resource";
                return res.status(400).json({ error: message });
            }
        }
        case 'DELETE': {
            const existing = await loadResource();
            if (!existing) return;
            await Resource.findByIdAndDelete(id);
            return res.status(204).end();
        }
        default:
            res.setHeader('Allow', ['GET','PUT','DELETE']);
            return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
