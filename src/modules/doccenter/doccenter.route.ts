import { Hono } from "hono";
import { uploadDocument, getDocuments, getDocumentById, deleteDocument, patchDocument, deleteDocumentFiles } from "./doccenter.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const docCenterRoutes = new Hono();

// Auth required for all doccenter routes
docCenterRoutes.use("*", verifyToken);

docCenterRoutes.post("/", uploadDocument);
docCenterRoutes.get("/", getDocuments);
docCenterRoutes.get("/:id", getDocumentById);
docCenterRoutes.patch("/:id", patchDocument);
docCenterRoutes.delete("/:id", deleteDocument);
docCenterRoutes.post("/delete-files", deleteDocumentFiles);

export default docCenterRoutes;
