import { Hono } from "hono";
import { assignAttendancePolicyBulk, getRosterUsers } from "./roster.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const rosterRoute = new Hono();

rosterRoute.use("*", verifyToken);


rosterRoute.post("/assign-attendance-policy", assignAttendancePolicyBulk);
rosterRoute.get("/assign-attendance-policy", getRosterUsers);

export default rosterRoute;