import { Hono } from "hono";
import { assignAttendancePolicyBulk } from "./roster.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const rosterRoute = new Hono();

rosterRoute.use("*", verifyToken);


rosterRoute.post("/assign-attendance-policy", assignAttendancePolicyBulk);

export default rosterRoute;