import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";
import { 
  createAttendancePolicy, 
  getAttendancePolicies,
  uploadBiometricData,
  getAttendances,
  getUserMonthlyAttendance,
  updateAttendancePolicy,
  deleteAttendancePolicy,
  updateAttendanceStatus
} from "./attendance.controller";

const attendanceRoutes = new Hono();

attendanceRoutes.use("*", verifyToken);

// policies
attendanceRoutes.post("/policy", createAttendancePolicy);
attendanceRoutes.get("/policy", getAttendancePolicies);
attendanceRoutes.put("/policy/:id", updateAttendancePolicy);
attendanceRoutes.delete("/policy/:id", deleteAttendancePolicy);


// biometric  upload
attendanceRoutes.post("/upload", uploadBiometricData);

// get Attendance
attendanceRoutes.get("/", getAttendances);

// update attendance
attendanceRoutes.put("/update", updateAttendanceStatus);

// get monthly attendance
attendanceRoutes.get("/monthly", getUserMonthlyAttendance);

export default attendanceRoutes;
