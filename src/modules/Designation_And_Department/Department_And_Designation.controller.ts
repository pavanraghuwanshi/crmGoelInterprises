import type { Context } from "hono";
import { Designation } from "./Designation.model";
import { Department } from "./Department.model";




//  Department Controller
export const createDepartment = async (c: Context) => {
  try {
    const { name, companyId } = await c.req.json();

    if (!name) {
      return c.json({ message: "Name is required" }, 400);
    }

    const dept = await Department.create({ name, companyId });

    return c.json({ success: true, data: dept });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};



export const getDepartments = async (c: Context) => {
  try {
    const data = await Department.find().sort({ createdAt: -1 });

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};


export const updateDepartment = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const updated = await Department.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!updated) {
      return c.json({ message: "Department not found" }, 404);
    }

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};



export const deleteDepartment = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const deleted = await Department.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deleted) {
      return c.json({ message: "Department not found" }, 404);
    }

    return c.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};








//  Designation Controller

export const createDesignation = async (c: Context) => {
  try {
    const { name, departmentId } = await c.req.json();

    if (!name || !departmentId) {
      return c.json({ message: "name & departmentId required" }, 400);
    }

    const desg = await Designation.create({ name, departmentId });

    return c.json({ success: true, data: desg });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};

export const getDesignations = async (c: Context) => {
  try {
    const data = await Designation.find()
      .populate("departmentId", "name")
      .sort({ createdAt: -1 });

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};


export const updateDesignation = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const updated = await Designation.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!updated) {
      return c.json({ message: "Designation not found" }, 404);
    }

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};


export const deleteDesignation = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const deleted = await Designation.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deleted) {
      return c.json({ message: "Designation not found" }, 404);
    }

    return c.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};