import type { Context } from "hono";
import FuelCard from "./fuelCard.model";
import Fuel from "../fuel/fuel.model";

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
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const sortBy = c.req.query("sortBy") || "createdAt";
    const sortOrder = c.req.query("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [cards, total] = await Promise.all([
      FuelCard.find()
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email"),
      FuelCard.countDocuments()
    ]);

    return c.json({
      data: cards,
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

export const getFuelCardStats = async (c: Context) => {
  try {
    const [totalAddedResult, totalExpendedResult] = await Promise.all([
      FuelCard.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Fuel.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ])
    ]);

    const totalAdded = totalAddedResult[0]?.total || 0;
    const totalExpended = totalExpendedResult[0]?.total || 0;
    const remaining = totalAdded - totalExpended;

    return c.json({
      totalAdded,
      totalExpended,
      remaining
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return c.json({ error: error.message }, 500);
  }
};
