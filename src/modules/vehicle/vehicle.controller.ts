import type { Context } from "hono";
import Vehicle from "./vehicle.model";

export const createVehicle = async (c: Context) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const newVehicle = new Vehicle({
      ...body,
      createdBy: user.id,
    });

    await newVehicle.save();

    return c.json({
      message: "Vehicle created successfully",
      data: newVehicle,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to create Vehicle" }, 500);
  }
};

export const getVehicles = async (c: Context) => {
  try {
    const vehicles = await Vehicle.find().populate("createdBy", "name email");
    return c.json({ data: vehicles });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getVehicleById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const vehicle = await Vehicle.findById(id).populate("createdBy", "name email");
    if (!vehicle) return c.json({ error: "Vehicle not found" }, 404);
    return c.json(vehicle);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateVehicle = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const updatedVehicle = await Vehicle.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedVehicle) return c.json({ error: "Vehicle not found" }, 404);

    return c.json({
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteVehicle = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const deletedVehicle = await Vehicle.findByIdAndDelete(id);
    if (!deletedVehicle) return c.json({ error: "Vehicle not found" }, 404);
    return c.json({ message: "Vehicle deleted successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
