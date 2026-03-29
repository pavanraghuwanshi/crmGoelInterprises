import { EmployeeId } from "./employeeId.model";
import type { Context } from "hono";


// ✅ Request Types
interface CreateEmployeeIdBody {
  prefix : string;
  remark: string;

}






















export const generateEmployeeId = async (prefix: string) => {
  // last record find karo
  const last = await EmployeeId.findOne({
    employeeId: new RegExp(`^${prefix}-`)
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

if (last) {
const lastNumber = parseInt(last.employeeId.split("-")[1] ?? "0", 10);
  nextNumber = lastNumber + 1;
}

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};




export const createEmployeeId = async (c: Context) => {
  try {
    const body = await c.req.json<CreateEmployeeIdBody>();
    const { prefix, remark } = body;

    if (!prefix) {
      return c.json({ message: "Prefix required" }, 400);
    }

    const employeeId = await generateEmployeeId(prefix);

    const data = await EmployeeId.create({
      employeeId,
      remark,
    });

    return c.json(data, 201);
  } catch (error: any) {
    return c.json(
      { message: error.message || "Internal Server Error" },
      500
    );
  }
};


export const getEmployeeIds = async (c: Context) => {
  try {
    const data = await EmployeeId.find().sort({ createdAt: -1 });

    return c.json(data, 200);
  } catch (error: any) {
    return c.json(
      { message: error.message || "Failed to fetch employee IDs" },
      500
    );
  }
};

export const getEmployeeIdById = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const data = await EmployeeId.findById(id);

    if (!data) {
      return c.json({ message: "Employee ID not found" }, 404);
    }

    return c.json(data, 200);
  } catch (error: any) {
    return c.json(
      { message: error.message || "Error fetching employee ID" },
      500
    );
  }
};


export const updateEmployeeId = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{ remark?: string }>();

    const data = await EmployeeId.findByIdAndUpdate(
      id,
      {
        $set: body,
      },
      { new: true }
    );

    if (!data) {
      return c.json({ message: "Employee ID not found" }, 404);
    }

    return c.json(data, 200);
  } catch (error: any) {
    return c.json(
      { message: error.message || "Update failed" },
      500
    );
  }
};


export const deleteEmployeeId = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const data = await EmployeeId.findByIdAndDelete(id);

    if (!data) {
      return c.json({ message: "Employee ID not found" }, 404);
    }

    return c.json({ message: "Employee ID deleted successfully" }, 200);
  } catch (error: any) {
    return c.json(
      { message: error.message || "Delete failed" },
      500
    );
  }
};