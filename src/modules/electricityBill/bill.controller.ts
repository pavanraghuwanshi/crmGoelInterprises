import type { Context } from "hono";
import { ElectricityBill } from "./bill.model";
import path from "path";
import fs from "fs";

export const uploadBill = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const title = formData.get("title") as string;
    const referenceId = formData.get("referenceId") as string;

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }
    if (!referenceId) {
      return c.json({ error: "Meter Reference ID is required" }, 400);
    }

    const files = formData.getAll("files");
    const uploadedFilePaths: string[] = [];

    const uploadDir = path.join(process.cwd(), "uploads", "electricityBill");
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
        
        uploadedFilePaths.push(`/uploads/electricityBill/${uniqueName}`);
      }
    }

    // Extract metadata (everything else)
    const metadata: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (!["title", "referenceId", "files"].includes(key)) {
        metadata[key] = value;
      }
    });

    const newBill = new ElectricityBill({
      title,
      referenceId,
      createdBy: user.id,
      files: uploadedFilePaths,
      metadata,
    });

    await newBill.save();

    return c.json({
      message: "Electricity Bill uploaded successfully",
      data: newBill,
    }, 201);
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ error: error.message || "Failed to upload bill" }, 500);
  }
};

export const getBills = async (c: Context) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const sortBy = c.req.query("sortBy") || "createdAt";
    const sortOrder = c.req.query("sortOrder") || "desc";
    const referenceId = c.req.query("referenceId");

    const skip = (page - 1) * limit;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } }
      ];
    }
    
    if (referenceId) {
      filter.referenceId = referenceId;
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [bills, total] = await Promise.all([
      ElectricityBill.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("referenceId", "meterNumber meterName"),
      ElectricityBill.countDocuments(filter)
    ]);

    return c.json({
      data: bills,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getBillById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const bill = await ElectricityBill.findById(id)
      .populate("createdBy", "name email")
      .populate("referenceId", "meterNumber meterName");
    if (!bill) return c.json({ error: "Bill not found" }, 404);
    return c.json(bill);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const patchBill = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const contentType = c.req.header("content-type") || "";
    
    let updateData: any = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      
      if (formData.has("title")) updateData.title = formData.get("title");
      if (formData.has("referenceId")) updateData.referenceId = formData.get("referenceId");
      
      if (formData.has("metadata")) {
        try {
          updateData.metadata = JSON.parse(formData.get("metadata") as string);
        } catch (e) {}
      }

      const files = formData.getAll("files");
      if (files.length > 0 && files[0] instanceof File) {
        const newFilePaths: string[] = [];
        const uploadDir = path.join(process.cwd(), "uploads", "electricityBill");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        for (const file of files) {
          if (file instanceof File) {
              const timestamp = Date.now();
              const sanitizedName = file.name.replace(/\s+/g, "_");
              const uniqueName = `${timestamp}-${sanitizedName}`;
              const filePath = path.join(uploadDir, uniqueName);
              await Bun.write(filePath, file);
              newFilePaths.push(`/uploads/electricityBill/${uniqueName}`);
          }
        }
        updateData.$push = { files: { $each: newFilePaths } };
      }
    } else {
      updateData = await c.req.json();
    }

    const existingBill = await ElectricityBill.findById(id);
    if (!existingBill) {
      return c.json({ error: "Bill not found" }, 404);
    }

    const { $push, ...setFields } = updateData;
    const mongoUpdate: any = {};
    if (Object.keys(setFields).length > 0) mongoUpdate.$set = setFields;
    if ($push) mongoUpdate.$push = $push;

    const updatedBill = await ElectricityBill.findByIdAndUpdate(
      id,
      mongoUpdate,
      { returnDocument: 'after', runValidators: true }
    );

    return c.json({
      message: "Bill updated successfully",
      data: updatedBill
    });
  } catch (error: any) {
    console.error("Patch error:", error);
    return c.json({ error: error.message || "Failed to update bill" }, 500);
  }
};

export const deleteBill = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const bill = await ElectricityBill.findById(id);
    
    if (!bill) {
      return c.json({ error: "Bill not found" }, 404);
    }

    if (bill.files && bill.files.length > 0) {
      for (const fileRelativePath of bill.files) {
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

    await ElectricityBill.findByIdAndDelete(id);

    return c.json({ message: "Bill and associated files deleted successfully" });
  } catch (error: any) {
    console.error("Delete error:", error);
    return c.json({ error: error.message || "Failed to delete bill" }, 500);
  }
};

export const deleteBillFiles = async (c: Context) => {
  try {
    const { billId, fileUrls } = await c.req.json<{ billId: string, fileUrls: string[] }>();

    if (!billId || !fileUrls || !Array.isArray(fileUrls)) {
      return c.json({ error: "billId and an array of fileUrls are required" }, 400);
    }

    const bill = await ElectricityBill.findById(billId);
    if (!bill) {
      return c.json({ error: "Bill not found" }, 404);
    }

    const remainingFiles = bill.files.filter(f => !fileUrls.includes(f));
    const filesToDelete = bill.files.filter(f => fileUrls.includes(f));

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

    bill.files = remainingFiles;
    await bill.save();

    return c.json({
      message: "Specified files deleted successfully",
      data: bill
    });
  } catch (error: any) {
    console.error("Delete files error:", error);
    return c.json({ error: error.message || "Failed to delete files" }, 500);
  }
};
