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
import empIdRoutes from "./modules/user/employeeId.route";
import reminderRoutes from "./modules/reminder/reminder.route";
import modulePermissionRoutes from "./modules/AssignedPermission/permission.route";
import deptDesgRoutes from "./modules/Designation_And_Department/Designation_And_Department.route";
import fuelCardRoutes from "./modules/fuelCard/fuelCard.route";
import vehicleRoutes from "./modules/vehicle/vehicle.route";
import fuelRoutes from "./modules/fuel/fuel.route";
import trackAssetRoutes from "./modules/trackAssetRecords/trackAssetRecords.route";



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




app.route("/api/user", userRoutes);
app.route("/api/employee-id", empIdRoutes);
app.route("/api/attendance", attendanceRoutes);
app.route("/api/company-calendar", companyCalendarRouter);
app.route("/api/employee-salary", employeeSalaryRoutes);
app.route("/api/payroll", payrollRoutes);
app.route("/api/doccenter", docCenterRoutes);
app.route("/api/roster", rosterRoute);
app.route("/api/company", companyRoute);
app.route("/api/org", deptDesgRoutes);
app.route("/api/assets", assetRoutes);
app.route("/api/leave", leaveRoutes);
app.route("/api/recruitment", recruitmentRoutes);
app.route("/api/reminder", reminderRoutes);
app.route("/api/module/permission", modulePermissionRoutes);
app.route("/api/fuel-card", fuelCardRoutes);
app.route("/api/vehicle", vehicleRoutes);
app.route("/api/fuel", fuelRoutes);
app.route("/api/track-assets", trackAssetRoutes);




export default app;