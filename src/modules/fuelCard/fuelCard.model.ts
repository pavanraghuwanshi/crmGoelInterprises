import mongoose, { Schema, Document } from "mongoose";

export interface IFuelCard extends Document {
  amount: number;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FuelCardSchema: Schema = new Schema(
  {
    amount: { 
      type: Number, 
      required: true,
      default: 0
    },
    note: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IFuelCard>("FuelCard", FuelCardSchema);
