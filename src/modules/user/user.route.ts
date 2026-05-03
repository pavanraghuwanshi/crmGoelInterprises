import { Hono } from "hono";
import { register, login, getUsers, updateUser, getUserById, deleteUser, getUsersDropdown, getUsersStats, getDeletedUsers } from "../user/user.controller.ts";
import { verifyToken } from "../../middleware/auth.middleware.ts";

const authRoutes = new Hono();

// login api
authRoutes.post("/login", login);


authRoutes.use("*", verifyToken);

authRoutes.post("/register", register);
authRoutes.get("/get-all", getUsers);
authRoutes.get("/stats", getUsersStats);
authRoutes.get("/get-dropdown", getUsersDropdown);
authRoutes.get("/get/:id", getUserById);
authRoutes.put("/update/:id", updateUser);
authRoutes.delete("/delete/:id", deleteUser);
authRoutes.get("/get-deleted-users", getDeletedUsers);



export default authRoutes;