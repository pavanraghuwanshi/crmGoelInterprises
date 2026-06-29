import { Hono } from "hono";
import { createAsset, getAssets, getAssetById, updateAsset, deleteAsset, deleteMultipleAssets, unassignAsset } from "./asset.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const assetRoutes = new Hono();

// Auth required for all asset routes
assetRoutes.use("*", verifyToken);

assetRoutes.post("/", createAsset);
assetRoutes.get("/", getAssets);
assetRoutes.get("/:id", getAssetById);
assetRoutes.patch("/:id", updateAsset);
assetRoutes.delete("/:id", deleteAsset);
assetRoutes.post("/delete-multiple", deleteMultipleAssets);
assetRoutes.post("/unassign/:id", unassignAsset);

export default assetRoutes;
