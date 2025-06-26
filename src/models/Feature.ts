// models/Feature.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export type FeatureStatus = 'backlog' | 'in-progress' | 'done' | 'cancelled';

export interface IFeature extends Document {
    projectId: Types.ObjectId;
    title: string;
    description?: string;
    storyPoints: number;
    completedPoints: number;
    sprintIds: Types.ObjectId[];
    status: FeatureStatus;
    createdAt: Date;
    updatedAt: Date;
}

const FeatureSchema = new Schema<IFeature>(
    {
        projectId:       { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        title:           { type: String, required: true, trim: true },
        description:     { type: String, default: '' },
        storyPoints:     { type: Number, required: true, min: 0 },
        completedPoints: { type: Number, required: true, min: 0, default: 0 },
        sprintIds:       [{ type: Schema.Types.ObjectId, ref: 'Sprint' }],
        status:          { type: String, required: true, enum: ['backlog','in-progress','done','cancelled'], default: 'backlog' },
    },
    { timestamps: true }
);

export default models.Feature || model<IFeature>('Feature', FeatureSchema);
