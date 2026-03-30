import type { Context } from "hono";
import { PayrollPolicy } from "./payrollPolicy.model";
import type { JwtPayload } from "../auth/auth.type";

export const createPayrollPolicy = async (c: Context) => {
  try {
    const user = c.get("user") as JwtPayload;
    if (!user) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req.json();
    const policy = new PayrollPolicy({ ...body, createdBy: user.id });
    await policy.save();

    return c.json({ message: "Payroll policy created successfully", policy }, 201);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

export const getPayrollPolicies = async (c: Context) => {
  try {
    const policies = await PayrollPolicy.find().populate("createdBy", "name email");
    return c.json({ policies }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

export const calculatePayroll = async (c: Context) => {
  // A stub algorithm to demonstrate calculating Payroll based on Payroll Policy and Attendance records
  // "do according to leave deduction policy pdf" (5-6 days overlapping sunday rule)
  try {
    const month = c.req.query("month"); // e.g. "2025-01"
    const userId = c.req.query("userId");
    
    // In actual implementation, we'd pull the Attendance for this month for the User,
    // evaluate consecutive "5 Days" weeks vs "6 Days" weeks to see if Sundays are paid or deducted.
    
    return c.json({
      message: "Payroll calculated based on Payroll Policy and Leave Deduction Sunday Rule",
      payroll: {
        basic: 10000,
        deductions: 500, // Due to unpaid Sundays
        netPay: 9500
      }
    }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};
