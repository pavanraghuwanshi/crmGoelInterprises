import type { Context } from "hono";
import Reminder from "./reminder.model";
import { calculateNextOccurrence } from "./reminder.service";

export const createReminder = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    
    if (body.enabled) {
      body.nextOccurrence = calculateNextOccurrence(body);
    }

    const reminder = new Reminder({
      ...body,
      createdBy: user.id,
    });

    await reminder.save();

    return c.json({
      message: "Reminder created successfully",
      data: reminder,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getReminders = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const skip = (page - 1) * limit;

    const [reminders, total] = await Promise.all([
      Reminder.find({ createdBy: user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Reminder.countDocuments({ createdBy: user.id })
    ]);

    return c.json({
      data: reminders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getReminderById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const reminder = await Reminder.findById(id);
    if (!reminder) return c.json({ error: "Reminder not found" }, 404);
    return c.json(reminder);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const patchReminder = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const updateData = await c.req.json();

    const existingReminder = await Reminder.findById(id);
    if (!existingReminder) return c.json({ error: "Reminder not found" }, 404);

    if (updateData.action === "done") {
      if (existingReminder.enabled) {
        if (existingReminder.frequency === "once") {
          updateData.enabled = false;
        } else {
          const next = calculateNextOccurrence(existingReminder.toObject(), existingReminder.nextOccurrence);
          updateData.nextOccurrence = next;
          updateData.lastEmailSentDate = null;
        }
      }
    } else if (updateData.frequency || updateData.time || updateData.startDate || updateData.enabled !== undefined) {
      // Recalculate next occurrence if scheduling fields changed
      const merged = { ...existingReminder.toObject(), ...updateData };
      if (merged.enabled) {
        updateData.nextOccurrence = calculateNextOccurrence(merged);
      }
    }

    const { action, ...setFields } = updateData;
    const updatedReminder = await Reminder.findByIdAndUpdate(
      id,
      { $set: setFields },
      { new: true, runValidators: true }
    );

    return c.json({
      message: updateData.action === "done" ? "Reminder marked as done" : "Reminder updated successfully",
      data: updatedReminder
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteReminder = async (c: Context) => {
  try {
    const id = c.req.param("id");
    await Reminder.findByIdAndDelete(id);
    return c.json({ message: "Reminder deleted successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

const getReminderThreshold = (frequency: string): number => {
    switch (frequency) {
      case "daily": return parseInt(process.env.REMINDER_THRESHOLD_DAILY || "0");
      case "weekly": return parseInt(process.env.REMINDER_THRESHOLD_WEEKLY || "1");
      case "monthly": return parseInt(process.env.REMINDER_THRESHOLD_MONTHLY || "5");
      case "yearly": return parseInt(process.env.REMINDER_THRESHOLD_YEARLY || "15");
      case "once": return parseInt(process.env.REMINDER_THRESHOLD_ONCE || "5");
      case "custom": return parseInt(process.env.REMINDER_THRESHOLD_CUSTOM || "5");
      default: return parseInt(process.env.REMINDER_DAYS_THRESHOLD || "5");
    }
  };

export const getUpcomingReminders = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const now = new Date();
    
    const allEnabledReminders = await Reminder.find({
      createdBy: user.id,
      enabled: true,
      nextOccurrence: { $exists: true }
    });

    console.log(`Debug: Found ${allEnabledReminders.length} total enabled reminders for user ${user.id}`);

    const upcomingReminders = allEnabledReminders.filter(rem => {
      if (!rem.nextOccurrence) return false;
      const threshold = getReminderThreshold(rem.frequency);
      const triggerDate = new Date(rem.nextOccurrence);
      triggerDate.setDate(triggerDate.getDate() - threshold);
      
      // Add a 1-hour buffer (3600000ms) so things starting soon are visible
      // OR if it's daily and threshold is 0, show if scheduled for today
      const isUpcoming = now.getTime() >= (triggerDate.getTime() - 3600000);
      
      console.log(`Debug: Reminder "${rem.title}" - Frequency: ${rem.frequency}, Next: ${rem.nextOccurrence.toISOString()}, Trigger: ${triggerDate.toISOString()}, IsUpcoming: ${isUpcoming}`);
      
      return isUpcoming;
    });

    const totalCount = upcomingReminders.length;
    const urgency = {
      urgent: upcomingReminders.filter(r => {
        const diff = (r.nextOccurrence?.getTime() || 0) - now.getTime();
        return diff <= (24 * 60 * 60 * 1000);
      }).length,
      upcoming: upcomingReminders.filter(r => {
        const diff = (r.nextOccurrence?.getTime() || 0) - now.getTime();
        return diff > (24 * 60 * 60 * 1000);
      }).length
    };

    return c.json({
      summary: {
        totalCount,
        urgency,
        thresholds: {
          daily: getReminderThreshold("daily"),
          weekly: getReminderThreshold("weekly"),
          monthly: getReminderThreshold("monthly"),
          yearly: getReminderThreshold("yearly"),
          once: getReminderThreshold("once"),
          custom: getReminderThreshold("custom")
        }
      },
      data: upcomingReminders
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
