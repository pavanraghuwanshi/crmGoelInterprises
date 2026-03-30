import mongoose, { Schema, Document } from "mongoose";

export interface ICompanyCalendar extends Document {
  date: Date; // e.g., 2025-01-26
  isHoliday: boolean;
  description?: string;
}

const companyCalendarSchema = new Schema<ICompanyCalendar>({
  date: { type: Date, required: true, unique: true },
  isHoliday: { type: Boolean, default: false },
  description: { type: String }
}, { timestamps: true });

export const CompanyCalendar = mongoose.model<ICompanyCalendar>("CompanyCalendar", companyCalendarSchema);
