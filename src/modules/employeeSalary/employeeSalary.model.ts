import mongoose, { Schema, model } from "mongoose";

interface IEmployeeSalary {
  userId: mongoose.Schema.Types.ObjectId | { _id: string; name: string; email: string };
  hourly: boolean;
  monthly: boolean;
  daily: boolean;
  hourlyRate?: number;
  monthlySalary?: number;
  dailyRate?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const employeeSalarySchema = new Schema<IEmployeeSalary>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    hourly: { type: Boolean, default: false },
    monthly: { type: Boolean, default: false },
    daily: { type: Boolean, default: false },
    hourlyRate: { type: Number },
    monthlySalary: { type: Number },
    dailyRate: { type: Number },
  },
  { timestamps: true }
);

export const EmployeeSalary = model<IEmployeeSalary>("EmployeeSalary", employeeSalarySchema);