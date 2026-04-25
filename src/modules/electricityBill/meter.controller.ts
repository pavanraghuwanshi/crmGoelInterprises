import type { Context } from "hono";
import { ElectricityMeter } from "./meter.model";

export const createMeter = async (c: Context) => {
  try {
    const body = await c.req.json();
    const newMeter = new ElectricityMeter(body);
    await newMeter.save();
    return c.json({
      message: "Electricity Meter created successfully",
      data: newMeter,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to create meter" }, 500);
  }
};

export const getMeters = async (c: Context) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const sortBy = c.req.query("sortBy") || "createdAt";
    const sortOrder = c.req.query("sortOrder") || "desc";

    const skip = (page - 1) * limit;
    const filter: any = {};
    if (search) {
      filter.$or = [
        { meterNumber: { $regex: search, $options: "i" } },
        { meterName: { $regex: search, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [meters, total] = await Promise.all([
      ElectricityMeter.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      ElectricityMeter.countDocuments(filter)
    ]);

    return c.json({
      data: meters,
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

export const getMeterById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const meter = await ElectricityMeter.findById(id);
    if (!meter) return c.json({ error: "Meter not found" }, 404);
    return c.json(meter);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateMeter = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updatedMeter = await ElectricityMeter.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!updatedMeter) return c.json({ error: "Meter not found" }, 404);
    return c.json({
      message: "Meter updated successfully",
      data: updatedMeter,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteMeter = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const deletedMeter = await ElectricityMeter.findByIdAndDelete(id);
    if (!deletedMeter) return c.json({ error: "Meter not found" }, 404);
    return c.json({ message: "Meter deleted successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
