import type { Context } from "hono";
import Recruitment from "./recruitment.model";
import path from "path";
import fs from "fs";

export const createRecruitment = async (c: Context) => {
    try {
        const formData = await c.req.formData();

        // Core fields
        const candidateName = formData.get("candidateName") as string;
        const email = formData.get("email") as string;
        const contactNumber = formData.get("contactNumber") as string;
        const appliedPosition = formData.get("appliedPosition") as string;
        const selectionStatus = (formData.get("selectionStatus") as string) || "Pending";

        // Optional/Interview fields
        const interviewDateRaw = formData.get("interviewDate") as string;
        const interviewDate = interviewDateRaw ? new Date(interviewDateRaw) : undefined;
        const interviewerName = formData.get("interviewerName") as string;
        const interviewerFeedback = formData.get("interviewerFeedback") as string;

        const resumes = formData.getAll("resumes");
        const uploadedFilePaths: string[] = [];

        const uploadDir = path.join(process.cwd(), "uploads", "recruitment");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        for (const file of resumes) {
            if (file instanceof File) {
                const timestamp = Date.now();
                const sanitizedName = file.name.replace(/\s+/g, "_");
                const uniqueName = `${timestamp}-${sanitizedName}`;
                const filePath = path.join(uploadDir, uniqueName);

                await Bun.write(filePath, file);

                uploadedFilePaths.push(`/uploads/recruitment/${uniqueName}`);
            }
        }

        // Extract metadata (everything else)
        const metadata: Record<string, any> = {};
        const coreFields = [
            "candidateName", "email", "contactNumber", "appliedPosition",
            "interviewDate", "interviewerName", "interviewerFeedback",
            "selectionStatus", "resumes"
        ];

        formData.forEach((value, key) => {
            if (!coreFields.includes(key)) {
                metadata[key] = value;
            }
        });

        const newRecruitment = new Recruitment({
            candidateName,
            email,
            contactNumber,
            appliedPosition,
            interviewDate,
            interviewerName,
            interviewerFeedback,
            selectionStatus,
            resumes: uploadedFilePaths,
            metadata,
        });

        await newRecruitment.save();

        return c.json({
            message: "Recruitment record created successfully",
            data: newRecruitment,
        }, 201);
    } catch (error: any) {
        console.error("Recruitment creation error:", error);
        return c.json({ error: error.message || "Failed to create recruitment record" }, 500);
    }
};

export const getRecruitments = async (c: Context) => {
    try {
        const page = parseInt(c.req.query("page") || "1");
        const limit = parseInt(c.req.query("limit") || "10");
        const search = c.req.query("search") || "";
        const status = c.req.query("status"); // selectionStatus
        const sortBy = c.req.query("sortBy") || "createdAt";
        const sortOrder = c.req.query("sortOrder") || "desc";

        const skip = (page - 1) * limit;

        const match: any = {};
        if (search) {
            match.$or = [
                { candidateName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { contactNumber: { $regex: search, $options: "i" } },
                { appliedPosition: { $regex: search, $options: "i" } },
                { interviewerName: { $regex: search, $options: "i" } }
            ];
        }

        if (status) {
            match.selectionStatus = status;
        }

        const sort: any = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;

        const [results, stats] = await Promise.all([
            Recruitment.aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        data: [{ $skip: skip }, { $limit: limit }],
                        totalCount: [{ $count: "count" }],
                    },
                },
            ]),
            Recruitment.aggregate([
                {
                    $facet: {
                        total: [{ $count: "count" }],
                        pending: [{ $match: { selectionStatus: "Pending" } }, { $count: "count" }],
                        selected: [{ $match: { selectionStatus: "Selected" } }, { $count: "count" }],
                        rejected: [{ $match: { selectionStatus: "Rejected" } }, { $count: "count" }],
                        interview: [{ $match: { selectionStatus: "Interview" } }, { $count: "count" }],
                    },
                },
            ]),
        ]);

        const records = results[0].data;
        const total = results[0].totalCount[0]?.count || 0;

        const formattedStats = {
            totalCandidates: stats[0].total[0]?.count || 0,
            pending: stats[0].pending[0]?.count || 0,
            selected: stats[0].selected[0]?.count || 0,
            rejected: stats[0].rejected[0]?.count || 0,
            interviewScheduled: stats[0].interview[0]?.count || 0,
        };

        return c.json({
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            stats: formattedStats,
        });
    } catch (error: any) {
        return c.json({ error: error.message || "Failed to fetch recruitment records" }, 500);
    }
};

export const getRecruitmentById = async (c: Context) => {
    try {
        const id = c.req.param("id");
        const record = await Recruitment.findById(id);
        if (!record) return c.json({ error: "Recruitment record not found" }, 404);
        return c.json(record);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
};

export const patchRecruitment = async (c: Context) => {
    try {
        const id = c.req.param("id");
        const contentType = c.req.header("content-type") || "";

        let updateData: any = {};

        if (contentType.includes("multipart/form-data")) {
            const formData = await c.req.formData();

            const coreFields = [
                "candidateName", "email", "contactNumber", "appliedPosition",
                "interviewDate", "interviewerName", "interviewerFeedback",
                "selectionStatus"
            ];

            coreFields.forEach(field => {
                if (formData.has(field)) updateData[field] = formData.get(field);
            });

            if (formData.has("metadata")) {
                try {
                    updateData.metadata = JSON.parse(formData.get("metadata") as string);
                } catch (e) { }
            }

            // Handle file updates
            const files = formData.getAll("resumes");
            if (files.length > 0 && files[0] instanceof File) {
                const newFilePaths: string[] = [];
                const uploadDir = path.join(process.cwd(), "uploads", "recruitment");

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                for (const file of files) {
                    if (file instanceof File) {
                        const timestamp = Date.now();
                        const sanitizedName = file.name.replace(/\s+/g, "_");
                        const uniqueName = `${timestamp}-${sanitizedName}`;
                        const filePath = path.join(uploadDir, uniqueName);
                        await Bun.write(filePath, file);
                        newFilePaths.push(`/uploads/recruitment/${uniqueName}`);
                    }
                }
                updateData.$push = { resumes: { $each: newFilePaths } };
            }
        } else {
            updateData = await c.req.json();
        }

        const { $push, ...setFields } = updateData;
        const mongoUpdate: any = {};
        if (Object.keys(setFields).length > 0) mongoUpdate.$set = setFields;
        if ($push) mongoUpdate.$push = $push;

        const updatedRecord = await Recruitment.findByIdAndUpdate(
            id,
            mongoUpdate,
            { new: true, runValidators: true }
        );

        if (!updatedRecord) return c.json({ error: "Recruitment record not found" }, 404);

        return c.json({
            message: "Recruitment record updated successfully",
            data: updatedRecord
        });
    } catch (error: any) {
        return c.json({ error: error.message || "Failed to update record" }, 500);
    }
};

export const deleteRecruitment = async (c: Context) => {
    try {
        const id = c.req.param("id");
        const record = await Recruitment.findById(id);

        if (!record) return c.json({ error: "Recruitment record not found" }, 404);

        if (record.resumes && record.resumes.length > 0) {
            for (const fileRelativePath of record.resumes) {
                const fullPath = path.join(process.cwd(), fileRelativePath.startsWith('/') ? fileRelativePath.substring(1) : fileRelativePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.error(`Failed to delete file: ${fullPath}`, err);
                    }
                }
            }
        }

        await Recruitment.findByIdAndDelete(id);
        return c.json({ message: "Recruitment record and associated resumes deleted successfully" });
    } catch (error: any) {
        return c.json({ error: error.message || "Failed to delete record" }, 500);
    }
};

export const deleteRecruitmentFiles = async (c: Context) => {
    try {
        const { recruitmentId, fileUrls } = await c.req.json<{ recruitmentId: string, fileUrls: string[] }>();

        if (!recruitmentId || !fileUrls || !Array.isArray(fileUrls)) {
            return c.json({ error: "recruitmentId and an array of fileUrls are required" }, 400);
        }

        const record = await Recruitment.findById(recruitmentId);
        if (!record) return c.json({ error: "Recruitment record not found" }, 404);

        const remainingFiles = record.resumes.filter(f => !fileUrls.includes(f));
        const filesToDelete = record.resumes.filter(f => fileUrls.includes(f));

        for (const fileRelativePath of filesToDelete) {
            const fullPath = path.join(process.cwd(), fileRelativePath.startsWith('/') ? fileRelativePath.substring(1) : fileRelativePath);
            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                } catch (err) {
                    console.error(`Failed to delete file: ${fullPath}`, err);
                }
            }
        }

        record.resumes = remainingFiles;
        await record.save();

        return c.json({
            message: "Specified resume files deleted successfully",
            data: record
        });
    } catch (error: any) {
        return c.json({ error: error.message || "Failed to delete files" }, 500);
    }
};
