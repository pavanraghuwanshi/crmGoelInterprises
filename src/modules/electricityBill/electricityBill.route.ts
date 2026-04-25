import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";
import meterRoutes from "./meter.route";
import billRoutes from "./bill.route";

const electricityBillRoutes = new Hono();

electricityBillRoutes.use("*", verifyToken);

electricityBillRoutes.route("/meter", meterRoutes);
electricityBillRoutes.route("/", billRoutes);

export default electricityBillRoutes;
