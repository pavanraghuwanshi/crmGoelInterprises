import { Hono } from "hono";
import { applyLeave, getLeaves, getLeavesByUserId, updateLeaveStatus } from "./leave.controller";

const leaveRoutes = new Hono();

leaveRoutes.post("/",applyLeave );
leaveRoutes.get("/",getLeaves );
leaveRoutes.get("/by-user",getLeavesByUserId );
leaveRoutes.put("/",updateLeaveStatus );

export default leaveRoutes;