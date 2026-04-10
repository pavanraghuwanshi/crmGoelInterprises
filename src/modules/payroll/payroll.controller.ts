import type { Context } from "hono";
import { PayrollPolicy } from "./payrollPolicy.model";
import type { JwtPayload } from "../auth/auth.type";



export const createPayrollPolicy = async (c: Context) => {
  try {
    const user = c.get("user") as JwtPayload;

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const body = await c.req.json();

    const {
      name,
      heads = {},
      sundayPolicyActive = true,
    } = body;

    // ✅ Validate name
    if (!name || typeof name !== "string") {
      return c.json({ message: "Policy name is required" }, 400);
    }

    // ✅ Allowed heads (control kya save ho sakta hai DB me)
    const allowedHeads = [
      "hra",
      "conveyance",
      "esiEmployee",
      "esiEmployer",
      "pfEmployee",
      "pfEmployer",
      "lwfEmployee",
      "lwfEmployer",
    ];

    // ✅ Validate & format heads
    const formattedHeads: any = {};

    for (const key of Object.keys(heads)) {
      if (!allowedHeads.includes(key)) continue;

      const value = heads[key];   // ✅ yaha change

      if (typeof value !== "number" || value < 0) {
        return c.json({ message: `Invalid value for ${key}` }, 400);
      }

      formattedHeads[key] = value;  // ✅ direct number save
    }

    // ✅ Optional: prevent empty policy
    if (Object.keys(formattedHeads).length === 0) {
      return c.json(
        { message: "At least one head is required" },
        400
      );
    }

    // ✅ Create policy
    const policy = await PayrollPolicy.create({
      name: name.trim(),
      heads: formattedHeads,
      sundayPolicyActive,
      createdBy: user.id,
    });

    return c.json(
      {
        message: "Payroll policy created successfully",
        policy,
      },
      201
    );
  } catch (err: any) {
    return c.json(
      {
        message: err.message || "Internal Server Error",
      },
      500
    );
  }
};

export const getPayrollPolicies = async (c: Context) => {
  try {
    const user = c.get("user") as JwtPayload;
    if (!user) return c.json({ message: "Unauthorized" }, 401);

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";

    const skip = (page - 1) * limit;

    const filter: any = {
      createdBy: user.id,
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [policies, total] = await Promise.all([
      PayrollPolicy.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      PayrollPolicy.countDocuments(filter),
    ]);

    return c.json({
      data: policies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};

export const getPayrollPolicyById = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const policy = await PayrollPolicy.findById(id);

    if (!policy) {
      return c.json({ message: "Policy not found" }, 404);
    }

    return c.json({ policy });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};


export const updatePayrollPolicy = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const updateData: any = {};

    // ✅ Update name
    if (body.name && typeof body.name === "string") {
      updateData.name = body.name.trim();
    }

    // ✅ Allowed heads
    const allowedHeads = [
      "hra",
      "conveyance",
      "esiEmployee",
      "esiEmployer",
      "pfEmployee",
      "pfEmployer",
      "lwfEmployee",
      "lwfEmployer",
    ];

    // ✅ Update heads (ONLY NUMBER %)
    if (body.heads && typeof body.heads === "object") {
      const formattedHeads: any = {};

      for (const key of Object.keys(body.heads)) {
        if (!allowedHeads.includes(key)) continue;

        const value = body.heads[key];  // 🔥 change here

        if (typeof value !== "number" || value < 0) {
          return c.json(
            { message: `Invalid value for ${key}` },
            400
          );
        }

        formattedHeads[key] = value; // 🔥 direct number store
      }

      // ⚠️ Only update if valid heads provided
      if (Object.keys(formattedHeads).length > 0) {
        updateData.heads = formattedHeads;
      }
    }

    // ✅ Update sunday policy
    if (typeof body.sundayPolicyActive === "boolean") {
      updateData.sundayPolicyActive = body.sundayPolicyActive;
    }

    // ❗ Prevent empty update
    if (Object.keys(updateData).length === 0) {
      return c.json(
        { message: "No valid fields provided to update" },
        400
      );
    }

    // ✅ Update in DB
    const policy = await PayrollPolicy.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!policy) {
      return c.json({ message: "Policy not found" }, 404);
    }

    return c.json({
      message: "Payroll policy updated successfully",
      policy,
    });
  } catch (err: any) {
    return c.json(
      { message: err.message || "Internal Server Error" },
      500
    );
  }
};


export const deletePayrollPolicy = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const policy = await PayrollPolicy.findByIdAndDelete(id);

    if (!policy) {
      return c.json({ message: "Policy not found" }, 404);
    }

    return c.json({ message: "Deleted successfully" });
  } catch (err: any) {
    return c.json({ message: err.message }, 500);
  }
};


