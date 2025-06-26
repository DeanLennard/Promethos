// lib/auth.ts
import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Please define JWT_SECRET in your env");

// pull out the token string from the “Authorization: Bearer …” header
export function getTokenFromHeader(req: NextApiRequest): string | null {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice('Bearer '.length);
}

export interface JWTPayload {
    userId:    string;
    companyId: string;
    iat:       number;
    exp:       number;
}

// verify & decode, throws if invalid/expired
export function verifyJwt(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
