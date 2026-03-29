import mongoose, { Schema, Document } from "mongoose";

export interface IEmployeeId extends Document {
  employeeId: string;
  remark?: string;
}

const employeeIdSchema = new Schema<IEmployeeId>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export const EmployeeId = mongoose.model<IEmployeeId>(
  "EmployeeId",
  employeeIdSchema
);

