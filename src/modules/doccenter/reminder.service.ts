import cron from "node-cron";
import DocCenter, {type IReminder } from "./doccenter.model";
import { sendEmail } from "../../utils/email";

export const calculateNextOccurrence = (reminder: IReminder, fromDate: Date = new Date()): Date => {
  const { frequency, interval, time, startDate } = reminder;
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  
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
        // If it was supposed to happen today at a time already passed, it stays as is
        // The processor will catch it if it hasn't run.
        break;
    }
  }
  
  return next;
};

export const startReminderCron = () => {
  // Run every minute to check for reminders
  cron.schedule("* * * * *", async () => {
    console.log("Checking for reminders...");
    const now = new Date();
    
    try {
      const documents = await DocCenter.find({
        "reminder.enabled": true,
        "reminder.nextOccurrence": { $lte: now }
      });

      for (const doc of documents) {
        if (!doc.reminder) continue;

        console.log(`Sending reminder for: ${doc.title}`);
        
        // Send Email
        const subject = doc.reminder.subject || `Reminder: ${doc.title}`;
        const message = doc.reminder.message || `This is a reminder for your document: ${doc.title}`;
        const html = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2>Reminder: ${doc.title}</h2>
            <p>${message}</p>
            <p><strong>Document Type:</strong> ${doc.documentType}</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Document</a></p>
          </div>
        `;

        await sendEmail(doc.reminder.recipientEmails, subject, html);

        // Update next occurrence
        if (doc.reminder.frequency === "once") {
          doc.reminder.enabled = false;
        } else {
          doc.reminder.nextOccurrence = calculateNextOccurrence(doc.reminder, now);
        }

        await doc.save();
      }
    } catch (error) {
      console.error("Error in reminder cron:", error);
    }
  });
};
