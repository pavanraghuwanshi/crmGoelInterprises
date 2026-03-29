import type { Context } from "hono";
import { User } from "../../modules/user/user.model.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";
import { setCookie } from "hono/cookie";
import { decryptPassword, encryptPassword } from "../../utils/crypto.ts";
import { verifyToken } from "../../middleware/auth.middleware.ts";
import mongoose from "mongoose";
import { Types } from "mongoose";
import { EmployeeId } from "./employeeId.model.ts";

const JWT_SECRET = process.env.JWT_SECRET as string;

// ✅ Request Types
interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "hr" | "user";
  createdBy:Types.ObjectId;
  employeeObjId:Types.ObjectId;
  uniqueId:number;
}


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
    const body = await c.req.json<RegisterBody>();
    const {
      name,
      email,
      password,
      role,
      createdBy,
      employeeObjId,
      uniqueId,
    } = body;

    if (!name || !email || !password) {
      return c.json({ message: "All fields are required" }, 400);
    }

    // ✅ GET USER FROM CONTEXT (FIX)
    const loggedInUser = c.get("user");


    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // ✅ safe role
    const safeRole =
      role && ["admin", "hr", "user"].includes(role) ? role : "user";

    // 👉 check existing user
      const duplicate = await checkDuplicateUser(body.email, body.uniqueId);

      if (duplicate === "email") {
        return c.json({ message: "Email already exists" }, 400);
      }
      if (duplicate === "uniqueId") {
        return c.json({ message: "Unique ID already exists" }, 400);
      }

    // 👉 encrypt password
    const encryptedPassword = await encryptPassword(password);

    // 🔥 ROLE BASED createdBy LOGIC
    let finalCreatedBy;

    if (loggedInUser.role === "admin" && createdBy) {
      finalCreatedBy = createdBy;
    } else {
      finalCreatedBy = loggedInUser.id;
    }

    // 🔥 VALIDATE EMPLOYEE
    let employeeRef: any = undefined;

    if (employeeObjId) {
      const employee = await EmployeeId.findById(employeeObjId);

      if (!employee) {
        return c.json({ message: "Invalid employee ID" }, 400);
      }

      employeeRef = employee._id;
    }

    // 👉 create user
    const user = await User.create({
      name,
      email,
      password: encryptedPassword,
      role: safeRole,
      createdBy: finalCreatedBy,
      employeeObjId: employeeRef,
      uniqueId: uniqueId,
    });

    return c.json(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        createdBy: user.createdBy,
        uniqueId:uniqueId
      },
      201
    );
  } catch (error) {
    console.error("Register Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};


// ---------------- GET ALL USERS ----------------
export const getUsers = async (c: Context) => {
  try {
    // 👉 Query params
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");

    const skip = (page - 1) * limit;

    // 👉 Filter (exclude admin)
    const filter = { role: { $ne: "admin" } };

    // 👉 Get users
    const users = await User.find(filter)
      .select("email role password uniqueId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // 👉 Total count (for pagination)
    const totalUsers = await User.countDocuments(filter);

    // 👉 Format response
    const result = users.map((u) => {
      let decryptedPassword = null;

      try {
        decryptedPassword = decryptPassword(u.password);
      } catch (err) {
        console.error("Decrypt failed for:", u.email);
      }

      return {
        id: u._id,
        email: u.email,
        role: u.role,
        password: decryptedPassword,
        uniqueId:u.uniqueId
      };
    });

    return c.json(
      {
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
    return c.json({ message: "Internal Server Error" }, 500);
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

    // 👉 Get schema fields dynamically
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

      const duplicate = await checkDuplicateUser(body.email, body.uniqueId, id);

      if (duplicate === "email") {
        return c.json({ message: "Email already exists" }, 400);
      }
      if (duplicate === "uniqueId") {
        return c.json({ message: "Unique ID already exists" }, 400);
      }

    // 👉 Role validation
    if (body.role !== undefined) {
      if (!["admin", "hr", "user"].includes(body.role)) {
        return c.json({ message: "Invalid role" }, 400);
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

      const encrypted = encryptPassword(body.password);

      user.password = encrypted;

      // 🔥 IMPORTANT (force mongoose to detect change)
      user.markModified("password");

      // ❌ remove so it doesn't override again
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
          password: decryptedPassword, // 👈 for testing only
        },
      },
      200
    );
  }
 }catch (error) {
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



// ✅ Login api with cookies set from backend

// export const login = async (c: Context) => {
//   const body = await c.req.json<LoginBody>();
//   const { email, password } = body;

//   if (!email || !password) {
//     return c.json({ message: "Email and password required" }, 400);
//   }

//   const user = await User.findOne({ email }).exec();

//   if (!user) {
//     return c.json({ message: "User not found" }, 404);
//   }

//   const isMatch = await bcrypt.compare(password, user.password);

//   if (!isMatch) {
//     return c.json({ message: "Invalid credentials" }, 401);
//   }

//   const token = jwt.sign(
//     {
//       id: user._id.toString(),
//       role: user.role,
//     } as JwtPayload,
//     getJwtSecret(),
//     { expiresIn: "7d" }
//   );

//   // ✅ 🍪 Set Cookie
//   // setCookie(c, "token", token, {
//   //   httpOnly: true,        // 🔒 cannot access via JS (secure)
//   //   secure: true,          // HTTPS only (production)
//   //   sameSite: "Strict",    // CSRF protection
//   //   maxAge: 60 * 60 * 24 * 7, // 7 days
//   //   path: "/",
//   // });
//     setCookie(c, "token", token, {
//     httpOnly: true,
//     secure: true,      // Render (HTTPS)
//     sameSite: "None",  // cross-origin ke liye
//     path: "/",
//   });

//   return c.json({
//     message: "Login successful",
//     user: {
//       id: user._id,
//       email: user.email,
//       role: user.role,
//     },
//   });
// };