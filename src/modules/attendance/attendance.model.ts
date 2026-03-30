import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  uniqueId: number; // Employee EnNo
  date: Date;
  punchIn: Date | null;
  punchOut: Date | null;
  status: "Present" | "Absent" | "Half-Day" | "WeeklyOff" | "Holiday";
  overtimeHours: number; // calculated over time
  overtimePay: number; // calculated overtime pay
  totalWorkedMinutes: number;
}

const attendanceSchema = new Schema<IAttendance>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uniqueId: { type: Number, required: true },
  date: { type: Date, required: true },
  punchIn: { type: Date, default: null },
  punchOut: { type: Date, default: null },
  status: { type: String, enum: ["Present", "Absent", "Half-Day", "WeeklyOff", "Holiday"], default: "Absent" },
  overtimeHours: { type: Number, default: 0 },
  overtimePay: { type: Number, default: 0 },
  totalWorkedMinutes: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure unique attendance entry per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema);
