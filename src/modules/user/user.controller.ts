import type { Context } from "hono";
import { User } from "../../modules/user/user.model.ts";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";
import { setCookie } from "hono/cookie";
import { decryptPassword, encryptPassword } from "../../utils/crypto.ts";
import mongoose, { Types } from "mongoose";
import { EmployeeId } from "./employeeId.model.ts";

const JWT_SECRET = process.env.JWT_SECRET as string;


// Login Types
interface LoginBody {
  email: string;
  password: string;
}


const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
};


//  check duplicate
const checkDuplicateUser = async (
  email?: string,
  uniqueId?: number,
  excludeId?: string
) => {
  const orConditions = [];

  if (email) orConditions.push({ email });
  if (uniqueId) orConditions.push({ uniqueId });

  if (orConditions.length === 0) return null;

  const query: any = {
    $or: orConditions,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await User.findOne(query);

  if (!existing) return null;

  if (email && existing.email === email) return "email";
  if (uniqueId && existing.uniqueId === uniqueId) return "uniqueId";

  return null;
};


// ✅ Register


export const register = async (c: Context) => {
  try {
    const body = await c.req.json();

    const {
      name,
      email,
      password,
      role,
      createdBy,
      employeeObjId,
      uniqueId,
      attendancePolicyId,
      payrollPolicyId,

      // 🔥 NEW FIELDS
      otherName,
      category,
      gender,
      fatherName,
      motherName,
      maritalStatus,
      spouseName,
      familyDetails,
      dob,
      bloodGroup,
      emergencyContact,
      reference,
      academicQualification,
      previousWorkExperience,
      interviewDate,
      competencyMet,
      designation,
      workingHours,
      aadharNo,
      pfNo,
      esiNo,
      doj,
      doe,
      permanentAddress,
      currentAddress,
      mobileNo,
      companyId

    } = body;

    // ✅ validation
    if (!name || !email || !password) {
      return c.json({ message: "All fields are required" }, 400);
    }

    // ✅ logged in user
    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // ✅ safe role
    const safeRole =
      role && ["admin", "hr", "user"].includes(role) ? role : "user";

    // ✅ duplicate check
    const duplicate = await checkDuplicateUser(email, uniqueId);

    if (duplicate === "email") {
      return c.json({ message: "Email already exists" }, 400);
    }

    if (duplicate === "uniqueId") {
      return c.json({ message: "Unique ID already exists" }, 400);
    }

    // ✅ encrypt password
    const encryptedPassword = await encryptPassword(password);

    // 🔥 ROLE BASED createdBy LOGIC (UNCHANGED)
    let finalCreatedBy;

    if (loggedInUser.role === "admin" && createdBy) {
      finalCreatedBy = createdBy;
    } else {
      finalCreatedBy = loggedInUser.id;
    }

    // 🔥 VALIDATE EMPLOYEE (UNCHANGED)
    let employeeRef: any = undefined;

    if (employeeObjId) {
      const employee = await EmployeeId.findById(employeeObjId);

      if (!employee) {
        return c.json({ message: "Invalid employee ID" }, 400);
      }

      employeeRef = employee._id;
    }

    // ✅ CREATE USER (ONLY FIELDS ADDED BELOW)
    const user = await User.create({
      name,
      email,
      password: encryptedPassword,
      role: safeRole,
      createdBy: finalCreatedBy,
      employeeObjId: employeeRef,
      uniqueId,

      attendancePolicyId,
      payrollPolicyId,

      // 🔥 NEW FIELDS SAVE
      otherName,
      category,
      gender,
      fatherName,
      motherName,
      maritalStatus,
      spouseName,
      familyDetails,
      dob,
      bloodGroup,
      emergencyContact,
      reference,
      academicQualification,
      previousWorkExperience,
      interviewDate,
      competencyMet,
      designation,
      workingHours,
      aadharNo,
      pfNo,
      esiNo,
      doj,
      doe,
      permanentAddress,
      currentAddress,
      mobileNo,
      companyId
    });

    return c.json(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        createdBy: user.createdBy,
        uniqueId: user.uniqueId,
        attendancePolicyId,
        payrollPolicyId
      },
      201
    );
  } catch (error) {
    console.error("Register Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};




// ---------------- GET ALL USERS ----------------

// ✅ Plain type (NOT Document)
type IUserPlain = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: "admin" | "hr" | "user";
  password: any; // encrypted object
  uniqueId: number;

  createdBy: Types.ObjectId;
  employeeObjId: Types.ObjectId;
  companyId?: Types.ObjectId;

  attendancePolicyId?: Types.ObjectId;
  payrollPolicyId?: Types.ObjectId;

  otherName?: string;
  category?: string;
  gender?: string;

  fatherName?: string;
  motherName?: string;
  maritalStatus?: string;
  spouseName?: string;

  familyDetails?: {
    name: string;
    relation: string;
    age?: number;
  }[];

  dob?: Date;
  bloodGroup?: string;

  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };

  reference?: string;

  academicQualification?: {
    degree?: string;
    institute?: string;
    year?: string;
  }[];

  previousWorkExperience?: {
    company?: string;
    role?: string;
    years?: string;
  }[];

  interviewDate?: Date;
  competencyMet?: boolean;

  designation?: string;
  workingHours?: number;

  aadharNo?: string;
  pfNo?: string;
  esiNo?: string;
  doj?: Date;
  doe?: Date;

  permanentAddress?: string;
  currentAddress?: string;

  mobileNo?: string;

  __v?: number;
};

// ✅ Response type
type IUserResponse = Omit<IUserPlain, "password"> & {
  password?: string | null; // optional (safer)
};

export const getUsers = async (c: Context) => {
  try {
    // ✅ query params
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const companyId = c.req.query("companyId");

    const skip = (page - 1) * limit;

    // ✅ filter
    const filter: any = {
      role: { $ne: "admin" },
    };

    // ✅ company filter
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    // ✅ search filter
    if (search) {
      const orConditions: any[] = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];

      // 👉 if search is a number, match uniqueId
      if (!isNaN(Number(search))) {
        orConditions.push({ uniqueId: Number(search) });
      }

      filter.$or = orConditions;
    }

    // ✅ fetch users (lean = fast + plain object)
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IUserPlain[]>(); // ✅ array type

    const totalUsers = await User.countDocuments(filter);

    // ✅ map response
    const result: IUserResponse[] = users?.map((u) => {
      let decryptedPassword: string | null = null;

      // ⚠️ optional (not recommended in real apps)
      try {
        decryptedPassword = decryptPassword(u.password);
      } catch {
        decryptedPassword = null;
      }

      return {
        ...u,
        password: decryptedPassword, // 👉 remove this if you want secure API
      };
    });

    return c.json(
      {
        success: true,
        data: result,
        pagination: {
          total: totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
        },
      },
      200
    );
  } catch (error) {
    console.error("Get Users Error:", error);
    return c.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      500
    );
  }
};

// ---------------- GET SINGLE USER ----------------
export const getUserById = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const user = await User.findById(id).select("-password");

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(user, 200);
  } catch (error) {
    console.error("Get User Error:", error);
    return c.json({ message: "Invalid User ID" }, 400);
  }
};

// ---------------- UPDATE USER ----------------

export const updateUser = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, any>>();

    // 👉 Check user exist
    const user = await User.findById(id);
    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // 👉 Get schema fields dynamically (ALL fields incl new ones)
    const allowedFields = Object.keys(User.schema.paths);

    // ❌ restricted fields
    const restrictedFields = ["_id", "__v", "createdAt", "updatedAt"];

    const updatableFields = allowedFields.filter(
      (field) => !restrictedFields.includes(field)
    );

    // ---------------- VALIDATIONS ----------------

    // 👉 Email validation
    if (body.email !== undefined) {
      const emailRegex = /^\S+@\S+\.\S+$/;

      if (typeof body.email !== "string" || !emailRegex.test(body.email)) {
        return c.json({ message: "Invalid email format" }, 400);
      }

      const duplicate = await checkDuplicateUser(
        body.email,
        body.uniqueId ?? user.uniqueId,
        id
      );

      if (duplicate === "email") {
        return c.json({ message: "Email already exists" }, 400);
      }

      if (duplicate === "uniqueId") {
        return c.json({ message: "Unique ID already exists" }, 400);
      }
    }

    // 👉 Role validation
    if (body.role !== undefined) {
      if (!["admin", "hr", "user"].includes(body.role)) {
        return c.json({ message: "Invalid role" }, 400);
      }
    }

    // 👉 UniqueId validation (IMPORTANT 🔥)
    if (body.uniqueId !== undefined) {
      const duplicate = await checkDuplicateUser(
        body.email ?? user.email,
        body.uniqueId,
        id
      );

      if (duplicate === "uniqueId") {
        return c.json({ message: "Unique ID already exists" }, 400);
      }
    }

    // ---------------- PASSWORD FIX 🔥 ----------------

    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 6) {
        return c.json(
          { message: "Password must be at least 6 characters" },
          400
        );
      }

      const encrypted = await encryptPassword(body.password);

      user.password = encrypted;

      // 🔥 force mongoose detect change
      user.markModified("password");

      delete body.password;
    }

    // ---------------- DYNAMIC UPDATE ----------------

    Object.keys(body).forEach((key) => {
      if (updatableFields.includes(key)) {
        user.set(key, body[key]);
      }
    });

    await user.save();

    // ---------------- RESPONSE ----------------

    let decryptedPassword: string | null = null;

    try {
      if (user.password) {
        decryptedPassword = decryptPassword(user.password);
      }
    } catch (err) {
      console.error("Decrypt failed");
    }

    return c.json(
      {
        message: "User updated successfully",
        user: {
          ...user.toObject(),
          password: decryptedPassword // ⚠️ only for testing
        },
      },
      200
    );
  } catch (error) {
    console.error("Update Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};



// ---------------- DELETE USER ----------------
export const deleteUser = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(
      { message: "User deleted successfully" },
      200
    );
  } catch (error) {
    console.error("Delete Error:", error);
    return c.json({ message: "Invalid User ID" }, 400);
  }
};









// ✅ Login

export const login = async (c: Context) => {
  const body = await c.req.json<LoginBody>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json(
      { message: "Email and password required" },
      400
    );
  }

  const user = await User.findOne({ email }).exec();

  if (!user) {
    return c.json(
      { message: "User not found" },
      404
    );
  }

  const decryptedPassword = decryptPassword(user.password);

  const isMatch = password === decryptedPassword;

  if (!isMatch) {
    return c.json(
      { message: "Invalid credentials" },
      401
    );
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    } as JwtPayload,
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  return c.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
};
