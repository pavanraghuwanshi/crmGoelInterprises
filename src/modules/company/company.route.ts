import { Hono } from "hono";
import { createCompany, getCompanies, updateCompany, deleteCompany, getCompanyDropdown} from "./company.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const companyRoute = new Hono();

companyRoute.use("*", verifyToken);


companyRoute.post("/",createCompany );
companyRoute.get("/", getCompanies);
companyRoute.get("/dropdown", getCompanyDropdown);
companyRoute.put("/:id", updateCompany);
companyRoute.delete("/:id", deleteCompany);

export default companyRoute;