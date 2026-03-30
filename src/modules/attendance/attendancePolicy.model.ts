import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttendancePolicy extends Document {
  name: string;
  shiftInTime: string; // e.g., "09:00"
  shiftOutTime: string; // e.g., "18:00"
  overtimeThresholdMins: number; // e.g., 30
  overtimeHourlyRate: number; // e.g., 100
  createdBy: Types.ObjectId;
}

const attendancePolicySchema = new Schema<IAttendancePolicy>({
  name: { type: String, required: true },
  shiftInTime: { type: String, required: true },
  shiftOutTime: { type: String, required: true },
  overtimeThresholdMins: { type: Number, default: 30 },
  overtimeHourlyRate: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export const AttendancePolicy = mongoose.model<IAttendancePolicy>("AttendancePolicy", attendancePolicySchema);
