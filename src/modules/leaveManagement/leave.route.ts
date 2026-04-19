import { Hono } from "hono";
import { applyLeave, getLeaves, getLeavesByUserId, updateLeaveStatus } from "./leave.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const leaveRoutes = new Hono();

leaveRoutes.post("/",applyLeave );
leaveRoutes.use("*", verifyToken);

leaveRoutes.get("/",getLeaves );
leaveRoutes.get("/by-user",getLeavesByUserId );
leaveRoutes.put("/:id",updateLeaveStatus );

export default leaveRoutes;