// models/Project.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export interface IProject extends Document {
    name: string;
    code: string;
    startDate: Date;
    endDate: Date;
    currency: string;
    sprintLengthDays: number;
    backlog: Types.ObjectId[];
    budget: number;
    createdAt: Date;
    updatedAt: Date;
    companyId: Types.ObjectId;
    private:   boolean;
    ownerId:   Types.ObjectId;
}

const ProjectSchema = new Schema<IProject>(
    {
        name:             { type: String, required: true, trim: true },
        code:             { type: String, required: true, unique: true, uppercase: true, trim: true },
        startDate:        { type: Date,   required: true },
        endDate:          { type: Date,   required: true },
        currency:         { type: String, required: true, length: 3, uppercase: true },
        sprintLengthDays: { type: Number, required: true, min: 1 },
        backlog:          [{ type: Schema.Types.ObjectId, ref: 'Feature' }],
        budget:           { type: Number, required: true, min: 0 },
        companyId:        { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        private:          { type: Boolean, default: false },
        ownerId:          { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export default models.Project || model<IProject>('Project', ProjectSchema);
