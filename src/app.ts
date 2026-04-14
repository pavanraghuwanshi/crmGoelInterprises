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
import companyRoute from "./modules/company/company.route";
import assetRoutes from "./modules/assets/asset.route";
import leaveRoutes from "./modules/leaveManagement/leave.route";
import recruitmentRoutes from "./modules/recruitment/recruitment.route";


const app = new Hono();

// ✅ Allow ALL CORS


app.use("*", cors({
  origin: (origin) => "*",
  credentials: true,
}));



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

app.route("/api/company", companyRoute);
//  Asset routes
app.route("/api/assets", assetRoutes);

// leave routes
app.route("/api/leave", leaveRoutes);

// 🤝 recruitment routes
app.route("/api/recruitment", recruitmentRoutes);



export default app;