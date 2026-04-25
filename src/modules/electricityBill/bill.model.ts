import mongoose, { Schema, Document } from "mongoose";

export interface IElectricityBill extends Document {
  title: string;
  files: string[];
  createdBy: mongoose.Schema.Types.ObjectId;
  referenceId: mongoose.Schema.Types.ObjectId;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ElectricityBillSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    files: [{ type: String }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ElectricityMeter",
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const ElectricityBill = mongoose.model<IElectricityBill>(
  "ElectricityBill",
  ElectricityBillSchema
);
