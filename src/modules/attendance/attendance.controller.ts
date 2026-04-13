import type { Context } from "hono";
import { AttendancePolicy } from "./attendancePolicy.model";
import { CalendarDay } from "./companyCalendar.model";
import { Attendance } from "./attendance.model";
import { User } from "../user/user.model";
import type { JwtPayload } from "../auth/auth.type";
import { Types } from "mongoose";



                             // --- Attendance Policy controllers Start ---


export const createAttendancePolicy = async (c: Context) => {
  try {
    const user = c.get("user") as JwtPayload;
    const body = await c.req.json();
    const policy = new AttendancePolicy({ ...body, createdBy: user.id });
    await policy.save();
    return c.json({ message: "Attendance policy created successfully", policy }, 201);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

export const getAttendancePolicies = async (c: Context) => {
  try {
    const policies = await AttendancePolicy.find().populate("createdBy", "name email");
    return c.json({ policies }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

export const updateAttendancePolicy = async (c: Context) => {
  try {
    const id = c.req.param("id"); // from route /:id
    const body = await c.req.json();

    const updatedPolicy = await AttendancePolicy.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    if (!updatedPolicy) {
      return c.json({ message: "Attendance policy not found" }, 404);
    }

    return c.json(
      { message: "Attendance policy updated successfully", policy: updatedPolicy },
      200
    );
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

export const deleteAttendancePolicy = async (c: Context) => {
  try {
    const id = c.req.param("id"); // from route /:id

    const deletedPolicy = await AttendancePolicy.findByIdAndDelete(id);

    if (!deletedPolicy) {
      return c.json({ message: "Attendance policy not found" }, 404);
    }

    return c.json(
      { message: "Attendance policy deleted successfully" },
      200
    );
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

                                   // --- Attendance Policy controllers end ---







// --- Attendance Biometric File Upload Processing ---

// ===== HELPER: Adjust to IST (UTC+5:30) =====
const adjustIST = (dt: Date | null) => {
  if (!dt) return null;
  const newDt = new Date(dt);
  newDt.setHours(newDt.getHours() + 5);
  newDt.setMinutes(newDt.getMinutes() + 30);
  return newDt;
};

export const uploadBiometricData = async (c: Context) => {
  try {
    const formData = await c.req.parseBody();
    const file = formData["file"];
    if (!file || typeof file === "string") {
      return c.json({ message: "No valid file uploaded" }, 400);
    }

    // ===== READ FILE =====
    const buffer = Buffer.from(await (file as any).arrayBuffer());
    let text = buffer.toString("utf16le");
    if (!text.includes("\n")) text = buffer.toString("utf8");
    if (!text.includes("\n")) text = new TextDecoder("utf-8").decode(buffer);

    const lines = text.split(/\r?\n/);

    // ===== GET POLICY =====
    const policyId = formData["policyId"];
    let activePolicy = policyId
      ? await AttendancePolicy.findById(policyId)
      : await AttendancePolicy.findOne().sort({ createdAt: -1 });

    if (!activePolicy) return c.json({ message: "No active attendance policy found" }, 400);

    // ===== GROUP DATA BY EN NO AND DATE =====
    const map = new Map<number, Map<string, Date[]>>();
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 10) continue;

      const enNoStr = parts[2]?.trim();
      const dateStr = parts[9]?.trim();
      if (!enNoStr || !dateStr) continue;

      const enNo = Number(enNoStr);
      if (isNaN(enNo)) continue;

      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) continue;

      const dateKey = dt.toISOString().slice(0, 10); // YYYY-MM-DD

      if (!map.has(enNo)) map.set(enNo, new Map());
      const userDates = map.get(enNo)!;
      if (!userDates.has(dateKey)) userDates.set(dateKey, []);
      userDates.get(dateKey)!.push(dt);
    }

    // ===== FETCH USERS =====
    const enNosInFile = Array.from(map.keys());
    const users = await User.find({ uniqueId: { $in: enNosInFile } }).populate("attendancePolicyId");

    const userMap = new Map<number, any>();
    const userPolicyMap = new Map<number, any>();
    users.forEach((u: any) => {
      userMap.set(u.uniqueId, u._id);
      if (u.attendancePolicyId) userPolicyMap.set(u.uniqueId, u.attendancePolicyId);
    });

    // ===== FETCH HOLIDAYS =====
    const allDates = Array.from(map.values()).flatMap(datesObj =>
      Array.from(datesObj.keys()).map(k => new Date(k))
    );
    const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const holidays = await CalendarDay.find({
      date: { $gte: startDate, $lte: endDate },
      dayType: "holiday",
    }).select("date");
    const holidaySet = new Set(holidays.map(h => h.date.toISOString().slice(0, 10)));

    // ===== PROCESS ATTENDANCE =====
    const ops: any[] = [];

    for (const [enNo, datesObj] of map.entries()) {
      const userId = userMap.get(enNo);
      if (!userId) continue;

      const policy: any = userPolicyMap.get(enNo) || activePolicy;
      const [shiftInHours, shiftInMinutes] = (policy.shiftInTime || "09:00").split(":").map(Number);
      const [shiftOutHours, shiftOutMinutes] = (policy.shiftOutTime || "18:00").split(":").map(Number);

      for (const [dateKey, punches] of datesObj.entries()) {
        punches.sort((a, b) => a.getTime() - b.getTime());

        const punchInRaw = punches[0];
        const punchOutRaw = punches.length > 1 ? punches[punches.length - 1] : null;

        const punchIn = adjustIST(punchInRaw ?? null);
        const punchOut = adjustIST(punchOutRaw ?? null);

        // ===== STATUS =====
        let status: "Present" | "Absent" | "Half-Day" = "Absent";
        if (punchIn && punchOut) status = "Present";
        else if (punchIn && !punchOut) status = "Half-Day";

        // ===== WORKED MINUTES & OVERTIME =====
        let totalWorkedMinutes = 0;
        let overtimeHours = 0;
        let overtimePay = 0;

        if (punchIn && punchOut) {
          totalWorkedMinutes = (punchOut.getTime() - punchIn.getTime()) / 60000;

          const shiftStart = new Date(punchIn);
          shiftStart.setHours(shiftInHours, shiftInMinutes, 0, 0);

          const shiftEnd = new Date(punchIn);
          shiftEnd.setHours(shiftOutHours, shiftOutMinutes, 0, 0);

          const isHoliday = holidaySet.has(dateKey);

          if (!isHoliday) {
            let extraMins = 0;

            const earlyMins = (shiftStart.getTime() - punchIn.getTime()) / 60000;
            if (earlyMins > 0 && earlyMins >= policy.overtimeThresholdMins) extraMins += earlyMins;

            const lateMins = (punchOut.getTime() - shiftEnd.getTime()) / 60000;
            if (lateMins > 0 && lateMins >= policy.overtimeThresholdMins) extraMins += lateMins;

            overtimeHours = Number((extraMins / 60).toFixed(2));
            overtimePay = overtimeHours * policy.overtimeHourlyRate;
          }
        }

        // ===== BULK OPS =====
        ops.push({
          updateOne: {
            filter: { userId, date: new Date(dateKey) },
            update: {
              $set: {
                uniqueId: enNo,
                punchIn,
                punchOut,
                status,
                totalWorkedMinutes,
                overtimeHours,
                overtimePay,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (ops.length > 0) await Attendance.bulkWrite(ops);

    return c.json({
      message: "Attendance processed successfully",
      recordsProcessed: ops.length,
    }, 200);
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};


// ===== GET ALL ATTENDANCES WITH FILTERS & PAGINATION =====

export const getAttendances = async (c: Context) => {
  try {
    const { page = "1", limit = "10", status, userId, search } = c.req.query();
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // ===== BUILD FILTER =====
    const filter: any = {};
    if (status) filter.status = status;
    if (userId) filter.userId = new Types.ObjectId(userId as string);
    if (search) {
      filter.$or = [
        { "userId.name": { $regex: search as string, $options: "i" } },
        { "userId.email": { $regex: search as string, $options: "i" } },
      ];
    }

    // ===== QUERY ATTENDANCE =====
    const data = await Attendance.find(filter)
      .populate("userId", "name email")
      .sort({ date: -1 }) // latest first
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Attendance.countDocuments(filter);

    return c.json({ data, total, page: pageNum, limit: limitNum }, 200);
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};


//  ====== Update Attendance Status Of User

export const updateAttendanceStatus = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { userId, date, status } = body;

    if (!userId || !date || !status) {
      return c.json({ message: "userId, date, status required" }, 400);
    }

    const attendance = await Attendance.findOne({
      userId,
      date: new Date(date),
    });

    if (!attendance) {
      return c.json({ message: "Attendance not found" }, 404);
    }

    // ✅ Only status update
    attendance.status = status;

    // ✅ optional logic
    if (status === "Absent") {
      attendance.punchIn = null;
      attendance.punchOut = null;
      attendance.totalWorkedMinutes = 0;
      attendance.overtimeHours = 0;
      attendance.overtimePay = 0;
    }

    if (status === "Half-Day") {
      attendance.totalWorkedMinutes = attendance.totalWorkedMinutes || 240; // example
    }

    await attendance.save();

    return c.json({
      success: true,
      message: "Status updated successfully",
      data: attendance,
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};



//    Get User List For mark Manual Attendance

export const getManualAttendancePendingUsers = async (c: Context) => {
  try {
    const {
      date,
      page = "1",
      limit = "10",
      search = "",
    } = c.req.query();

    if (!date) {
      return c.json({ message: "date query param required" }, 400);
    }

    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.max(parseInt(limit as string, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const selectedDate = new Date(date as string);

    // ===== USER FILTER =====
    const userFilter: any = {};

    if (search) {
      userFilter.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { email: { $regex: search as string, $options: "i" } },
        { employeeId: { $regex: search as string, $options: "i" } },
        { uniqueId: Number(search) || -1 }, // for numeric search
      ];
    }

    // ===== GET USERS =====
    const users = await User.find(userFilter)
      .select("name email employeeId uniqueId")
      .sort({ name: 1 });

    if (users.length === 0) {
      return c.json({
        success: true,
        date,
        total: 0,
        page: pageNum,
        limit: limitNum,
        data: [],
      });
    }

    // ===== GET ATTENDANCE =====
    const userIds = users.map((u: any) => u._id);

    const attendances = await Attendance.find({
      userId: { $in: userIds },
      date: selectedDate,
    });

    const attendanceMap = new Map();

    attendances.forEach((att: any) => {
      attendanceMap.set(String(att.userId), att);
    });

    // ===== BUILD RESULT =====
    const pendingUsers = users
      .map((user: any) => {
        const record = attendanceMap.get(String(user._id));

        // No attendance record
        if (!record) {
          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            employeeId: user.employeeId,
            uniqueId: user.uniqueId,
            issue: "No Punch In / No Punch Out",
            status: "Absent",
          };
        }

        let issue = "";

        if (!record.punchIn && !record.punchOut) {
          issue = "No Punch In / No Punch Out";
        } else if (!record.punchIn) {
          issue = "Missing Punch In";
        } else if (!record.punchOut) {
          issue = "Missing Punch Out";
        }

        if (issue) {
          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            employeeId: user.employeeId,
            uniqueId: user.uniqueId,
            issue,
            status: record.status,
          };
        }

        return null;
      })
      .filter(Boolean);

    // ===== PAGINATION =====
    const total = pendingUsers.length;
    const paginatedData = pendingUsers.slice(skip, skip + limitNum);

    return c.json({
      success: true,
      date,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: paginatedData,
    });

  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};



//    Mark Attendance For Any Date 

export const manualMarkAttendance = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { userId, date, status, punchIn, punchOut } = body;

    if (!userId || !date || !status) {
      return c.json(
        { message: "userId, date, status required" },
        400
      );
    }

    // ===== CHECK USER EXISTS =====
    const user = await User.findById(userId);

    if (!user) {
      return c.json(
        { message: "User not found" },
        404
      );
    }

    // ===== VALID STATUS =====
    const allowedStatuses = [
      "Present",
      "Absent",
      "Half-Day",
      "WeeklyOff",
      "Holiday"
    ];

    if (!allowedStatuses.includes(status)) {
      return c.json(
        { message: "Invalid status" },
        400
      );
    }

    let totalWorkedMinutes = 0;

    if (punchIn && punchOut) {
      totalWorkedMinutes =
        (new Date(punchOut).getTime() - new Date(punchIn).getTime()) / 60000;
    }

    // ===== FIND EXISTING =====
    const existingAttendance = await Attendance.findOne({
      userId,
      date: new Date(date),
    });

    let attendance;

    if (existingAttendance) {
      // UPDATE ONLY
      existingAttendance.status = status;
      existingAttendance.punchIn = punchIn ? new Date(punchIn) : null;
      existingAttendance.punchOut = punchOut ? new Date(punchOut) : null;
      existingAttendance.totalWorkedMinutes = totalWorkedMinutes;
      existingAttendance.overtimeHours = 0;
      existingAttendance.overtimePay = 0;
      existingAttendance.isManual = true;

      attendance = await existingAttendance.save();
    } else {
      // CREATE NEW
      attendance = await Attendance.create({
        userId,
        uniqueId: Number(user.uniqueId),
        date: new Date(date),
        status,
        punchIn: punchIn ? new Date(punchIn) : null,
        punchOut: punchOut ? new Date(punchOut) : null,
        totalWorkedMinutes,
        overtimeHours: 0,
        overtimePay: 0,
        isManual: true,
      });
    }

    return c.json({
      success: true,
      message: existingAttendance
        ? "Attendance updated successfully"
        : "Attendance created successfully",
      data: attendance,
    });

  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};

















// ===== GET PARTICULAR USER MONTH-WISE ATTENDANCE =====
export const getUserMonthlyAttendance = async (c: Context) => {
  try {
    const { userId, month, year } = c.req.query();

    if (!userId || !month || !year) {
      return c.json({ message: "userId, month and year are required" }, 400);
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const data = await Attendance.find({
      userId: new Types.ObjectId(userId as string),
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name email")
      .sort({ date: 1 }); // sort by date ascending

    return c.json({ data, month, year }, 200);
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};