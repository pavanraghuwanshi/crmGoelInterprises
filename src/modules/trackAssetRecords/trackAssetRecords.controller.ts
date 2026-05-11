import type { Context } from "hono";
import TrackAssetRecord from "./trackAssetRecords.model";
import path from "path";
import fs from "fs";

export const createTrackRecord = async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const amount = formData.get("amount");
    const description = formData.get("description") as string;
    const assetId = formData.get("assetId") as string;

    if (!amount || !description || !assetId) {
      return c.json({ error: "Amount, description, and assetId are required" }, 400);
    }

    const files = formData.getAll("images");
    const uploadedFilePaths: string[] = [];

    const uploadDir = path.join(process.cwd(), "uploads", "track-assets");
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
        
        uploadedFilePaths.push(`/uploads/track-assets/${uniqueName}`);
      }
    }

    const newRecord = new TrackAssetRecord({
      amount: Number(amount),
      description,
      assetId: assetId as any,

      images: uploadedFilePaths,
    });

    await newRecord.save();

    return c.json({
      message: "Track record created successfully",
      data: newRecord,
    }, 201);
  } catch (error: any) {
    console.error("Create track record error:", error);
    return c.json({ error: error.message || "Failed to create track record" }, 500);
  }
};

export const getTrackRecordsByAsset = async (c: Context) => {
  try {
    const assetId = c.req.param("assetId");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const sortBy = c.req.query("sortBy") || "createdAt";
    const sortOrder = c.req.query("sortOrder") || "desc";

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [records, total] = await Promise.all([
      TrackAssetRecord.find({ assetId: assetId as any })
        .sort(sort)
        .skip(skip)
        .limit(limit),
      TrackAssetRecord.countDocuments({ assetId: assetId as any })
    ]);

    return c.json({
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};


export const deleteTrackRecord = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const record = await TrackAssetRecord.findById(id);
    
    if (!record) {
      return c.json({ error: "Record not found" }, 404);
    }

    // Delete files from disk
    if (record.images && record.images.length > 0) {
      for (const imagePath of record.images) {
        const fullPath = path.join(process.cwd(), imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (err) {
            console.error(`Failed to delete file: ${fullPath}`, err);
          }
        }
      }
    }

    await TrackAssetRecord.findByIdAndDelete(id);

    return c.json({ message: "Track record deleted successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
