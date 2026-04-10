// models/company.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICompany extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    gstNumber: String,
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", companySchema);