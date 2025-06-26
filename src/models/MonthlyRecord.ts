// models/MonthlyRecord.ts
import { Schema, model, models, Types } from 'mongoose';

export interface IMonthlyRecord {
    projectId:    Types.ObjectId;
    resourceId:   Types.ObjectId;
    period:       string;    // e.g. "2025-07"
    forecastDays: number;    // planned working days
    actualCost:   number;    // £ charged in that period
}

const MonthlyRecordSchema = new Schema<IMonthlyRecord>(
    {
        projectId:    { type: Schema.Types.ObjectId, ref: 'Project',  required: true },
        resourceId:   { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
        period:       { type: String, required: true, match: /^\d{4}-\d{2}$/ },
        forecastDays: { type: Number, required: true, min: 0 },
        actualCost:   { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

export default models.MonthlyRecord
|| model<IMonthlyRecord>('MonthlyRecord', MonthlyRecordSchema);
