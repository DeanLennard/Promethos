// pages/api/features/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Feature, { IFeature } from '@/models/Feature';
import Project from '@/models/Project';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ErrorResponse = { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<IFeature | ErrorResponse>
) {
    // 1) extract & verify JWT
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
    const { query: { id }, method } = req;

    // helper: confirm this feature’s project belongs to your company
    async function authorizeFeature(feature: IFeature) {
        const proj = await Project.findOne({
            _id: feature.projectId,
            companyId: payload.companyId
        });
        return Boolean(proj);
    }

    switch (method) {
        case 'GET': {
            const feat = await Feature.findById(id);
            if (!feat) {
                return res.status(404).json({ success: false, error: 'Not found' });
            }
            if (!(await authorizeFeature(feat))) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }
            return res.status(200).json(feat);
        }

        case 'PUT': {
            const feat = await Feature.findById(id);
            if (!feat) {
                return res.status(404).json({ success: false, error: 'Not found' });
            }
            if (!(await authorizeFeature(feat))) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }

            try {
                Object.assign(feat, req.body);
                await feat.save();
                return res.status(200).json(feat);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating feature";
                return res.status(400).json({ success: false, error: message });
            }
        }

        case 'DELETE': {
            const feat = await Feature.findById(id);
            if (!feat) {
                return res.status(404).json({ success: false, error: 'Not found' });
            }
            if (!(await authorizeFeature(feat))) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }

            await feat.remove();
            return res.status(204).end();
        }

        default:
            res.setHeader('Allow', ['GET','PUT','DELETE']);
            return res
                .status(405)
                .json({ success: false, error: `Method ${method} Not Allowed` });
    }
}
