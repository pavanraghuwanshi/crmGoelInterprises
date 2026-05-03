import mongoose, { Schema, Document } from "mongoose";

export interface IDesignation extends Document {
  name: string;
  departmentId: mongoose.Types.ObjectId;
  isActive: boolean;
}

const DesignationSchema = new Schema<IDesignation>(
  {
    name: { type: String, required: true, trim: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Designation = mongoose.model<IDesignation>(
  "Designation",
  DesignationSchema
);