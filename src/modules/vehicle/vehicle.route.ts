import { Hono } from "hono";
import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "./vehicle.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const vehicleRoutes = new Hono();

vehicleRoutes.use("*", verifyToken);

vehicleRoutes.post("/", createVehicle);
vehicleRoutes.get("/", getVehicles);
vehicleRoutes.get("/:id", getVehicleById);
vehicleRoutes.patch("/:id", updateVehicle);
vehicleRoutes.delete("/:id", deleteVehicle);

export default vehicleRoutes;
