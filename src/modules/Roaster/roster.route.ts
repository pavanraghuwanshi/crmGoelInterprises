import { Hono } from "hono";
import { assignAttendancePolicyBulk } from "./roster.controller";

const rosterRoute = new Hono();

rosterRoute.post("/assign-attendance-policy", assignAttendancePolicyBulk);

export default rosterRoute;