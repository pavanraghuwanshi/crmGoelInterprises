import { Hono } from "hono";
import { 
  uploadBill, getBills, getBillById, patchBill, deleteBill, deleteBillFiles 
} from "./bill.controller";

const billRoutes = new Hono();

billRoutes.post("/", uploadBill);
billRoutes.get("/", getBills);
billRoutes.get("/:id", getBillById);
billRoutes.patch("/:id", patchBill);
billRoutes.delete("/:id", deleteBill);
billRoutes.post("/delete-files", deleteBillFiles);

export default billRoutes;
