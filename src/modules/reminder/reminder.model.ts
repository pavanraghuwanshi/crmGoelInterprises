import mongoose, { Schema, Document } from "mongoose";

export interface IReminder extends Document {
  title: string;
  description?: string;
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "once" | "custom";
  interval?: number;
  startDate: Date;
  time: string;
  nextOccurrence?: Date;
  lastEmailSentDate?: Date;
  recipientEmails: string[];
  subject?: string;
  message?: string;
  createdBy: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "once", "custom"],
      required: true,
    },
    interval: { type: Number },
    startDate: { type: Date, required: true },
    time: { type: String, required: true },
    nextOccurrence: { type: Date },
    lastEmailSentDate: { type: Date },
    recipientEmails: [{ type: String, required: true }],
    subject: { type: String },
    message: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IReminder>("Reminder", ReminderSchema);
