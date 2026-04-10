import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";
import { createPayrollPolicy, getPayrollPolicies, updatePayrollPolicy, deletePayrollPolicy } from "./payroll.controller";

const payrollRoutes = new Hono();

payrollRoutes.use("*", verifyToken);

payrollRoutes.post("/policy", createPayrollPolicy);
payrollRoutes.get("/policy", getPayrollPolicies);
payrollRoutes.put("/policy/:id", updatePayrollPolicy);

payrollRoutes.delete("/policy/:id", deletePayrollPolicy);

export default payrollRoutes;
