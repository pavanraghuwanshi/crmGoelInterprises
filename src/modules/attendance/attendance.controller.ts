import type { Context } from "hono";
import { AttendancePolicy } from "./attendancePolicy.model";
import { CalendarDay } from "./companyCalendar.model";
import { Attendance } from "./attendance.model";
import { User } from "../user/user.model";
import type { JwtPayload } from "../auth/auth.type";
import { Types } from "mongoose";



// --- Attendance Policy ---


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





// --- Attendance Biometric File Upload Processing ---

// export const uploadBiometricData = async (c: Context) => {
//   try {
//     const formData = await c.req.parseBody();
//     const file = formData["file"];

//     if (!file || typeof file === "string") {
//       return c.json({ message: "No valid file uploaded" }, 400);
//     }

//     // ===== READ FILE =====
//       const buffer = Buffer.from(await (file as any).arrayBuffer());
//       let text = buffer.toString("utf16le");

//       // fallback
//       if (!text.includes("\n")) {
//         text = buffer.toString("utf8");
//       }

//     // FIXED fallback condition ❗
//     if (!text.includes("\n")) {
//       text = new TextDecoder("utf-8").decode(buffer);
//     }

//     const lines = text.split(/\r?\n/);

//     // ===== GET POLICY =====
//     const policyId = formData["policyId"];
//     let activePolicy;

//     if (policyId && typeof policyId === "string") {
//       activePolicy = await AttendancePolicy.findById(policyId);
//     } else {
//       activePolicy = await AttendancePolicy.findOne().sort({ createdAt: -1 });
//     }

//     if (!activePolicy) {
//       return c.json({ message: "No active attendance policy found" }, 400);
//     }

//     // ===== HELPER: PARSE "HH:mm" =====
//     const parseTime = (time: string) => {
//       const [h, m] = time.split(":");

//       if (!h || !m) throw new Error("Invalid time format");

//       return {
//         hours: Number(h),
//         minutes: Number(m),
//       };
//     };

//     // ===== GROUP DATA =====
//     const map = new Map<number, Map<string, Date[]>>();

//     for (const line of lines) {
//       const parts = line.split("\t");
//       if (parts.length < 10) continue;

//       const enNoStr = parts[2]?.trim();
//       const dateStr = parts[9]?.trim();

//       if (!enNoStr || !dateStr) continue;

//       const enNo = Number(enNoStr);
//       if (isNaN(enNo)) continue;

//       const dt = new Date(dateStr);
//       if (isNaN(dt.getTime())) continue;

//       // ✅ LOCAL DATE (FIXED timezone issue)
//       const dateKey =
//         dt.getFullYear() +
//         "-" +
//         String(dt.getMonth() + 1).padStart(2, "0") +
//         "-" +
//         String(dt.getDate()).padStart(2, "0");

//       if (!map.has(enNo)) map.set(enNo, new Map());

//       const userDates = map.get(enNo)!;

//       if (!userDates.has(dateKey)) userDates.set(dateKey, []);

//       userDates.get(dateKey)!.push(dt);
//     }

//     // ===== FETCH USERS =====
//     const enNosInFile = Array.from(map.keys());

//     const users = await User.find({
//       uniqueId: { $in: enNosInFile },
//     }).populate("attendancePolicyId");

//     const userMap = new Map<number, any>();
//     const userPolicyMap = new Map<number, any>();

//     users.forEach((u: any) => {
//       userMap.set(u.uniqueId, u._id);
//       if (u.attendancePolicyId) {
//         userPolicyMap.set(u.uniqueId, u.attendancePolicyId);
//       }
//     });

//     // ===== PROCESS =====
//     const ops: any[] = [];

//     for (const [enNo, datesObj] of map.entries()) {
//       const userId = userMap.get(enNo);
//       if (!userId) continue;

//       const policy: any =
//         userPolicyMap.get(enNo) || activePolicy;

//       const shiftIn = parseTime(policy.shiftInTime);
//       const shiftOut = parseTime(policy.shiftOutTime);

//       for (const [dateKey, punches] of datesObj.entries()) {
//         punches.sort((a, b) => a.getTime() - b.getTime());

//         const punchIn = punches[0];
//         const punchOut =
//           punches.length > 1 ? punches[punches.length - 1] : null;

//         // ===== STATUS =====
//         let status: "Present" | "Absent" | "Half-Day" = "Absent";

//         if (punchIn && punchOut) status = "Present";
//         else if (punchIn && !punchOut) status = "Half-Day";

//         let totalWorkedMinutes = 0;
//         let overtimeHours = 0;
//         let overtimePay = 0;

//         if (punchIn && punchOut) {
//           totalWorkedMinutes =
//             (punchOut.getTime() - punchIn.getTime()) / 60000;
            

//           // ===== SHIFT TIMES =====
//           const scheduledIn = new Date(punchIn);
//           scheduledIn.setHours(shiftIn.hours, shiftIn.minutes, 0, 0);

//           const scheduledOut = new Date(punchIn);
//           scheduledOut.setHours(shiftOut.hours, shiftOut.minutes, 0, 0);

//           let extraMins = 0;

//           // EARLY IN
//           const earlyMins =
//             (scheduledIn.getTime() - punchIn.getTime()) / 60000;

//           if (earlyMins >= policy.overtimeThresholdMins) {
//             extraMins += earlyMins;
//           }

//           // LATE OUT
//           const lateMins =
//             (punchOut.getTime() - scheduledOut.getTime()) / 60000;

//           if (lateMins >= policy.overtimeThresholdMins) {
//             extraMins += lateMins;
//           }

//           overtimeHours = Number((extraMins / 60).toFixed(2));
//           overtimePay =
//             overtimeHours * policy.overtimeHourlyRate;
//         }

//         // ===== BULK OP =====
//         ops.push({
//           updateOne: {
//             filter: {
//               userId,
//               date: new Date(dateKey),
//             },
//             update: {
//               $set: {
//                 uniqueId: enNo,
//                 punchIn,
//                 punchOut,
//                 status,
//                 totalWorkedMinutes,
//                 overtimeHours,
//                 overtimePay,
//               },
//             },
//             upsert: true,
//           },
//         });
//       }
//     }

//     // ===== SAVE =====
//     if (ops.length > 0) {
//       await Attendance.bulkWrite(ops);
//     }

//     return c.json(
//       {
//         message: "Attendance processed successfully",
//         recordsProcessed: ops.length,
//       },
//       200
//     );
//   } catch (error: any) {
//     console.error(error);
//     return c.json({ message: error.message }, 500);
//   }
// };




// ===== HELPER: Adjust to IST (UTC+5:30) =====
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



// export const getAttendances = async (c: Context) => {
//   try {
//     const data = await Attendance.find().populate("userId", "name email");
//     return c.json({ data }, 200);
//   } catch (error: any) {
//     return c.json({ message: error.message }, 500);
//   }
// };



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