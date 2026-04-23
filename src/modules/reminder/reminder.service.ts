import cron from "node-cron";
import Reminder, { type IReminder } from "./reminder.model";
import { sendEmail } from "../../utils/email";

export const calculateNextOccurrence = (reminder: Partial<IReminder>, fromDate: Date = new Date()): Date => {
  const { frequency, interval, time, startDate } = reminder;
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const start = startDate instanceof Date ? startDate : new Date(startDate as any);
  
  let next = new Date(start > fromDate ? start : fromDate);
  next.setHours(hours || 0, minutes || 0, 0, 0);

  // If next is in the past compared to current check, increment it
  if (next <= fromDate) {
    switch (frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      case "custom":
        next.setDate(next.getDate() + (interval || 1));
        break;
      case "once":
        break;
    }
  }
  
  return next;
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

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const startReminderCron = () => {
  // Run every minute to check for reminders
  cron.schedule("* * * * *", async () => {
    console.log("Checking for reminders...");
    const now = new Date();
    
    try {
      const reminders = await Reminder.find({
        enabled: true
      });

      for (const reminder of reminders) {
        if (!reminder.nextOccurrence) continue;

        const threshold = getReminderThreshold(reminder.frequency);
        const triggerDate = new Date(reminder.nextOccurrence);
        triggerDate.setDate(triggerDate.getDate() - threshold);

        // Send email if:
        // 1. Current time is past the trigger date (nextOccurrence - threshold)
        // 2. AND we haven't sent an email today yet
        if (now >= triggerDate) {
          const lastSent = reminder.lastEmailSentDate;
          if (!lastSent || !isSameDay(now, new Date(lastSent))) {
            console.log(`Sending daily reminder for: ${reminder.title} (Threshold: ${threshold} days)`);
            
            // Send Email
            const subject = reminder.title;
            const message = reminder.description || "This is a scheduled reminder.";
            const html = `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                <h2>${reminder.title}</h2>
                <p>${message}</p>
                <p><strong>Scheduled Date:</strong> ${reminder.nextOccurrence.toDateString()}</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reminders" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Reminder</a></p>
                <hr/>
                <p style="font-size: 0.8em; color: #666;">You will receive this reminder daily until you mark it as done.</p>
              </div>
            `;

            await sendEmail(reminder.recipientEmails, subject, html);

            // ONLY update lastEmailSentDate. 
            // nextOccurrence is updated manually via the "Done" button/API.
            reminder.lastEmailSentDate = now;
            await reminder.save();
          }
        }
      }
    } catch (error) {
      console.error("Error in reminder cron:", error);
    }
  });
};
