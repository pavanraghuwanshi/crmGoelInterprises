import { Hono } from "hono";
import { 
  createMeter, getMeters, getMeterById, updateMeter, deleteMeter 
} from "./meter.controller";

const meterRoutes = new Hono();

meterRoutes.post("/", createMeter);
meterRoutes.get("/", getMeters);
meterRoutes.get("/:id", getMeterById);
meterRoutes.put("/:id", updateMeter);
meterRoutes.delete("/:id", deleteMeter);

export default meterRoutes;
