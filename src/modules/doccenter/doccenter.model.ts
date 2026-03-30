import mongoose, { Schema, Document } from "mongoose";

export interface IDocCenter extends Document {
  title: string;
  documentType: "Bill" | "Personal" | "Picks" | "Documents" | "Other";
  files: string[];
  createdBy: mongoose.Schema.Types.ObjectId;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DocCenterSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    documentType: {
      type: String,
      enum: ["Bill", "Personal", "Picks", "Documents", "Other"],
      default: "Other",
    },
    files: [{ type: String }], // multiple file URLs
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // dynamic JSON data from request body
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDocCenter>("DocCenter", DocCenterSchema);
