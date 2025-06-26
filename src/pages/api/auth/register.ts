// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { name, email, password, companyName } = req.body as {
        name?: string;
        email?: string;
        password?: string;
        companyName: string;
    };

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }

    await dbConnect();

    const company = await Company.create({ name: companyName });

    const existing = await User.findOne({ email });
    if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ name, email, passwordHash, companyId: company._id, });
    await user.save();

    // return user data sans password
    const token = jwt.sign(
        { userId: user._id.toString(), companyId: company._id.toString() },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );
    return res.status(201).json({ token });
}
