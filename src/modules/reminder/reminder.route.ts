import { Hono } from "hono";
import { 
  createReminder, 
  getReminders, 
  getReminderById, 
  patchReminder, 
  deleteReminder, 
  getUpcomingReminders 
} from "./reminder.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const reminderRoutes = new Hono();

reminderRoutes.use("*", verifyToken);

reminderRoutes.post("/", createReminder);
reminderRoutes.get("/", getReminders);
reminderRoutes.get("/upcoming", getUpcomingReminders);
reminderRoutes.get("/:id", getReminderById);
reminderRoutes.patch("/:id", patchReminder);
reminderRoutes.delete("/:id", deleteReminder);

export default reminderRoutes;
