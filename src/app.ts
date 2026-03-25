import { Hono } from "hono";
import userRoutes from "../src/modules/user/user.route";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "CRM API running 🚀" });
});


// 👤 user routes
app.route("/api/user", userRoutes);
export default app;