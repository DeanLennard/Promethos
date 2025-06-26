// models/CostItem.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export type CostType = 'license' | 'equipment' | 'contractor' | 'other';

export interface ICostItem extends Document {
    projectId: Types.ObjectId;
    type: CostType;
    description: string;
    amount: number;
    dateIncurred: Date;
    vendor?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CostItemSchema = new Schema<ICostItem>(
    {
        projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        type:        { type: String, required: true, enum: ['license','equipment','contractor','other'] },
        description: { type: String, required: true },
        amount:      { type: Number, required: true, min: 0 },
        dateIncurred:{ type: Date,   required: true },
        vendor:      { type: String, trim: true },
    },
    { timestamps: true }
);

export default models.CostItem || model<ICostItem>('CostItem', CostItemSchema);
