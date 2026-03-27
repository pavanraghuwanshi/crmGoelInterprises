import { Hono } from "hono";
import { register, login, getUsers, updateUser, getUserById, deleteUser } from "../user/user.controller.ts";

const authRoutes = new Hono();

authRoutes.post("/register", register);
authRoutes.get("/get-all", getUsers);
authRoutes.get("/get/:id", getUserById);
authRoutes.put("/update/:id", updateUser);
authRoutes.delete("/delete/:id", deleteUser);


// login api
authRoutes.post("/login", login);

export default authRoutes;