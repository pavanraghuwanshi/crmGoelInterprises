import { Hono } from "hono";
import { addEmployeeSalary, calculateEmployeePayroll, deleteEmployeeSalary, updateEmployeeSalary } from "./employeeSalary.Controller";

const employeeSalaryRoutes = new Hono();

employeeSalaryRoutes.post("/add", addEmployeeSalary);
employeeSalaryRoutes.put("/update/:userId", updateEmployeeSalary);
employeeSalaryRoutes.delete("/delete/:userId", deleteEmployeeSalary);
employeeSalaryRoutes.get("/calculate", calculateEmployeePayroll);
// employeeSalaryRoutes.get("/payroll/calculate", calculateEmployeePayroll);

export default employeeSalaryRoutes;