import { Hono } from "hono";
import {
  createFuelEntry,
  getFuelEntries,
  getFuelEntryById,
  updateFuelEntry,
  deleteFuelEntry,
} from "./fuel.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const fuelRoutes = new Hono();

fuelRoutes.use("*", verifyToken);

fuelRoutes.post("/", createFuelEntry);
fuelRoutes.get("/", getFuelEntries);
fuelRoutes.get("/:id", getFuelEntryById);
fuelRoutes.patch("/:id", updateFuelEntry);
fuelRoutes.delete("/:id", deleteFuelEntry);

export default fuelRoutes;
