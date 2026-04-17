import type { Context } from "hono";
import Leave from "./leave.model";
import { EmployeeId } from "../user/employeeId.model";
import { User } from "../user/user.model";




// POST /leave/apply
export const applyLeave = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { employeeId, fromDate, toDate, leaveType, reason } = body;

    // ✅ validation
    if (!employeeId || !fromDate || !toDate || !leaveType) {
      return c.json({ message: "userId, fromDate, toDate, leaveType required" }, 400);
    }

     // ✅ STEP 1: Find Employee
    const employee = await EmployeeId.findOne({ employeeId }).lean();

    if (!employee) {
      return c.json({ message: "Employee not found" }, 404);
    }

    // ✅ STEP 2: Find User using employeeId._id
    const user = await User.findOne({
      employeeObjId: employee._id
    }).lean();
    
    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // ✅ date handling
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return c.json({ message: "fromDate cannot be greater than toDate" }, 400);
    }

    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // ✅ create leave
    const leave = await Leave.create({
      userId: user._id,
      companyId: user.companyId, // 🔥 fetched from user
      fromDate: start,
      toDate: end,
      totalDays,
      leaveType,
      reason,
    });

    return c.json(
      {
        success: true,
        message: "Leave applied successfully",
        data: leave,
      },
      201
    );
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};



// GET /leave
export const getLeaves = async (c: Context) => {
  try {
    const status = c.req.query("status");
    const user = c.get("user");

    const filter: any = {
      companyId: user.companyId,
    };

    if (status) {
      filter.status = status;
    }

    const leaves = await Leave.find(filter)
      .populate("userId", "name email uniqueId")
      .sort({ createdAt: -1 })
      .lean();

    return c.json({ success: true, data: leaves }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

//  Get /leave by usetr Id

// GET /leave/user?userId=xxx&year=2026&month=4
export const getLeavesByUserId = async (c: Context) => {
  try {
    const userId = c.req.query("userId");
    const year = parseInt(c.req.query("year") || "");
    const month = parseInt(c.req.query("month") || "");

    // ✅ validation
    if (!userId) {
      return c.json({ message: "userId is required" }, 400);
    }

    if (!year || !month) {
      return c.json({ message: "year and month are required" }, 400);
    }

    if (month < 1 || month > 12) {
      return c.json({ message: "month must be between 1 to 12" }, 400);
    }

    // ✅ month range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // ✅ find leaves overlapping this month
    const leaves = await Leave.find({
      userId,
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate }
    })
      .sort({ fromDate: 1 })
      .lean();

    return c.json(
      {
        success: true,
        data: leaves
      },
      200
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || "Failed to fetch leaves"
      },
      500
    );
  }
};


// PUT /leave/update-status/:id
export const updateLeaveStatus = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const { status, isPaid, rejectionReason } = body;

    const user = c.get("user");

    if (!["Approved", "Rejected"].includes(status)) {
      return c.json({ message: "Invalid status" }, 400);
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return c.json({ message: "Leave not found" }, 404);
    }

    leave.status = status;
    leave.isPaid = isPaid ?? false;
    leave.approvedBy = user._id;
    leave.approvedAt = new Date();

    if (status === "Rejected") {
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();

    return c.json({
      success: true,
      message: `Leave ${status}`,
      data: leave,
    });
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};