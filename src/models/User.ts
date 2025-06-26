// models/User.ts
import {Schema, model, models, Document, Types} from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'pm' | 'user';
    companyId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'pm', 'user'],
            default: 'user',
        },
        companyId:    { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    { timestamps: true }
);

export default models.User || model<IUser>('User', UserSchema);
