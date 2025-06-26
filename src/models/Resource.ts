// models/Resource.ts
import {Schema, model, models, Document, Types} from 'mongoose';

export interface IResource extends Document {
    name: string;
    role: string;
    dayRate: number;
    skillTags: string[];
    contact: string;
    companyId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
    {
        name:       { type: String, required: true, trim: true },
        role:       { type: String, required: true },
        dayRate:    { type: Number, required: true, min: 0 },
        skillTags:  { type: [String], default: [] },
        contact:    { type: String, required: true },
        companyId:    { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    {
        timestamps: true, // adds createdAt & updatedAt
    }
);

// Prevent model overwrite upon repeated imports
export default models.Resource || model<IResource>('Resource', ResourceSchema);
