// models/Allocation.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export interface IAllocation extends Document {
    projectId: Types.ObjectId;
    resourceId: Types.ObjectId;
    fromDate: Date;
    toDate: Date;
    allocationPct: number; // 0–100
    plannedDays: number;
    actualDays: number;
    createdAt: Date;
    updatedAt: Date;
}

const AllocationSchema = new Schema<IAllocation>(
    {
        projectId:     { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        resourceId:    { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
        fromDate:      { type: Date, required: true },
        toDate:        { type: Date, required: true },
        allocationPct: { type: Number, required: true, min: 0, max: 100 },
        plannedDays:   { type: Number, required: true, min: 0 },
        actualDays:    { type: Number, required: true, min: 0, default: 0 },
    },
    { timestamps: true }
);

export default models.Allocation || model<IAllocation>('Allocation', AllocationSchema);
