// models/Company.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export interface ICompany extends Document {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
    { name: { type: String, required: true, trim: true } },
    { timestamps: true }
);

export default models.Company || model<ICompany>('Company', CompanySchema);
