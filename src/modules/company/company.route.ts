import { Hono } from "hono";
import { createCompany, getCompanies, updateCompany, deleteCompany} from "./company.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const companyRoute = new Hono();

companyRoute.use("*", verifyToken);


companyRoute.post("/",createCompany );
companyRoute.get("/", getCompanies);
companyRoute.put("/:id", updateCompany);
companyRoute.delete("/:id", deleteCompany);

export default companyRoute;