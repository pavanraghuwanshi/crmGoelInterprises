import { serve } from "bun";
import app from "./app";

import { connectDB } from "./config/db";
import "dotenv/config"; // 👈 important
import { startReminderCron } from "./modules/reminder/reminder.service";

// connect database
await connectDB();

// Start reminders
startReminderCron();

serve({
  fetch: app.fetch, 
  port: process.env.PORT || 5000,
});

console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);