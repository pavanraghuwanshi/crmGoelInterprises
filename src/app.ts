import { Hono } from "hono";
import userRoutes from "../src/modules/user/user.route";
import { cors } from "hono/cors";

const app = new Hono();

// ✅ Allow ALL CORS
app.use("*", cors({
  origin: "http://localhost:5173", // ❗ exact frontend URL
  credentials: true,               // 🔥 MUST for cookies
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/", (c) => {
  return c.json({ message: "CRM API running 🚀" });
});


// 👤 user routes
app.route("/api/user", userRoutes);
export default app;