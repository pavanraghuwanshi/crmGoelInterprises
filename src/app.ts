import { Hono } from "hono";
import userRoutes from "../src/modules/user/user.route";
import attendanceRoutes from "../src/modules/attendance/attendance.route";
import payrollRoutes from "../src/modules/payroll/payroll.route";
import docCenterRoutes from "../src/modules/doccenter/doccenter.route";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import companyCalendarRouter from "./modules/attendance/companyCalendar.route";
import employeeSalaryRoutes from "./modules/employeeSalary/employeeSalary.route";
import rosterRoute from "./modules/Roaster/roster.route";

const app = new Hono();

// ✅ Allow ALL CORS


app.use("*", cors({
  origin: (origin) => "*", // always return "*" to allow all origins
  credentials: true,       // allow cookies/auth headers
}));

// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://goyal-enterprices.vercel.app",
//   "http://34.180.48.62:5000"
// ];

// app.use("*", cors({
//   origin: (origin) => {
//     if (!origin) return origin; // allow Postman / server calls
//     return allowedOrigins.includes(origin) ? origin : "";
//   },
//   credentials: true,
// }));

app.get("/", (c) => {
  return c.json({ message: "CRM API running 🚀" });
});

// 📁 serve static files from uploads folder
app.use(
  "/api/uploads/*",
  serveStatic({
    root: "./uploads",
    rewriteRequestPath: (path) => path.replace(/^\/api\/uploads/, ""),
  })
);

// 👤 user routes
app.route("/api/user", userRoutes);

// 📆 attendance routes
app.route("/api/attendance", attendanceRoutes);
app.route("/api/company-calendar", companyCalendarRouter);


//  employee salary routes
app.route("/api/employee-salary", employeeSalaryRoutes);


// 💰 payroll routes
app.route("/api/payroll", payrollRoutes);

// 📁 doccenter routes
app.route("/api/doccenter", docCenterRoutes);

//  Roster routes
app.route("/api/roster", rosterRoute);


export default app;