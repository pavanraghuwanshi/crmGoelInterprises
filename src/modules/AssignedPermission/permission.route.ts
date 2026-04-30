import { Hono } from "hono";
import {
  assignPermissions,
  getPermissions,
  getAllPermissions,
  updatePermissions,
  deletePermissions
} from "./permission.controller";

import { verifyToken } from "../../middleware/auth.middleware";

const modulePermissionRoutes = new Hono();

modulePermissionRoutes.use("*", verifyToken);

// 🚀 ADMIN ONLY ROUTES
modulePermissionRoutes.post("/", assignPermissions); // assign / upsert
modulePermissionRoutes.get("/", getAllPermissions); // get all HR permissions
modulePermissionRoutes.put("/:userId", updatePermissions);
modulePermissionRoutes.delete("/:userId", deletePermissions);

// 📖 GET SINGLE USER PERMISSIONS
modulePermissionRoutes.get("/:userId", getPermissions);

export default modulePermissionRoutes;