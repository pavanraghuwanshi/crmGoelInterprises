import type { Context } from "hono";
import { AttendancePolicy } from "./attendancePolicy.model";
import { CalendarDay } from "./companyCalendar.model";
import { Attendance } from "./attendance.model";
import { User } from "../user/user.model";
import type { JwtPayload } from "../auth/auth.type";
import { Types } from "mongoose";
import Leave from "../leaveManagement/leave.model";




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
    const userCompanyMap = new Map<number, any>();

    users.forEach((u: any) => {
      userMap.set(u.uniqueId, u._id);
      userCompanyMap.set(u.uniqueId, u.companyId); // ✅ store companyId
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
      const companyId = userCompanyMap.get(enNo);
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
                companyId, // ✅ added
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

    // ===== BASE FILTER =====
    const filter: any = {};
    if (status) filter.status = status;
    if (userId) filter.userId = new Types.ObjectId(userId as string);

    // ===== QUERY =====
    const data = await Attendance.find(filter)
      .populate({
        path: "userId",
        select: "name email companyId",
        match: search
          ? {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            }
          : {},
        populate: {
          path: "companyId",
          select: "name",
        },
      })
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // ⚠️ important: null user remove (because match fail ho sakta hai)
    const filteredData = data.filter((item) => item.userId !== null);

    const total = await Attendance.countDocuments(filter);

    return c.json(
      { data: filteredData, total, page: pageNum, limit: limitNum },
      200
    );
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};


// ===== GET ATTENDANCES (DEFAULT TODAY) WITH DATE FILTER + SUMMARY =====

// export const getAttendancesWithSummary = async (c: Context) => {
//   try {
//     const {
//       page = "1",
//       limit = "10",
//       status,
//       userId,
//       search,
//       startDate,
//       endDate,
//       companyId,
//     } = c.req.query();

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     // ===== DATE RANGE =====
//     let start = startDate ? new Date(startDate) : new Date();
//     start.setHours(0, 0, 0, 0);

//     let end = endDate ? new Date(endDate) : new Date(start);
//     end.setHours(23, 59, 59, 999);

//     // ===== USER FILTER (NO ADMIN) =====
//     const baseUserFilter: any = {
//       role: { $ne: "admin" },
//     };

//     if (companyId) {
//       baseUserFilter.companyId = new Types.ObjectId(companyId);
//     }

//     // ===== SEARCH FILTER =====
//     const searchFilter: any = { ...baseUserFilter };

//     if (search) {
//       searchFilter.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (userId) {
//       searchFilter._id = new Types.ObjectId(userId);
//     }

//     // ===== ALL USERS (FOR SUMMARY) =====
//     const allUsers = await User.find(baseUserFilter) .select("_id name email companyId designation").populate("companyId", "name");
//     const allUserIds = allUsers.map((u) => u._id.toString());

//     const totalUsers = allUsers.length;

//     // ===== FILTERED USERS (FOR DATA) =====
//     const filteredUsers = await User.find(searchFilter).select( "_id name email companyId designation").populate("companyId", "name");;

//     const filteredUserIds = filteredUsers.map((u) =>
//       u._id.toString()
//     );

//     // ===== ATTENDANCE =====
//     const attendanceDocs = await Attendance.find({
//       userId: { $in: allUserIds },
//       date: { $gte: start, $lte: end },
//     });

//     const attendanceMap = new Map();

//     attendanceDocs.forEach((a) => {
//       attendanceMap.set(a.userId.toString(), a);
//     });

//     // ===== LEAVES =====
//     const leaves = await Leave.find({
//       userId: { $in: allUserIds },
//       status: "Approved",
//       fromDate: { $lte: end },
//       toDate: { $gte: start },
//     });

//     const leaveSet = new Set(
//       leaves.map((l) => l.userId.toString())
//     );

//     // ===== SUMMARY (IMPORTANT: NO STATUS FILTER HERE) =====
//     let present = 0;
//     let absent = 0;
//     let onLeave = 0;
//     let notMarked = 0;

//     const finalAllUsers: any[] = [];

//     for (const user of allUsers) {
//       const uid = user._id.toString();
//       const attendance = attendanceMap.get(uid);

//       if (attendance) {
//         if (attendance.status === "Present") present++;
//         else if (attendance.status === "Absent") absent++;

//       finalAllUsers.push({
//         user: {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           designation:user.designation,
//           company: user.companyId, // populated object
//         },
//         attendance,
//         status: attendance.status,
//       });
//       } else if (leaveSet.has(uid)) {
//         onLeave++;
//         finalAllUsers.push({
//           user: {
//             _id: user._id,
//             name: user.name,
//             designation:user.designation,
//             email: user.email,
//             company: user.companyId,
//           },
//           attendance: null,
//           status: "On Leave",
//         });
//       } else {
//         notMarked++;
//       finalAllUsers.push({
//         user: {
//           _id: user._id,
//           name: user.name,
//           designation:user.designation,
//           email: user.email,
//           company: user.companyId, // populated company object
//         },
//         attendance: null,
//         status: "Not Marked",
//       });
//       }
//     }

//     // ===== DATA FILTER (STATUS APPLIES HERE ONLY) =====
//     let finalFiltered = finalAllUsers.filter((u) =>
//       filteredUserIds.includes(u.user._id.toString())
//     );

//     if (status) {
//       finalFiltered = finalFiltered.filter(
//         (u) => u.status === status
//       );
//     }

//     // ===== PAGINATION =====
//     const total = finalFiltered.length;

//     const paginated = finalFiltered.slice(
//       (pageNum - 1) * limitNum,
//       pageNum * limitNum
//     );

//     // ===== RESPONSE =====
//     return c.json(
//       {
//         summary: {
//           totalUsers,
//           present,
//           absent,
//           onLeave,
//           notMarked,
//         },
//         data: paginated,
//         total,
//         page: pageNum,
//         limit: limitNum,
//         startDate: start,
//         endDate: end,
//       },
//       200
//     );
//   } catch (error: any) {
//     console.error(error);
//     return c.json({ message: error.message }, 500);
//   }
// };

export const getAttendancesWithSummary = async (c: Context) => {
  try {
    const {
      page = "1",
      limit = "10",
      status,
      userId,
      search,
      startDate,
      endDate,
      companyId,
    } = c.req.query();

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // ===== DATE RANGE =====
    let start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    let end = endDate ? new Date(endDate) : new Date(start);
    end.setHours(23, 59, 59, 999);

    // ===== USER FILTER (NO ADMIN) =====
    const baseUserFilter: any = {
      role: { $ne: "admin" },
    };

    if (companyId) {
      baseUserFilter.companyId = new Types.ObjectId(companyId);
    }

    // ===== SEARCH FILTER =====
    const searchFilter: any = { ...baseUserFilter };

    if (search) {
      searchFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (userId) {
      searchFilter._id = new Types.ObjectId(userId);
    }

    // ===== ALL USERS (FOR SUMMARY) =====
    const allUsers = await User.find(baseUserFilter)
      .select("_id name email companyId designation")
      .populate("companyId", "name");

    const allUserIds = allUsers.map((u) => u._id.toString());
    const totalUsers = allUsers.length;

    // ===== FILTERED USERS (FOR DATA) =====
    const filteredUsers = await User.find(searchFilter)
      .select("_id name email companyId designation")
      .populate("companyId", "name");

    const filteredUserIds = filteredUsers.map((u) =>
      u._id.toString()
    );

    // ===== ATTENDANCE =====
    const attendanceDocs = await Attendance.find({
      userId: { $in: allUserIds },
      date: { $gte: start, $lte: end },
    });

    const attendanceMap = new Map();

    attendanceDocs.forEach((a) => {
      attendanceMap.set(a.userId.toString(), a);
    });

    // ===== LEAVES =====
    const leaves = await Leave.find({
      userId: { $in: allUserIds },
      status: "Approved",
      fromDate: { $lte: end },
      toDate: { $gte: start },
    });

    const leaveSet = new Set(
      leaves.map((l) => l.userId.toString())
    );

    // ===== SUMMARY =====
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let notMarked = 0;

    const finalAllUsers: any[] = [];

    for (const user of allUsers) {
      const uid = user._id.toString();
      const attendance = attendanceMap.get(uid);

      // ===== UPDATED LOGIC ONLY =====
      if (attendance) {
        const hasPunchIn = !!attendance.punchIn;
        const hasPunchOut = !!attendance.punchOut;

        if (hasPunchIn && hasPunchOut) {
          present++;

          finalAllUsers.push({
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              designation: user.designation,
              company: user.companyId,
            },
            attendance,
            status: "Present",
          });
        } else {
          notMarked++;

          finalAllUsers.push({
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              designation: user.designation,
              company: user.companyId,
            },
            attendance,
            status: "Not Marked",
          });
        }
      } else if (leaveSet.has(uid)) {
        onLeave++;

        finalAllUsers.push({
          user: {
            _id: user._id,
            name: user.name,
            designation: user.designation,
            email: user.email,
            company: user.companyId,
          },
          attendance: null,
          status: "On Leave",
        });
      } else {
        absent++;

        finalAllUsers.push({
          user: {
            _id: user._id,
            name: user.name,
            designation: user.designation,
            email: user.email,
            company: user.companyId,
          },
          attendance: null,
          status: "Absent",
        });
      }
    }

    // ===== DATA FILTER =====
    let finalFiltered = finalAllUsers.filter((u) =>
      filteredUserIds.includes(u.user._id.toString())
    );

    if (status) {
      finalFiltered = finalFiltered.filter(
        (u) => u.status === status
      );
    }

    // ===== PAGINATION =====
    const total = finalFiltered.length;

    const paginated = finalFiltered.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    // ===== RESPONSE =====
    return c.json(
      {
        summary: {
          totalUsers,
          present,
          absent,
          onLeave,
          notMarked,
        },
        data: paginated,
        total,
        page: pageNum,
        limit: limitNum,
        startDate: start,
        endDate: end,
      },
      200
    );
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};
 

//  ====== Update Attendance Status Of Single User

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


//  ====== Update Attendance Status Of Multiple User
export const updateMultipleAttendanceStatus = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { userIds, date, status, punchIn, punchOut } = body;

    if (!userIds || !Array.isArray(userIds) || !date || !status) {
      return c.json({ message: "userIds, date, status required" }, 400);
    }

    // ✅ prepare update data
    const updateData: any = {
      status,
    };

    // ✅ if frontend sends punchIn/punchOut then use them
    if (punchIn) {
      updateData.punchIn = new Date(punchIn);
    }

    if (punchOut) {
      updateData.punchOut = new Date(punchOut);
    }

    if (status === "Absent") {
      updateData.punchIn = null;
      updateData.punchOut = null;
      updateData.totalWorkedMinutes = 0;
      updateData.overtimeHours = 0;
      updateData.overtimePay = 0;
    }

    if (status === "Half-Day") {
      updateData.totalWorkedMinutes = 240;
    }

    // ✅ update
    const result = await Attendance.updateMany(
      {
        userId: { $in: userIds },
        date: new Date(date),
      },
      { $set: updateData }
    );

    return c.json({
      success: true,
      message: "Status updated successfully",
      modifiedCount: result.modifiedCount,
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



    // ===== MONTHLY DATE WISE ATTENDANCE COUNT =====
    // query: ?year=2026&month=4

export const getAttendanceCountByMonth = async (c: Context) => {
  try {
    const { year, month } = c.req.query();

    if (!year || !month) {
      return c.json(
        { message: "year and month query params are required" },
        400
      );
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    const totalDays = new Date(yearNum, monthNum, 0).getDate();

    // total users
    const totalUsers = await User.countDocuments({ role: "user" });

    // attendance records
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    }).select("date status");

    // calendar holidays
    const holidays = await CalendarDay.find({
      date: { $gte: startDate, $lte: endDate },
      dayType: "holiday",
    }).select("date dayType description");

    const holidaySet = new Set(
      holidays.map((h) => h.date.toISOString().split("T")[0])
    );

    const map: Record<
      string,
      {
        present: number;
        halfDay: number;
        absent: number;
        isHoliday: boolean;
      }
    > = {};

    // init dates
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(yearNum, monthNum - 1, day);

      const dateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const weekDay = dateObj.getDay();
      const isWeekend = weekDay === 0 || weekDay === 6;
      const isHoliday = isWeekend || holidaySet.has(dateStr);

      map[dateStr] = {
        present: 0,
        halfDay: 0,
        absent: isHoliday ? 0 : totalUsers,
        isHoliday,
      };
    }

    // count attendance
    for (const item of records) {
      const d = new Date(item.date);

      const dateStr = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const dayData = map[dateStr];
      if (!dayData) continue;

      if (item.status === "Present") {
        dayData.present++;
        if (!dayData.isHoliday) dayData.absent--;
      }

      if (item.status === "Half-Day") {
        dayData.halfDay++;
        if (!dayData.isHoliday) dayData.absent--;
      }
    }

    const result = Object.keys(map).map((date) => ({
      date,
      present: map[date]!.present,
      halfDay: map[date]!.halfDay,
      absent: map[date]!.absent,
      isHoliday: map[date]!.isHoliday,
    }));

    return c.json(
      {
        year: yearNum,
        month: monthNum,
        totalUsers,
        data: result,
      },
      200
    );
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






//   DashBoard Data Api

export const getTodayAttendanceSummary = async (c: Context) => {
  try {
    const { startDate, endDate } = c.req.query();

    // ===== DEFAULT DATE RANGE (TODAY) =====
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    let end = new Date(start);
    end.setDate(start.getDate() + 1);

    // ===== IF QUERY PARAMS PROVIDED =====
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    // ===== USER FILTER =====
    const userFilter: any = {
      role: { $ne: "admin" },
    };

    // ===== ALL USERS =====
    const users = await User.find(userFilter).select("_id");
    const totalUsers = users.length;

    const userIds = users.map((u) => u._id.toString());

    // ===== ATTENDANCE =====
    const attendanceData = await Attendance.find({
      userId: { $in: userIds },
      date: { $gte: start, $lte: end },
    });

    const attendanceMap = new Map();

    attendanceData.forEach((a) => {
      attendanceMap.set(a.userId.toString(), a);
    });

    // ===== LEAVES =====
    const leaveData = await Leave.find({
      userId: { $in: userIds },
      status: "Approved",
      fromDate: { $lte: end },
      toDate: { $gte: start },
    });

    const leaveSet = new Set(
      leaveData.map((l) => l.userId.toString())
    );

    // ===== FINAL COUNT =====
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let notMarked = 0;

    for (const user of users) {
      const uid = user._id.toString();
      const attendance = attendanceMap.get(uid);

      if (attendance) {
        const hasPunchIn = !!attendance.punchIn;
        const hasPunchOut = !!attendance.punchOut;

        if (hasPunchIn && hasPunchOut) {
          present++;
        } else {
          notMarked++;
        }
      } else if (leaveSet.has(uid)) {
        onLeave++;
      } else {
        absent++;
      }
    }

    return c.json(
      {
        startDate: start,
        endDate: end,
        totalUsers,
        present,
        absent,
        onLeave,
        notMarked,
      },
      200
    );
  } catch (error: any) {
    console.error(error);
    return c.json({ message: error.message }, 500);
  }
};