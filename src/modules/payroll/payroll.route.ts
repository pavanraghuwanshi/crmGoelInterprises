import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";
import { createPayrollPolicy, getPayrollPolicies, calculatePayroll, updatePayrollPolicy, deletePayrollPolicy } from "./payroll.controller";

const payrollRoutes = new Hono();

payrollRoutes.use("*", verifyToken);

payrollRoutes.post("/policy", createPayrollPolicy);
payrollRoutes.get("/policy", getPayrollPolicies);
payrollRoutes.put("/policy/:id", updatePayrollPolicy);

payrollRoutes.delete("/policy/:id", deletePayrollPolicy);
payrollRoutes.get("/calculate", calculatePayroll);

export default payrollRoutes;
