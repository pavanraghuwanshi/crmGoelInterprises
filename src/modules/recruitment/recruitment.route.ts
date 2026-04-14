import { Hono } from "hono";
import {
    createRecruitment,
    getRecruitments,
    getRecruitmentById,
    patchRecruitment,
    deleteRecruitment,
    deleteRecruitmentFiles
} from "./recruitment.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const recruitmentRoutes = new Hono();

// Auth required for recruitment routes
recruitmentRoutes.use("*", verifyToken);

// POST /api/recruitment - Create a recruitment record (form-data)
recruitmentRoutes.post("/", createRecruitment);

// GET /api/recruitment - List all recruitment records (supports pagination/search)
recruitmentRoutes.get("/", getRecruitments);

// GET /api/recruitment/:id - Get specific recruitment record
recruitmentRoutes.get("/:id", getRecruitmentById);

// PATCH /api/recruitment/:id - Update recruitment record (form-data or json)
recruitmentRoutes.patch("/:id", patchRecruitment);

// DELETE /api/recruitment/:id - Delete recruitment record and files
recruitmentRoutes.delete("/:id", deleteRecruitment);

// POST /api/recruitment/delete-files - Delete specific files from a record
recruitmentRoutes.post("/delete-files", deleteRecruitmentFiles);

export default recruitmentRoutes;
