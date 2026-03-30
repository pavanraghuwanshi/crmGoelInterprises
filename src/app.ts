import { Hono } from "hono";
import userRoutes from "../src/modules/user/user.route";
import attendanceRoutes from "../src/modules/attendance/attendance.route";
import payrollRoutes from "../src/modules/payroll/payroll.route";
import { cors } from "hono/cors";
import companyCalendarRouter from "./modules/attendance/companyCalendar.route";

const app = new Hono();

// ✅ Allow ALL CORS


const allowedOrigins = [
  "http://localhost:5173",
  "https://goyal-enterprices.vercel.app",
];

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return origin; // allow Postman / server calls
    return allowedOrigins.includes(origin) ? origin : "";
  },
  credentials: true,
}));

app.get("/", (c) => {
  return c.json({ message: "CRM API running 🚀" });
});


// 👤 user routes
app.route("/api/user", userRoutes);

// 📆 attendance routes
app.route("/api/attendance", attendanceRoutes);
app.route("/api/company-calendar", companyCalendarRouter);

// 💰 payroll routes
app.route("/api/payroll", payrollRoutes);

export default app;