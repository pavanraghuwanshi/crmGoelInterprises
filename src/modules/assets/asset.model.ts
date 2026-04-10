import mongoose, { Schema, Document } from "mongoose";

export interface IAsset extends Document {
  name: string;
  type: string;
  serialNumber?: string;
  issuedBy: mongoose.Schema.Types.ObjectId;
  issuedTo: mongoose.Schema.Types.ObjectId;
  issuedDate: Date;
  status: string;
  returnedDate?: Date;
  maintenanceDueDate?: Date;
  extraNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    serialNumber: { type: String },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    issuedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    issuedDate: { type: Date },
    status: {
      type: String,
      default: "",
    },
    returnedDate: { type: Date },
    maintenanceDueDate: { type: Date },
    extraNote: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAsset>("Asset", AssetSchema);
