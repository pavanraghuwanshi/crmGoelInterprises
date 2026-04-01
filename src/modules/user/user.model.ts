import mongoose, { Schema, Document, type ObjectId, Types } from "mongoose";

// 🔐 Type
export interface EncryptedData {
  iv: string;
  content: string;
}

// 👤 User Interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: EncryptedData; // ✅ object type
  role: "admin" | "hr" | "user";
  createdBy:Types.ObjectId,
  employeeObjId:Types.ObjectId,
  uniqueId:Number,
  attendancePolicyId?: Types.ObjectId;
  payrollPolicyId?: Types.ObjectId;

}

// 📦 Schema
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    iv: { type: String, required: true },
    content: { type: String, required: true },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "hr", "user"],
    default: "user",
  },
   employeeObjId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee", // ✅ LINK
  },
  uniqueId: {
    type: Number,
    required: true,
    unique: true,
  },
  attendancePolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AttendancePolicy",
  },
  payrollPolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PayrollPolicy",
  }
}, { timestamps: true
});

export const User = mongoose.model<IUser>("User", userSchema);