import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";
import { 
  createAttendancePolicy, 
  getAttendancePolicies,
  createCompanyCalendarBatch,
  getCompanyCalendar,
  uploadBiometricData,
  getAttendances
} from "./attendance.controller";

const attendanceRoutes = new Hono();

attendanceRoutes.use("*", verifyToken);

// policies
attendanceRoutes.post("/policy", createAttendancePolicy);
attendanceRoutes.get("/policy", getAttendancePolicies);

// calendar
attendanceRoutes.post("/calendar", createCompanyCalendarBatch);
attendanceRoutes.get("/calendar", getCompanyCalendar);

// biometric
attendanceRoutes.post("/upload", uploadBiometricData);
attendanceRoutes.get("/", getAttendances);

export default attendanceRoutes;
