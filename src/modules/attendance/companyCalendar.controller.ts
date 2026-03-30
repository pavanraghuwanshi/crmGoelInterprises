import type { Context } from "hono";
import { CalendarDay } from "./companyCalendar.model";



//  Create Company Calendar
export const generateCalendar = async (c: Context) => {
  try {
    const { year } = await c.req.json();
    if (!year || typeof year !== "number") {
      return c.json({ success: false, message: "Year is required and must be a number" }, 400);
    }

    // Check if calendar exists
    const existing = await CalendarDay.findOne({
      date: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
    });

    if (existing) {
      return c.json({
        success: false,
        message: "Calendar for this year already exists. You can only update 6 working days at a time.",
      }, 400);
    }

    // Generate calendar
    const days: any[] = [];
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      days.push({
        date: new Date(d),
        dayType: dayOfWeek === 0 ? "holiday" : "working", // Only Sunday is holiday
        isNationalHoliday: false,
        isCompanyHoliday: false,
      });
    }

    await CalendarDay.insertMany(days);

    return c.json({ success: true, message: `Calendar for ${year} generated successfully.` });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
};


//  Get Attendance Month wise
export const getMonthCalendar = async (c: Context) => {
  try {
    const year = parseInt(c.req.query("year") || "");
    const month = parseInt(c.req.query("month") || ""); // 1 = Jan, 12 = Dec

    if (!year || year < 1900) {
      return c.json({ success: false, message: "Valid year is required" }, 400);
    }
    if (!month || month < 1 || month > 12) {
      return c.json({ success: false, message: "Valid month (1-12) is required" }, 400);
    }

    const startDate = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
    const endDate = new Date(year, month, 0); // Last day of month

    const days = await CalendarDay.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    return c.json({ success: true, year, month, days });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
};

//  Update any date working/holiday
export const updateSingleDate = async (c: Context) => {
  try {
    const { date, dayType, isNationalHoliday, isCompanyHoliday, description } = await c.req.json();

    if (!date) {
      return c.json({ success: false, message: "Date is required" }, 400);
    }

    if (!["working", "holiday"].includes(dayType)) {
      return c.json({ success: false, message: "dayType must be 'working' or 'holiday'" }, 400);
    }

    const updated = await CalendarDay.findOneAndUpdate(
      { date: new Date(date) },
      {
        $set: {
          dayType,
          isNationalHoliday: !!isNationalHoliday,
          isCompanyHoliday: !!isCompanyHoliday,
          description: description || "",
        },
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return c.json({ success: false, message: "Date not found in calendar" }, 404);
    }

    return c.json({ success: true, message: "Date updated successfully", data: updated });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
};