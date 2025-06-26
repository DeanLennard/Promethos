// pages/api/resources/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Resource, { IResource } from '@/models/Resource';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ErrorResponse = { error: string };
type ListResponse  = IResource[];
type ItemResponse  = IResource;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ListResponse | ItemResponse | ErrorResponse>
) {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    let payload: JWTPayload;
    try { payload = verifyJwt(token) }
    catch { return res.status(401).json({ error: 'Invalid or expired token' }); }

    await dbConnect();

    switch (req.method) {
        case 'GET': {
            // only fetch resources belonging to your company
            const all = await Resource.find({ companyId: payload.companyId });
            return res.status(200).json(all);
        }

        case 'POST': {
            try {
                const { name, role, dayRate, skillTags, contact } = req.body;
                const created = await Resource.create({
                    name, role, dayRate, skillTags, contact,
                    companyId: payload.companyId,   // tie the new resource to your company
                });
                return res.status(201).json(created);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding resource";
                return res.status(400).json({ error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET','POST']);
            return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
