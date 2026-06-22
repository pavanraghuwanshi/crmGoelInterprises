import type { Context } from "hono";
import { EmployeeSalary } from "./employeeSalary.model";
import { PayrollPolicy } from "../payroll/payrollPolicy.model";
import { Attendance } from "../attendance/attendance.model";
import mongoose from "mongoose";
import { Types } from "mongoose";
import { CalendarDay } from "../attendance/companyCalendar.model";
import { User } from "../user/user.model";


//  add employee salary
export const addEmployeeSalary = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { userId, hourly, monthly, daily, hourlyRate, monthlySalary, dailyRate } = body;

    // ✅ Basic validations
    if (!userId) return c.json({ message: "userId is required" }, 400);
    if (!hourly && !monthly && !daily)
      return c.json({ message: "At least one salary type must be true" }, 400);
    if (!mongoose.Types.ObjectId.isValid(userId))
      return c.json({ message: "Invalid userId" }, 400);

    // Check if salary already exists
    const existing = await EmployeeSalary.findOne({ userId });
    if (existing) return c.json({ message: "Salary already exists for this employee" }, 400);

    const newSalary = new EmployeeSalary({
      userId,
      hourly: !!hourly,
      monthly: !!monthly,
      daily: !!daily,
      hourlyRate: hourlyRate || undefined,
      monthlySalary: monthlySalary || undefined,
      dailyRate: dailyRate || undefined,
    });

    await newSalary.save();

    return c.json({ message: "Employee salary added successfully", data: newSalary }, 201);
  } catch (err: any) {
    console.error(err);
    return c.json({ message: "Internal server error", error: err.message }, 500);
  }
};


// ===== GET ALL EMPLOYEE SALARIES =====
export const getEmployeeSalaries = async (c: Context) => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      userId,
      salaryType,
    } = c.req.query();

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    // ===== USER ID FILTER =====
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    // ===== SALARY TYPE FILTER =====
    if (salaryType === "hourly") filter.hourly = true;
    if (salaryType === "monthly") filter.monthly = true;
    if (salaryType === "daily") filter.daily = true;

    // ===== SEARCH BY USER NAME / EMAIL =====
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((u) => u._id);

      filter.userId = { $in: userIds };
    }

    // ===== GET DATA =====
    const data = await EmployeeSalary.find(filter)
      .populate("userId", "name email otherName department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await EmployeeSalary.countDocuments(filter);

    return c.json(
      {
        message: "Employee salaries fetched successfully",
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      200
    );
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        message: "Internal server error",
        error: err.message,
      },
      500
    );
  }
};


//  update employee salary
export const updateEmployeeSalary = async (c: Context) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();

    const {
      hourly,
      monthly,
      daily,
      hourlyRate,
      monthlySalary,
      dailyRate,
    } = body;

    // ===== VALIDATION =====
    if (!userId) {
      return c.json({ message: "userId is required" }, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return c.json({ message: "Invalid userId" }, 400);
    }

    if (!hourly && !monthly && !daily) {
      return c.json(
        { message: "At least one salary type must be true" },
        400
      );
    }

    // ===== UPDATE DATA =====
    const updateData = {
      hourly: !!hourly,
      monthly: !!monthly,
      daily: !!daily,
      hourlyRate: hourlyRate ?? undefined,
      monthlySalary: monthlySalary ?? undefined,
      dailyRate: dailyRate ?? undefined,
    };

    const salary = await EmployeeSalary.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
      } as any,
      { $set: updateData },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return c.json(
      {
        message: "Employee salary updated successfully",
        data: salary,
      },
      200
    );
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        message: "Internal server error",
        error: err.message,
      },
      500
    );
  }
};




// ===== DELETE EMPLOYEE SALARY =====
export const deleteEmployeeSalary = async (c: Context) => {
  try {
    const userId = c.req.param("userId") || c.req.query("userId");

    // ===== VALIDATION =====
    if (!userId) {
      return c.json({ message: "userId is required" }, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return c.json({ message: "Invalid userId" }, 400);
    }

    const deletedSalary = await EmployeeSalary.findOneAndDelete(
      {
        userId: new mongoose.Types.ObjectId(userId),
      } as any
    );

    if (!deletedSalary) {
      return c.json(
        { message: "Salary record not found for this employee" },
        404
      );
    }

    return c.json(
      {
        message: "Employee salary deleted successfully",
        data: deletedSalary,
      },
      200
    );
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        message: "Internal server error",
        error: err.message,
      },
      500
    );
  }
};





// export const calculateEmployeePayroll = async (c: Context) => {
//   try {
//     const employeeId = c.req.query("employeeId");
//     const month = c.req.query("month"); // format: YYYY-MM

//     if (!employeeId || !month) {
//       return c.json({ message: "employeeId and month are required" }, 400);
//     }
//     if (!mongoose.Types.ObjectId.isValid(employeeId)) {
//       return c.json({ message: "Invalid employeeId" }, 400);
//     }

//     const [year, monthNum] = month.split("-");
//     const startDate = new Date(Number(year), Number(monthNum) - 1, 1);
//     const endDate = new Date(Number(year), Number(monthNum), 0);
//     const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

//     const salary = await EmployeeSalary.findOne({ userId: employeeObjectId as any }).populate("userId", "name email");
    
//     if (!salary) return c.json({ message: "Salary info not found" }, 404);

//     // ✅ Extract employeeName safely
//     const employeeName = salary?.userId && "name" in salary.userId ? salary.userId.name : "Unknown";

//     const payrollPolicy = await PayrollPolicy.findOne({ createdBy: employeeId }).sort({ createdAt: -1 });
//     if (!payrollPolicy) return c.json({ message: "Payroll policy not found" }, 404);

//     const attendanceRecords = await Attendance.find({
//       userId: employeeObjectId,
//       date: { $gte: startDate, $lte: endDate },
//     });

//     const calendarDays = await CalendarDay.find({ date: { $gte: startDate, $lte: endDate } });

//     let totalWorkedMinutes = 0;
//     let totalOvertimeHours = 0;
//     let overtimePayFromDB = 0;

//     attendanceRecords.forEach((r) => {
//       totalWorkedMinutes += r.totalWorkedMinutes || 0;
//       totalOvertimeHours += r.overtimeHours || 0;
//       overtimePayFromDB += r.overtimePay || 0;
//     });

//     let basePay = 0;
//     let totalPaidDays = 0;
//     let payrollDetails: Record<string, number> = {};

//     // ============================
//     // 🟢 HOURLY
//     // ============================
//     if (salary.hourly) {
//       const totalHours = totalWorkedMinutes / 60;
//       basePay = totalHours * (salary.hourlyRate || 0);
//     }

//     // ============================
//     // 🟢 DAILY
//     // ============================
//     else if (salary.daily) {
//       const workingDays = calendarDays.filter(
//         (d) => d.dayType === "working" && !d.isCompanyHoliday && !d.isNationalHoliday
//       );
//       for (const day of workingDays) {
//         const record = attendanceRecords.find((r) => r.date.toDateString() === day.date.toDateString());
//         if (!record) continue;

//         if (record.status === "Present" && record.punchIn && record.punchOut) totalPaidDays += 1;
//         else if (record.status === "Half-Day" && record.punchIn && record.punchOut) totalPaidDays += 0.5;
//       }
//       basePay = totalPaidDays * (salary.dailyRate || 0);
//     }

//     // ============================
//     // 🟢 MONTHLY (WITH PAYROLL POLICY)
//     // ============================
//     else if (salary.monthly) {
//       const workingDays = calendarDays.filter(
//         (d) => d.dayType === "working" && !d.isCompanyHoliday && !d.isNationalHoliday
//       );
//       const totalWorkingDays = workingDays.length;

//       // split month into weeks for sunday policy
//       const weeks: any[] = [];
//       let current = new Date(startDate);
//       while (current <= endDate) {
//         const weekStart = new Date(current);
//         const weekEnd = new Date(current);
//         weekEnd.setDate(weekEnd.getDate() + 6);
//         weeks.push({ start: new Date(weekStart), end: weekEnd > endDate ? endDate : weekEnd });
//         current.setDate(current.getDate() + 7);
//       }

//       let lastWeekWasFiveDays = false;
//       for (const week of weeks) {
//         const weekDays = workingDays.filter((d) => d.date >= week.start && d.date <= week.end);

//         let daysWorked = 0;
//         for (const day of weekDays) {
//           const record = attendanceRecords.find((r) => r.date.toDateString() === day.date.toDateString());
//           if (!record) continue;

//           if (record.status === "Present" && record.punchIn && record.punchOut) daysWorked += 1;
//           else if (record.status === "Half-Day" && record.punchIn && record.punchOut) daysWorked += 0.5;
//         }

//         let isSundayPaid = false;
//         if (daysWorked === 6) {
//           isSundayPaid = true;
//           lastWeekWasFiveDays = false;
//         } else if (daysWorked === 5) {
//           if (!lastWeekWasFiveDays) {
//             isSundayPaid = true;
//             lastWeekWasFiveDays = true;
//           } else {
//             isSundayPaid = false;
//             lastWeekWasFiveDays = false;
//           }
//         } else {
//           isSundayPaid = false;
//           lastWeekWasFiveDays = false;
//         }

//         totalPaidDays += daysWorked;
//         if (isSundayPaid) {
//           const sunday = calendarDays.find((d) => d.date >= week.start && d.date <= week.end && d.date.getDay() === 0);
//           if (sunday) totalPaidDays += 1;
//         }
//       }

//       // Gross Pay proportional to worked days
//       const workedRatio = totalWorkingDays === 0 ? 0 : totalPaidDays / totalWorkingDays;
//       const grossPay = (salary.monthlySalary || 0) * workedRatio;

//       // Payroll Policy Breakdown
//       const policy = payrollPolicy.heads || {};
//       const allowances = {
//         basic: (policy.basic / 100) * grossPay || 0,
//         hra: (policy.hra / 100) * grossPay || 0,
//         conveyance: (policy.conveyance / 100) * grossPay || 0,
//       };

//       const deductions = {
//         pfEmployee: (policy.pfEmployee / 100) * grossPay || 0,
//         esiEmployee: (policy.esiEmployee / 100) * grossPay || 0,
//         lwfEmployee: (policy.lwfEmployee / 100) * grossPay || 0,
//       };

//       basePay =
//         Object.values(allowances).reduce((a, b) => a + b, 0) -
//         Object.values(deductions).reduce((a, b) => a + b, 0);

//       // ============================
//       // OVERTIME
//       // ============================
//       const overtimeRate = policy.overtimeHourlyRate || 0;
//       const overtimePay = totalOvertimeHours * overtimeRate;

//       const netPay = basePay + overtimePay;

//       // Save details for response
//       payrollDetails = { ...allowances, ...deductions };

//       // Assign back to outer scope
//       basePay = Number(basePay.toFixed(2));
//       totalOvertimeHours = Number(totalOvertimeHours.toFixed(2));
//       totalPaidDays = Number(totalPaidDays.toFixed(2));
//       payrollDetails = Object.fromEntries(
//         Object.entries(payrollDetails).map(([k, v]) => [k, Number(v.toFixed(2))])
//       );

//       return c.json(
//         {
//           employeeId,
//           employeeName,
//           month,
//           totalWorkedMinutes: Number(totalWorkedMinutes.toFixed(2)),
//           totalOvertimeHours,
//           totalPaidDays,
//           basePay,
//           overtimePay: Number(overtimePay.toFixed(2)),
//           netPay: Number(netPay.toFixed(2)),
//           payrollDetails,
//         },
//         200
//       );
//     }

//     // ============================
//     // OVERTIME for hourly/daily handled outside monthly
//     // ============================
//     const overtimeRate = payrollPolicy.heads?.overtimeHourlyRate || 0;
//     const overtimePay = totalOvertimeHours * overtimeRate;
//     const netPay = basePay + overtimePay;

//     const round = (num: number) => Number(num.toFixed(2));

//     return c.json(
//       {
//         employeeId,
//         employeeName,
//         month,
//         totalWorkedMinutes: round(totalWorkedMinutes),
//         totalOvertimeHours: round(totalOvertimeHours),
//         totalPaidDays: round(totalPaidDays),
//         basePay: round(basePay),
//         overtimePay: round(overtimePay),
//         netPay: round(netPay),
//         payrollDetails,
//       },
//       200
//     );
//   } catch (err: any) {
//     console.error(err);
//     return c.json({ message: err.message || "Internal Server Error" }, 500);
//   }
// };




export const calculateEmployeePayroll = async (c: Context) => {
  try {
    const employeeId = c.req.query("employeeId");
    const month = c.req.query("month"); // format: YYYY-MM

    if (!employeeId || !month) {
      return c.json({ message: "employeeId and month are required" }, 400);
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return c.json({ message: "Invalid employeeId" }, 400);
    }

    const [year, monthNum] = month.split("-");
    const startDate = new Date(Number(year), Number(monthNum) - 1, 1);
    const endDate = new Date(Number(year), Number(monthNum), 0);
    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

    // const salary = await EmployeeSalary.findOne({ userId: employeeObjectId as any }).populate("userId", "name email");
    const salary = await EmployeeSalary.findOne({
      userId: employeeObjectId as any,
    })
      .populate({
        path: "userId",
        select: "name email payrollPolicyId",
        populate: {
          path: "payrollPolicyId", // 👈 User ke andar se policy
        },
      });
    
    if (!salary) return c.json({ message: "Salary info not found" }, 404);

    // ✅ Extract employeeName safely
    const employeeName = salary?.userId && "name" in salary.userId ? salary.userId.name : "Unknown";

    // const payrollPolicy = await PayrollPolicy.findOne({ createdBy: employeeId }).sort({ createdAt: -1 });
    // if (!payrollPolicy) return c.json({ message: "Payroll policy not found" }, 404);

    const user: any = salary.userId;
    const payrollPolicy = user?.payrollPolicyId;

    if (!payrollPolicy) {
      return c.json({ message: "Payroll policy not assigned to employee" }, 404);
    }

    const attendanceRecords = await Attendance.find({
      userId: employeeObjectId,
      date: { $gte: startDate, $lte: endDate },
    });

    const calendarDays = await CalendarDay.find({ date: { $gte: startDate, $lte: endDate } });

    let totalWorkedMinutes = 0;
    let totalOvertimeHours = 0;
    let overtimePayFromDB = 0;

    attendanceRecords.forEach((r) => {
      totalWorkedMinutes += r.totalWorkedMinutes || 0;
      totalOvertimeHours += r.overtimeHours || 0;
      overtimePayFromDB += r.overtimePay || 0;
    });

    let basePay = 0;
    let totalPaidDays = 0;
    let payrollDetails: Record<string, number> = {};

    // ============================
    // 🟢 HOURLY
    // ============================
    if (salary.hourly) {
      const totalHours = totalWorkedMinutes / 60;
      basePay = totalHours * (salary.hourlyRate || 0);
    }

    // ============================
    // 🟢 DAILY
    // ============================
    else if (salary.daily) {
      const workingDays = calendarDays.filter(
        (d) => d.dayType === "working" && !d.isCompanyHoliday && !d.isNationalHoliday
      );
      for (const day of workingDays) {
        const record = attendanceRecords.find((r) => r.date.toDateString() === day.date.toDateString());
        if (!record) continue;

        if (record.status === "Present" && record.punchIn && record.punchOut) totalPaidDays += 1;
        else if (record.status === "Half-Day" && record.punchIn && record.punchOut) totalPaidDays += 0.5;
      }
      basePay = totalPaidDays * (salary.dailyRate || 0);
    }

    // ============================
    // 🟢 MONTHLY (WITH PAYROLL POLICY)
    // ============================
    else if (salary.monthly) {
      const workingDays = calendarDays.filter(
        (d) => d.dayType === "working" && !d.isCompanyHoliday && !d.isNationalHoliday
      );
      const totalWorkingDays = workingDays.length;

      // split month into weeks for sunday policy
      const weeks: any[] = [];
      let current = new Date(startDate);
      while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeks.push({ start: new Date(weekStart), end: weekEnd > endDate ? endDate : weekEnd });
        current.setDate(current.getDate() + 7);
      }

      let lastWeekWasFiveDays = false;
      for (const week of weeks) {
        const weekDays = workingDays.filter((d) => d.date >= week.start && d.date <= week.end);

        let daysWorked = 0;
        for (const day of weekDays) {
          const record = attendanceRecords.find((r) => r.date.toDateString() === day.date.toDateString());
          if (!record) continue;

          if (record.status === "Present" && record.punchIn && record.punchOut) daysWorked += 1;
          else if (record.status === "Half-Day" && record.punchIn && record.punchOut) daysWorked += 0.5;
        }

        let isSundayPaid = false;
        if (daysWorked === 6) {
          isSundayPaid = true;
          lastWeekWasFiveDays = false;
        } else if (daysWorked === 5) {
          if (!lastWeekWasFiveDays) {
            isSundayPaid = true;
            lastWeekWasFiveDays = true;
          } else {
            isSundayPaid = false;
            lastWeekWasFiveDays = false;
          }
        } else {
          isSundayPaid = false;
          lastWeekWasFiveDays = false;
        }

        totalPaidDays += daysWorked;
        if (isSundayPaid) {
          const sunday = calendarDays.find((d) => d.date >= week.start && d.date <= week.end && d.date.getDay() === 0);
          if (sunday) totalPaidDays += 1;
        }
      }

      // Gross Pay proportional to worked days
      const workedRatio = totalWorkingDays === 0 ? 0 : totalPaidDays / totalWorkingDays;
      const grossPay = (salary.monthlySalary || 0) * workedRatio;

      // Payroll Policy Breakdown
      const policy = payrollPolicy.heads || {};
      const allowances = {
        basic: (policy.basic / 100) * grossPay || 0,
        hra: (policy.hra / 100) * grossPay || 0,
        conveyance: (policy.conveyance / 100) * grossPay || 0,
      };

      const deductions = {
        pfEmployee: (policy.pfEmployee / 100) * grossPay || 0,
        esiEmployee: (policy.esiEmployee / 100) * grossPay || 0,
        lwfEmployee: (policy.lwfEmployee / 100) * grossPay || 0,
      };

      basePay =
        Object.values(allowances).reduce((a, b) => a + b, 0) -
        Object.values(deductions).reduce((a, b) => a + b, 0);

      // ============================
      // OVERTIME
      // ============================
      const overtimeRate = policy.overtimeHourlyRate || 0;
      const overtimePay = totalOvertimeHours * overtimeRate;

      const netPay = basePay + overtimePay;

      // Save details for response
      payrollDetails = { ...allowances, ...deductions };

      // Assign back to outer scope
      basePay = Number(basePay.toFixed(2));
      totalOvertimeHours = Number(totalOvertimeHours.toFixed(2));
      totalPaidDays = Number(totalPaidDays.toFixed(2));
      payrollDetails = Object.fromEntries(
        Object.entries(payrollDetails).map(([k, v]) => [k, Number(v.toFixed(2))])
      );

      return c.json(
        {
          employeeId,
          employeeName,
          month,
          totalWorkedMinutes: Number(totalWorkedMinutes.toFixed(2)),
          totalOvertimeHours,
          totalPaidDays,
          basePay,
          overtimePay: Number(overtimePay.toFixed(2)),
          netPay: Number(netPay.toFixed(2)),
          payrollDetails,
        },
        200
      );
    }

    // ============================
    // OVERTIME for hourly/daily handled outside monthly
    // ============================
    const overtimeRate = payrollPolicy.heads?.overtimeHourlyRate || 0;
    const overtimePay = totalOvertimeHours * overtimeRate;
    const netPay = basePay + overtimePay;

    const round = (num: number) => Number(num.toFixed(2));

    return c.json(
      {
        employeeId,
        employeeName,
        month,
        totalWorkedMinutes: round(totalWorkedMinutes),
        totalOvertimeHours: round(totalOvertimeHours),
        totalPaidDays: round(totalPaidDays),
        basePay: round(basePay),
        overtimePay: round(overtimePay),
        netPay: round(netPay),
        payrollDetails,
      },
      200
    );
  } catch (err: any) {
    console.error(err);
    return c.json({ message: err.message || "Internal Server Error" }, 500);
  }
};