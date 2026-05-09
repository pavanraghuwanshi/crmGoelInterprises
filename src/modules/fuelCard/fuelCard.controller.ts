import type { Context } from "hono";
import FuelCard from "./fuelCard.model";

export const createFuelCard = async (c: Context) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    
    const newFuelCard = new FuelCard({
      ...body,
      createdBy: user.id,
    });

    await newFuelCard.save();

    return c.json({
      message: "Fuel Card created successfully",
      data: newFuelCard,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to create Fuel Card" }, 500);
  }
};

export const getFuelCards = async (c: Context) => {
  try {
    const cards = await FuelCard.find().populate("createdBy", "name email");
    return c.json({ data: cards });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getFuelCardById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const card = await FuelCard.findById(id).populate("createdBy", "name email");
    if (!card) return c.json({ error: "Fuel Card not found" }, 404);
    return c.json(card);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateFuelCard = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const updatedCard = await FuelCard.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCard) return c.json({ error: "Fuel Card not found" }, 404);

    return c.json({
      message: "Fuel Card updated successfully",
      data: updatedCard,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteFuelCard = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const deletedCard = await FuelCard.findByIdAndDelete(id);
    if (!deletedCard) return c.json({ error: "Fuel Card not found" }, 404);
    return c.json({ message: "Fuel Card deleted successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
