import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware.ts";
import { createEmployeeId, deleteEmployeeId, getAvailableEmployeeIds, getEmployeeIds, updateEmployeeId } from "./employeeId.controller.ts";

const empIdRoutes = new Hono();


empIdRoutes.use("*", verifyToken);

empIdRoutes.post("/", createEmployeeId);
empIdRoutes.get("/", getEmployeeIds);
empIdRoutes.get("/dropdown", getAvailableEmployeeIds);
empIdRoutes.put("/:id", updateEmployeeId);
empIdRoutes.delete("/:id", deleteEmployeeId);



export default empIdRoutes;