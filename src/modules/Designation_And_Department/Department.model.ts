import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  companyId?: string;
  isActive: boolean;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    companyId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Department = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema
);