import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";

import {
  // Department Controllers
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,

  // Designation Controllers
  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation,
} from "./Department_And_Designation.controller";

const deptDesgRoutes = new Hono();

// 🔐 Auth middleware
deptDesgRoutes.use("*", verifyToken);


// =========================
// 🏢 Department Routes
// =========================

// create
deptDesgRoutes.post("/department", createDepartment);

// get all
deptDesgRoutes.get("/department", getDepartments);

// update
deptDesgRoutes.put("/department/:id", updateDepartment);

// delete (soft delete)
deptDesgRoutes.delete("/department/:id", deleteDepartment);


// =========================
// 👔 Designation Routes
// =========================

// create
deptDesgRoutes.post("/designation", createDesignation);

// get all (with department populate)
deptDesgRoutes.get("/designation", getDesignations);

// update
deptDesgRoutes.put("/designation/:id", updateDesignation);

// delete (soft delete)
deptDesgRoutes.delete("/designation/:id", deleteDesignation);


export default deptDesgRoutes;