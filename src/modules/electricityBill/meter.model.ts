import mongoose, { Schema, Document } from "mongoose";

export interface IElectricityMeter extends Document {
  meterNumber: string;
  meterName: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ElectricityMeterSchema: Schema = new Schema(
  {
    meterNumber: { type: String, required: true, unique: true },
    meterName: { type: String, required: true },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true, collection: "meter" }
);

export const ElectricityMeter = mongoose.model<IElectricityMeter>(
  "ElectricityMeter",
  ElectricityMeterSchema
);
