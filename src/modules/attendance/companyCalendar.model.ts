import mongoose, { Schema, model, Document } from "mongoose";

export interface ICalendarDay extends Document {
  date: Date;
  dayType: "working" | "holiday";
  isNationalHoliday: boolean;
  isCompanyHoliday: boolean;
  description?: string;
}

const CalendarDaySchema = new Schema<ICalendarDay>({
  date: { type: Date, required: true, unique: true },
  dayType: { type: String, enum: ["working", "holiday"], default: "working" },
  isNationalHoliday: { type: Boolean, default: false },
  isCompanyHoliday: { type: Boolean, default: false },
  description: { type: String },
});

export const CalendarDay = model<ICalendarDay>("CalendarDay", CalendarDaySchema);