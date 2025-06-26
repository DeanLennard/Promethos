// models/Absence.ts
import { Schema, model, models, Types } from 'mongoose';

export type AbsenceType = 'holiday' | 'sick' | 'other';

export interface IAbsence {
    resourceId: Types.ObjectId;
    fromDate:   Date;
    toDate:     Date;
    type:       AbsenceType;
    note?:      string;
}

const AbsenceSchema = new Schema<IAbsence>(
    {
        resourceId: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
        fromDate:   { type: Date, required: true },
        toDate:     { type: Date, required: true },
        type:       { type: String, required: true, enum: ['holiday','sick','other'] },
        note:       { type: String, trim: true },
    },
    { timestamps: true }
);

export default models.Absence
|| model<IAbsence>('Absence', AbsenceSchema);
