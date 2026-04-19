import mongoose, { Schema, Document } from "mongoose";

export interface IReminder {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "once" | "custom";
  interval?: number;
  startDate: Date;
  time: string;
  nextOccurrence?: Date;
  recipientEmails: string[];
  subject?: string;
  message?: string;
}

export interface IDocCenter extends Document {
  title: string;
  documentType: "Bill" | "Personal" | "Picks" | "Documents" | "Other";
  files: string[];
  createdBy: mongoose.Schema.Types.ObjectId;
  metadata: Record<string, any>;
  reminder?: IReminder;
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
    reminder: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly", "once", "custom"],
      },
      interval: { type: Number },
      startDate: { type: Date },
      time: { type: String },
      nextOccurrence: { type: Date },
      recipientEmails: [{ type: String }],
      subject: { type: String },
      message: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDocCenter>("DocCenter", DocCenterSchema);
