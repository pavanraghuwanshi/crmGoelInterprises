import type { Context } from "hono";
import { Types } from "mongoose";
import { User } from "../user/user.model";


// post roster
export const assignAttendancePolicyBulk = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { userIds, attendancePolicyId, startDate, endDate } = body;

    // ✅ validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ message: "userIds array is required" }, 400);
    }

    // ✅ logged in user
    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // ✅ only admin/hr allowed
    if (!["admin", "hr"].includes(loggedInUser.role)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    // ✅ convert to ObjectIds
    const objectIds = userIds.map((id: string) => new Types.ObjectId(id));

    // ✅ bulk update
    const result = await User.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          attendancePolicyId: attendancePolicyId ,
          attendancePolicyStartDate: startDate ? new Date(startDate) : null,
          attendancePolicyEndDate: endDate ? new Date(endDate) : null,
          updatedAt: new Date(),
        }
      }
    );

    return c.json(
      {
        message: "Attendance policy assigned successfully",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      },
      200
    );
  } catch (error) {
    console.error("Bulk Attendance Update Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};



//  get roster
export const getRosterUsers = async (c: Context) => {
  try {
    const query = c.req.query();

    // ✅ query params
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const search = query.search || "";
    const attendancePolicyId = query.attendancePolicyId;

    const skip = (page - 1) * limit;

    // ✅ logged in user
    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // ✅ base filter
    let filter: any = {
      attendancePolicyId: { $exists: true, $ne: null },
      attendancePolicyStartDate: { $type: "date" },
      attendancePolicyEndDate: { $type: "date" }
    };
    // 🔍 search (name, email, mobile)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } }
      ];
    }

    // 🎯 filter by attendancePolicyId
    if (attendancePolicyId) {
      filter.attendancePolicyId = attendancePolicyId;
    }

    // ✅ fetch users
    const users = await User.find(filter)
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .populate("employeeObjId", "employeeId")
      .populate("attendancePolicyId", "name")
      .populate("payrollPolicyId", "name")
      .populate("companyId", "name ")
      .select("-password") // hide password
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    // ✅ total count
    const total = await User.countDocuments(filter);

    return c.json(
      {
        data: users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      },
      200
    );
  } catch (error) {
    console.error("Get Roster Users Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};


//  24 hour sift create

export const update24HourShiftBulk = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { userIds, is24HourShift } = body;

    // ✅ validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ message: "userIds array is required" }, 400);
    }

    // ✅ logged in user
    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // ✅ only admin/hr allowed
    if (!["admin", "hr"].includes(loggedInUser.role)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    // ✅ convert to ObjectIds
    const objectIds = userIds.map(
      (id: string) => new Types.ObjectId(id)
    );

    // ✅ bulk update
    const result = await User.updateMany(
      {
        _id: { $in: objectIds },
      },
      {
        $set: {
          is24HourShift: is24HourShift === true,
          updatedAt: new Date(),
        },
      }
    );

    return c.json(
      {
        message: "24 hour shift updated successfully",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      200
    );
  } catch (error) {
    console.error("24 Hour Shift Update Error:", error);

    return c.json(
      {
        message: "Internal Server Error",
      },
      500
    );
  }
};