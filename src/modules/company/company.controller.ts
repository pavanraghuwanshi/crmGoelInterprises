// controllers/company.controller.ts
import type { Context } from "hono";
import Company from "./company.model.ts";


//  create company controller
export const createCompany = async (c: Context) => {
  try {
    const body = await c.req.json();

    const { name, email,  prefix, phone, address, gstNumber } = body;

    if (!name) {
      return c.json({ message: "Company name is required" }, 400);
    }

    const company = await Company.create({
      name,
      email,
      phone,
      address,
      prefix,
      gstNumber,
      createdBy: c.get("user")?._id, // if auth middleware
    });

    return c.json(
      {
        success: true,
        data: company,
      },
      201
    );
  } catch (error) {
    console.error("Create Company Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};


// get company controller
export const getCompanies = async (c: Context) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const companies = await Company.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Company.countDocuments(filter);

    return c.json(
      {
        success: true,
        data: companies,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      200
    );
  } catch (error) {
    console.error("Get Companies Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};

// get company by Dropdown controller

// ✅ Company Dropdown API
export const getCompanyDropdown = async (c: Context) => {
  try {
    const search = c.req.query("search") || "";

    // filter for search by name or prefix
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { prefix: { $regex: search, $options: "i" } },
      ];
    }

    const companies = await Company.find(filter)
      .select("name prefix") // only send required fields
      .sort({ name: 1 })
      .lean();

    return c.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Get Company Dropdown Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};


//  update company controller 

export const updateCompany = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

        const company = await Company.findOneAndUpdate(
        { _id: id },
        body,
        { new: true }
        ).lean();

        if (!company) {
        return c.json({ message: "Company not found" }, 404);
        }

    if (!company) {
      return c.json({ message: "Company not found" }, 404);
    }

    return c.json({ success: true, data: company }, 200);
  } catch (error) {
    console.error("Update Company Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};



//  Delete company controller 

export const deleteCompany = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const company = await Company.findByIdAndDelete(id);

    if (!company) {
      return c.json({ message: "Company not found" }, 404);
    }

    return c.json(
      {
        success: true,
        message: "Company deleted successfully",
      },
      200
    );
  } catch (error) {
    console.error("Delete Company Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};