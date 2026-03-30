import type { Context } from "hono";
import { AttendancePolicy } from "./attendancePolicy.model";
import { CalendarDay } from "./companyCalendar.model";
import { Attendance } from "./attendance.model";
import { User } from "../user/user.model";
import type { JwtPayload } from "../auth/auth.type";
import mongoose from "mongoose";

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

export const createCompanyCalendarBatch = async (c: Context) => {
  try {
    const body = await c.req.json();
    // Expect body.dates = [{date, isHoliday, description}]
    const inserted = await CalendarDay.insertMany(body.dates);
    return c.json({ message: "Calendar updated", inserted }, 201);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

export const getCompanyCalendar = async (c: Context) => {
  try {
    const calendar = await CalendarDay.find().sort({ date: 1 });
    return c.json({ calendar }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};

// --- Attendance Biometric File Upload Processing ---

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

      // fallback
      if (!text.includes("\n")) {
        text = buffer.toString("utf8");
      }

    // FIXED fallback condition ❗
    if (!text.includes("\n")) {
      text = new TextDecoder("utf-8").decode(buffer);
    }

    const lines = text.split(/\r?\n/);

    // ===== GET POLICY =====
    const policyId = formData["policyId"];
    let activePolicy;

    if (policyId && typeof policyId === "string") {
      activePolicy = await AttendancePolicy.findById(policyId);
    } else {
      activePolicy = await AttendancePolicy.findOne().sort({ createdAt: -1 });
    }

    if (!activePolicy) {
      return c.json({ message: "No active attendance policy found" }, 400);
    }

    // ===== HELPER: PARSE "HH:mm" =====
    const parseTime = (time: string) => {
      const [h, m] = time.split(":");

      if (!h || !m) throw new Error("Invalid time format");

      return {
        hours: Number(h),
        minutes: Number(m),
      };
    };

    // ===== GROUP DATA =====
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

      // ✅ LOCAL DATE (FIXED timezone issue)
      const dateKey =
        dt.getFullYear() +
        "-" +
        String(dt.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dt.getDate()).padStart(2, "0");

      if (!map.has(enNo)) map.set(enNo, new Map());

      const userDates = map.get(enNo)!;

      if (!userDates.has(dateKey)) userDates.set(dateKey, []);

      userDates.get(dateKey)!.push(dt);
    }

    // ===== FETCH USERS =====
    const enNosInFile = Array.from(map.keys());

    const users = await User.find({
      uniqueId: { $in: enNosInFile },
    }).populate("attendancePolicyId");

    const userMap = new Map<number, any>();
    const userPolicyMap = new Map<number, any>();

    users.forEach((u: any) => {
      userMap.set(u.uniqueId, u._id);
      if (u.attendancePolicyId) {
        userPolicyMap.set(u.uniqueId, u.attendancePolicyId);
      }
    });

    // ===== PROCESS =====
    const ops: any[] = [];

    for (const [enNo, datesObj] of map.entries()) {
      const userId = userMap.get(enNo);
      if (!userId) continue;

      const policy: any =
        userPolicyMap.get(enNo) || activePolicy;

      const shiftIn = parseTime(policy.shiftInTime);
      const shiftOut = parseTime(policy.shiftOutTime);

      for (const [dateKey, punches] of datesObj.entries()) {
        punches.sort((a, b) => a.getTime() - b.getTime());

        const punchIn = punches[0];
        const punchOut =
          punches.length > 1 ? punches[punches.length - 1] : null;

        // ===== STATUS =====
        let status: "Present" | "Absent" | "Half-Day" = "Absent";

        if (punchIn && punchOut) status = "Present";
        else if (punchIn && !punchOut) status = "Half-Day";

        let totalWorkedMinutes = 0;
        let overtimeHours = 0;
        let overtimePay = 0;

        if (punchIn && punchOut) {
          totalWorkedMinutes =
            (punchOut.getTime() - punchIn.getTime()) / 60000;
            

          // ===== SHIFT TIMES =====
          const scheduledIn = new Date(punchIn);
          scheduledIn.setHours(shiftIn.hours, shiftIn.minutes, 0, 0);

          const scheduledOut = new Date(punchIn);
          scheduledOut.setHours(shiftOut.hours, shiftOut.minutes, 0, 0);

          let extraMins = 0;

          // EARLY IN
          const earlyMins =
            (scheduledIn.getTime() - punchIn.getTime()) / 60000;

          if (earlyMins >= policy.overtimeThresholdMins) {
            extraMins += earlyMins;
          }

          // LATE OUT
          const lateMins =
            (punchOut.getTime() - scheduledOut.getTime()) / 60000;

          if (lateMins >= policy.overtimeThresholdMins) {
            extraMins += lateMins;
          }

          overtimeHours = Number((extraMins / 60).toFixed(2));
          overtimePay =
            overtimeHours * policy.overtimeHourlyRate;
        }

        // ===== BULK OP =====
        ops.push({
          updateOne: {
            filter: {
              userId,
              date: new Date(dateKey),
            },
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

    // ===== SAVE =====
    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    return c.json(
      {
        message: "Attendance processed successfully",
        recordsProcessed: ops.length,
      },
      200
    );
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};

// API to list attendance with employee info
export const getAttendances = async (c: Context) => {
  try {
    const data = await Attendance.find().populate("userId", "name email");
    return c.json({ data }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};
