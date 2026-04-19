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
  updateAttendanceStatus,
  getManualAttendancePendingUsers,
  manualMarkAttendance,
  getAttendanceCountByMonth,
  getTodayAttendanceSummary
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

// get Attendance
attendanceRoutes.get("/dashboard-count", getTodayAttendanceSummary);


// get Attendance count month wise
attendanceRoutes.get("/count/month", getAttendanceCountByMonth);


// get User For Manual Attendance 
attendanceRoutes.get("/get-user-to-mark-manual-attendance", getManualAttendancePendingUsers);

// update attendance Status
attendanceRoutes.put("/update", updateAttendanceStatus);

// update attendance manually
attendanceRoutes.put("/mark-manual-attendance", manualMarkAttendance);


// get monthly attendance
attendanceRoutes.get("/monthly", getUserMonthlyAttendance);

export default attendanceRoutes;
