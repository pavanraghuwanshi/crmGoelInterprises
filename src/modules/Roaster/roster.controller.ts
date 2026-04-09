import type { Context } from "hono";
import { Types } from "mongoose";
import { User } from "../user/user.model";

export const assignAttendancePolicyBulk = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { userIds, attendancePolicyId } = body;

    // ✅ validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ message: "userIds array is required" }, 400);
    }

    if (!attendancePolicyId) {
      return c.json({ message: "attendancePolicyId is required" }, 400);
    }

    // ✅ logged in user
    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // ✅ optional: only admin/hr allowed
    if (!["admin", "hr"].includes(loggedInUser.role)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    // ✅ convert to ObjectIds (safe)
    const objectIds = userIds.map((id: string) => new Types.ObjectId(id));

    // ✅ bulk update
    const result = await User.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          attendancePolicyId
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