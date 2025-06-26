// pages/api/allocations/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Allocation, { IAllocation } from '@/models/Allocation';
import Resource from '@/models/Resource';
import { getTokenFromHeader, verifyJwt, JWTPayload } from '@/lib/auth';

type ResponseBody = IAllocation | { success: false; error: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseBody>
) {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ success: false, error: 'Missing auth token' });

    let payload: JWTPayload;
    try { payload = verifyJwt(token) }
    catch { return res.status(401).json({ success: false, error: 'Invalid or expired token' }); }

    await dbConnect();
    const { id } = req.query;

    // only allow operations on allocations whose resource is in your company
    async function authorize(): Promise<IAllocation | null> {
        const alloc = await Allocation.findById(id);
        if (!alloc) {
            res.status(404).json({ success: false, error: 'Not found' });
            return null;
        }
        const resrc = await Resource.findById(alloc.resourceId);
        if (!resrc || resrc.companyId.toString() !== payload.companyId) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return null;
        }
        return alloc;
    }

    switch (req.method) {
        case 'GET': {
            const alloc = await authorize();
            if (!alloc) return;
            return res.status(200).json(alloc);
        }
        case 'PUT': {
            const alloc = await authorize();
            if (!alloc) return;
            try {
                const updated = await Allocation.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
                return res.status(200).json(updated!);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error updating allocation";
                return res.status(400).json({ success: false, error: message });
            }
        }
        case 'DELETE': {
            const alloc = await authorize();
            if (!alloc) return;
            await Allocation.findByIdAndDelete(id);
            return res.status(204).end();
        }
        default:
            res.setHeader('Allow', ['GET','PUT','DELETE']);
            return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
}
