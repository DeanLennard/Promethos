// pages/api/features/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Feature, { IFeature } from '@/models/Feature';
import Project from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<IFeature[] | IFeature | ErrorResponse>
) {
    // 1) auth
    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Missing auth token' });
    }
    let payload: JWTPayload;
    try {
        payload = verifyJwt(token);
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    await dbConnect();

    switch (req.method) {
        case 'GET': {
            const { projectId } = req.query as { projectId?: string };

            // If a projectId was provided, check it belongs to the company
            if (projectId) {
                const project = await Project.findOne({
                    _id: projectId,
                    companyId: payload.companyId,
                });
                if (!project) {
                    return res
                        .status(403)
                        .json({ success: false, error: 'Forbidden: you do not own that project' });
                }
                // Return only features for that one project
                const features = await Feature.find({ projectId }).lean();
                return res.status(200).json(features);
            }

            // No projectId → return every feature in any project under your company
            const companyProjects = await Project.find(
                { companyId: payload.companyId },
                '_id'
            ).lean();
            const projectIds = companyProjects.map((p) => p._id);
            const features = await Feature.find({
                projectId: { $in: projectIds },
            }).lean();
            return res.status(200).json(features);
        }

        case 'POST': {
            // ensure the submitted projectId belongs to your company
            const { projectId, ...rest } = req.body as Partial<IFeature>;
            if (!projectId) {
                return res.status(400).json({ success: false, error: 'projectId is required' });
            }
            const project = await Project.findOne({
                _id: projectId,
                companyId: payload.companyId
            });
            if (!project) {
                return res.status(403).json({ success: false, error: 'Cannot add feature to that project' });
            }

            try {
                const created = await Feature.create({ projectId, ...rest });
                return res.status(201).json(created);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error adding feature";
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
