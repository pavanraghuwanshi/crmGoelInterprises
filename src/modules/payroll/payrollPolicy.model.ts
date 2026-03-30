import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPayrollPolicy extends Document {
  name: string;
  heads: {
    basic: number;
    esiEmployee: number;
    pfEmployee: number;
    esiEmployer: number;
    pfEmployer: number;
    hra: number;
    conveyance: number;
    lwfEmployee: number;
    lwfEmployer: number;
  };
  sundayPolicyActive: boolean; // Alternating 5-6 day week rule
  createdBy: Types.ObjectId;
}

const payrollPolicySchema = new Schema<IPayrollPolicy>({
  name: { type: String, required: true },
  heads: {
    basic: { type: Number, default: 0 },
    esiEmployee: { type: Number, default: 0 },
    pfEmployee: { type: Number, default: 0 },
    esiEmployer: { type: Number, default: 0 },
    pfEmployer: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    lwfEmployee: { type: Number, default: 0 },
    lwfEmployer: { type: Number, default: 0 }
  },
  sundayPolicyActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export const PayrollPolicy = mongoose.model<IPayrollPolicy>("PayrollPolicy", payrollPolicySchema);
