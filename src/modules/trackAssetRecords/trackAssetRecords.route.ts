import { Hono } from "hono";
import { createTrackRecord, getTrackRecordsByAsset, deleteTrackRecord } from "./trackAssetRecords.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const trackAssetRoutes = new Hono();

// Auth required
trackAssetRoutes.use("*", verifyToken);

trackAssetRoutes.post("/", createTrackRecord);
trackAssetRoutes.get("/asset/:assetId", getTrackRecordsByAsset);
trackAssetRoutes.delete("/:id", deleteTrackRecord);

export default trackAssetRoutes;
