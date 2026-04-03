import { Hono } from "hono";
import { addEmployeeSalary, calculateEmployeePayroll } from "./employeeSalary.Controller";

const employeeSalaryRoutes = new Hono();

employeeSalaryRoutes.post("/add", addEmployeeSalary);
employeeSalaryRoutes.get("/calculate", calculateEmployeePayroll);
// employeeSalaryRoutes.get("/payroll/calculate", calculateEmployeePayroll);

export default employeeSalaryRoutes;