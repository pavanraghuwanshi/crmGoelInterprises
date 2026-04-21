import { Hono } from "hono";
import { uploadDocument, getDocuments, getDocumentById, deleteDocument, patchDocument, deleteDocumentFiles, getUpcomingReminders } from "./doccenter.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const docCenterRoutes = new Hono();

docCenterRoutes.use("*", verifyToken);

docCenterRoutes.get("/reminders/upcoming", getUpcomingReminders);
docCenterRoutes.post("/", uploadDocument);
docCenterRoutes.get("/", getDocuments);
docCenterRoutes.get("/:id", getDocumentById);
docCenterRoutes.patch("/:id", patchDocument);
docCenterRoutes.delete("/:id", deleteDocument);
docCenterRoutes.post("/delete-files", deleteDocumentFiles);

export default docCenterRoutes;
