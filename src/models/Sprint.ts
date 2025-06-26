// models/Sprint.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export interface ISprint extends Document {
    projectId: Types.ObjectId;
    name: string;         // e.g. “Sprint 12”
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        name:      { type: String, required: true, trim: true },
        startDate: { type: Date, required: true },
        endDate:   { type: Date, required: true },
    },
    { timestamps: true }
);

export default models.Sprint || model<ISprint>('Sprint', SprintSchema);
