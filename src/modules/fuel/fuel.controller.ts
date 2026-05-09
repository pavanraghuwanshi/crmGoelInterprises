import type { Context } from "hono";
import Fuel from "./fuel.model";

export const createFuelEntry = async (c: Context) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    
    const newFuelEntry = new Fuel({
      ...body,
      createdBy: user.id,
    });

    await newFuelEntry.save();

    return c.json({
      message: "Fuel entry created successfully",
      data: newFuelEntry,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to create fuel entry" }, 500);
  }
};

export const getFuelEntries = async (c: Context) => {
  try {
    const entries = await Fuel.find()
      .populate("vehicleId", "vehicleNo vehicleCode")
      .populate("createdBy", "name email");
    return c.json({ data: entries });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getFuelEntryById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const entry = await Fuel.findById(id)
      .populate("vehicleId", "vehicleNo vehicleCode")
      .populate("createdBy", "name email");
    if (!entry) return c.json({ error: "Fuel entry not found" }, 404);
    return c.json(entry);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateFuelEntry = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const updatedEntry = await Fuel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedEntry) return c.json({ error: "Fuel entry not found" }, 404);

    return c.json({
      message: "Fuel entry updated successfully",
      data: updatedEntry,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteFuelEntry = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const deletedEntry = await Fuel.findByIdAndDelete(id);
    if (!deletedEntry) return c.json({ error: "Fuel entry not found" }, 404);
    return c.json({ message: "Fuel entry deleted successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
