import { Hono } from "hono";
import { assignAttendancePolicyBulk, getRosterUsers, update24HourShiftBulk } from "./roster.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const rosterRoute = new Hono();

rosterRoute.use("*", verifyToken);


rosterRoute.post("/assign-attendance-policy", assignAttendancePolicyBulk);
rosterRoute.get("/assign-attendance-policy", getRosterUsers);
rosterRoute.post("/assign-24hour-policy", update24HourShiftBulk);

export default rosterRoute;