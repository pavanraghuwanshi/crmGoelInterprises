import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";
import { 
  createAttendancePolicy, 
  getAttendancePolicies,
  uploadBiometricData,
  getAttendances,
  getUserMonthlyAttendance
} from "./attendance.controller";

const attendanceRoutes = new Hono();

attendanceRoutes.use("*", verifyToken);

// policies
attendanceRoutes.post("/policy", createAttendancePolicy);
attendanceRoutes.get("/policy", getAttendancePolicies);


// biometric
attendanceRoutes.post("/upload", uploadBiometricData);
attendanceRoutes.get("/", getAttendances);
attendanceRoutes.get("/monthly", getUserMonthlyAttendance);

export default attendanceRoutes;
