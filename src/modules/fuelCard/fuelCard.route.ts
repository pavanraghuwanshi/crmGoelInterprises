import { Hono } from "hono";
import {
  createFuelCard,
  getFuelCards,
  getFuelCardById,
  updateFuelCard,
  deleteFuelCard,
  getFuelCardStats,
} from "./fuelCard.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const fuelCardRoutes = new Hono();

fuelCardRoutes.use("*", verifyToken);

fuelCardRoutes.post("/", createFuelCard);
fuelCardRoutes.get("/", getFuelCards);
fuelCardRoutes.get("/stats", getFuelCardStats);
fuelCardRoutes.get("/:id", getFuelCardById);
fuelCardRoutes.patch("/:id", updateFuelCard);
fuelCardRoutes.delete("/:id", deleteFuelCard);

export default fuelCardRoutes;
