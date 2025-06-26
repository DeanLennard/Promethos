// pages/api/projects/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Project, { IProject } from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ResponseBody =
    | { success: true; data: IProject[] }
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

    switch (req.method) {
        case 'GET': {
            const projects = await Project.find({ companyId: payload.companyId }).lean();
            return res.status(200).json(projects);
        }

        case 'POST': {
            try {
                // force companyId from our JWT
                const project = await Project.create({
                    ...req.body,
                    companyId: payload.companyId,
                });
                return res.status(201).json({ success: true, data: project });
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding project";
                return res.status(400).json({ success: false, error: message });
            }
        }

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
}
