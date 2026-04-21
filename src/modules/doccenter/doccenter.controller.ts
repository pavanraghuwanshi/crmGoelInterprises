import type { Context } from "hono";
import DocCenter from "./doccenter.model";
import { calculateNextOccurrence } from "./reminder.service";
import path from "path";
import fs from "fs";

export const uploadDocument = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const title = formData.get("title") as string;
    const documentType = formData.get("documentType") as string;

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }

    const files = formData.getAll("files");
    const uploadedFilePaths: string[] = [];

    const uploadDir = path.join(process.cwd(), "uploads", "doccenter");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of files) {
      if (file instanceof File) {
        const timestamp = Date.now();
        // Sanitize filename to avoid space issues
        const sanitizedName = file.name.replace(/\s+/g, "_");
        const uniqueName = `${timestamp}-${sanitizedName}`;
        const filePath = path.join(uploadDir, uniqueName);
        
        await Bun.write(filePath, file);
        
        uploadedFilePaths.push(`/uploads/doccenter/${uniqueName}`);
      }
    }

    // Extract metadata (everything else)
    const metadata: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (!["title", "documentType", "files", "reminder"].includes(key)) {
        metadata[key] = value;
      }
    });

    // Handle reminder
    let reminder = null;
    if (formData.has("reminder")) {
      try {
        reminder = JSON.parse(formData.get("reminder") as string);
        if (reminder.enabled) {
          reminder.nextOccurrence = calculateNextOccurrence(reminder);
        }
      } catch (e) {
        console.error("Failed to parse reminder JSON", e);
      }
    }

    const newDoc = new DocCenter({
      title,
      documentType: documentType || "Other",
      createdBy: user.id,
      files: uploadedFilePaths,
      metadata,
      reminder: reminder,
    });

    await newDoc.save();

    return c.json({
      message: "Document uploaded successfully",
      data: newDoc,
    }, 201);
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ error: error.message || "Failed to upload document" }, 500);
  }
};

export const getDocuments = async (c: Context) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const sortBy = c.req.query("sortBy") || "createdAt";
    const sortOrder = c.req.query("sortOrder") || "desc";
    const createdBy = c.req.query("createdBy");

    const skip = (page - 1) * limit;
    
    // Filter logic
    const filter: any = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { documentType: { $regex: search, $options: "i" } }
      ];
    }
    
    if (createdBy) {
      filter.createdBy = createdBy;
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [docs, total] = await Promise.all([
      DocCenter.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email"),
      DocCenter.countDocuments(filter)
    ]);

    return c.json({
      data: docs,
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

export const getDocumentById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const doc = await DocCenter.findById(id).populate("createdBy", "name email");
    if (!doc) return c.json({ error: "Document not found" }, 404);
    return c.json(doc);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const patchDocument = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const contentType = c.req.header("content-type") || "";
    
    let updateData: any = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      
      // Basic fields
      if (formData.has("title")) updateData.title = formData.get("title");
      if (formData.has("documentType")) updateData.documentType = formData.get("documentType");
      if (formData.has("action")) updateData.action = formData.get("action"); // "done" action
      
      // Handle metadata if passed as JSON string in form-data
      if (formData.has("metadata")) {
        try {
          updateData.metadata = JSON.parse(formData.get("metadata") as string);
        } catch (e) {}
      }

      // Handle reminder if passed as JSON string in form-data
      if (formData.has("reminder")) {
        try {
          updateData.reminder = JSON.parse(formData.get("reminder") as string);
        } catch (e) {}
      }

      // Handle file updates
      const files = formData.getAll("files");
      if (files.length > 0 && files[0] instanceof File) {
        const newFilePaths: string[] = [];
        const uploadDir = path.join(process.cwd(), "uploads", "doccenter");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        for (const file of files) {
          if (file instanceof File) {
              const timestamp = Date.now();
              const sanitizedName = file.name.replace(/\s+/g, "_");
              const uniqueName = `${timestamp}-${sanitizedName}`;
              const filePath = path.join(uploadDir, uniqueName);
              await Bun.write(filePath, file);
              newFilePaths.push(`/uploads/doccenter/${uniqueName}`);
          }
        }
        updateData.$push = { files: { $each: newFilePaths } };
      }
    } else {
      // Regular JSON update
      updateData = await c.req.json();
    }

    const existingDoc = await DocCenter.findById(id);
    if (!existingDoc) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Special Action: "done" - Clicked by user to resolve current reminder
    if (updateData.action === "done") {
      if (existingDoc.reminder && existingDoc.reminder.enabled) {
        const currentReminder = (existingDoc.reminder as any).toObject ? (existingDoc.reminder as any).toObject() : existingDoc.reminder;
        
        if (currentReminder.frequency === "once") {
          updateData.reminder = { ...currentReminder, enabled: false };
        } else {
          // Move to next occurrence
          const next = calculateNextOccurrence(currentReminder, currentReminder.nextOccurrence);
          updateData.reminder = { ...currentReminder, nextOccurrence: next, lastEmailSentDate: null };
        }
      }
    } else if (updateData.reminder) {
      // Manual reminder update
      const currentReminder = existingDoc.reminder ? (existingDoc.reminder as any).toObject ? (existingDoc.reminder as any).toObject() : existingDoc.reminder : {};
      const mergedReminder = { 
        frequency: "once", 
        startDate: new Date(), 
        ...currentReminder, 
        ...updateData.reminder 
      };
      
      if (mergedReminder.enabled) {
        mergedReminder.nextOccurrence = calculateNextOccurrence(mergedReminder);
      }
      updateData.reminder = mergedReminder;
    }

    // Separate $push from $set so MongoDB handles both operators correctly
    const { $push, action, ...setFields } = updateData;
    const mongoUpdate: any = {};
    if (Object.keys(setFields).length > 0) mongoUpdate.$set = setFields;
    if ($push) mongoUpdate.$push = $push;

    const updatedDoc = await DocCenter.findByIdAndUpdate(
      id,
      mongoUpdate,
      { returnDocument: 'after', runValidators: true }
    );

    return c.json({
      message: updateData.action === "done" ? "Reminder marked as done" : "Document updated successfully",
      data: updatedDoc
    });
  } catch (error: any) {
    console.error("Patch error:", error);
    return c.json({ error: error.message || "Failed to update document" }, 500);
  }
};

export const deleteDocument = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const doc = await DocCenter.findById(id);
    
    if (!doc) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Delete static files from disk
    if (doc.files && doc.files.length > 0) {
      for (const fileRelativePath of doc.files) {
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

    await DocCenter.findByIdAndDelete(id);

    return c.json({ message: "Document and associated files deleted successfully" });
  } catch (error: any) {
    console.error("Delete error:", error);
    return c.json({ error: error.message || "Failed to delete document" }, 500);
  }
};

export const deleteDocumentFiles = async (c: Context) => {
  try {
    const { documentId, fileUrls } = await c.req.json<{ documentId: string, fileUrls: string[] }>();

    if (!documentId || !fileUrls || !Array.isArray(fileUrls)) {
      return c.json({ error: "documentId and an array of fileUrls are required" }, 400);
    }

    const doc = await DocCenter.findById(documentId);
    if (!doc) {
      return c.json({ error: "Document not found" }, 404);
    }

    const remainingFiles = doc.files.filter(f => !fileUrls.includes(f));
    const filesToDelete = doc.files.filter(f => fileUrls.includes(f));

    // Delete static files from disk
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

    doc.files = remainingFiles;
    await doc.save();

    return c.json({
      message: "Specified files deleted successfully",
      data: doc
    });
  } catch (error: any) {
    console.error("Delete files error:", error);
    return c.json({ error: error.message || "Failed to delete files" }, 500);
  }
};

const getReminderThreshold = (frequency: string): number => {
  switch (frequency) {
    case "daily": return parseInt(process.env.REMINDER_THRESHOLD_DAILY || "0");
    case "weekly": return parseInt(process.env.REMINDER_THRESHOLD_WEEKLY || "1");
    case "monthly": return parseInt(process.env.REMINDER_THRESHOLD_MONTHLY || "5");
    case "yearly": return parseInt(process.env.REMINDER_THRESHOLD_YEARLY || "15");
    case "once": return parseInt(process.env.REMINDER_THRESHOLD_ONCE || "5");
    case "custom": return parseInt(process.env.REMINDER_THRESHOLD_CUSTOM || "5");
    default: return parseInt(process.env.REMINDER_DAYS_THRESHOLD || "5");
  }
};

export const getUpcomingReminders = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    
    // Fetch all enabled reminders for the user
    const allEnabledReminders = await DocCenter.find({
      createdBy: user.id,
      "reminder.enabled": true,
      "reminder.nextOccurrence": { $exists: true }
    }).populate("createdBy", "name email");

    // Filter by their respective thresholds
    const upcomingReminders = allEnabledReminders.filter(doc => {
      if (!doc.reminder || !doc.reminder.nextOccurrence) return false;
      
      const threshold = getReminderThreshold(doc.reminder.frequency);
      const triggerDate = new Date(doc.reminder.nextOccurrence);
      triggerDate.setDate(triggerDate.getDate() - threshold);
      
      // It's upcoming if we are past the trigger date
      // We keep showing it until it's manually extended (even after nextOccurrence)
      return now >= triggerDate;
    });

    // Industry standard statistics
    const totalCount = upcomingReminders.length;
    
    // Group by document type
    const byType = upcomingReminders.reduce((acc: Record<string, number>, doc) => {
      const type = doc.documentType || "Other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Urgency based on nextOccurrence (not threshold)
    const urgency = {
      urgent: upcomingReminders.filter(r => {
        const diff = (r.reminder?.nextOccurrence?.getTime() || 0) - now.getTime();
        return diff <= (24 * 60 * 60 * 1000); // 24 hours
      }).length,
      upcoming: upcomingReminders.filter(r => {
        const diff = (r.reminder?.nextOccurrence?.getTime() || 0) - now.getTime();
        return diff > (24 * 60 * 60 * 1000);
      }).length
    };

    return c.json({
      summary: {
        totalCount,
        byType,
        urgency,
        thresholds: {
          daily: getReminderThreshold("daily"),
          weekly: getReminderThreshold("weekly"),
          monthly: getReminderThreshold("monthly"),
          yearly: getReminderThreshold("yearly"),
          once: getReminderThreshold("once"),
          custom: getReminderThreshold("custom")
        }
      },
      data: upcomingReminders
    });
  } catch (error: any) {
    console.error("Get upcoming reminders error:", error);
    return c.json({ error: error.message || "Failed to fetch upcoming reminders" }, 500);
  }
};
