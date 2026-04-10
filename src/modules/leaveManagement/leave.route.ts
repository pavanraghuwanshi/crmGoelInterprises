import { Hono } from "hono";
import { applyLeave, getLeaves, updateLeaveStatus } from "./leave.controller";

const leaveRoutes = new Hono();

leaveRoutes.post("/",applyLeave );
leaveRoutes.get("/",getLeaves );
leaveRoutes.put("/",updateLeaveStatus );

export default leaveRoutes;