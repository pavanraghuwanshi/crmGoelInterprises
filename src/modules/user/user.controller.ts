import type { Context } from "hono";
import * as XLSX from "xlsx";
import { User } from "../../modules/user/user.model.ts";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";
import { setCookie } from "hono/cookie";
import { decryptPassword, encryptPassword } from "../../utils/crypto.ts";
import mongoose, { Types } from "mongoose";
import { EmployeeId } from "./employeeId.model.ts";
import { saveFile } from "../../utils/saveFile.ts";
import { DeletedUser } from "./deleteUser.model.ts";

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
    const formData = await c.req.formData();
    const body = Object.fromEntries(formData.entries());

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
      department,
      designation,
      designationId,
      departmentId,
      workingHours,
      aadharNo,
      pfNo,
      esiNo,
      doj,
      doe,
      permanentAddress,
      currentAddress,
      mobileNo,
      companyId,

      alias,
      contactPerson,
      phoneNumber,
      relation,
      familyMembers,
      referredBy,
      passingYear,
      notes
    } = body as any;

    // 🔥 FILES
    const profileImageFile = formData.get("profileImage") as File | null;
    const otherDocsFiles = formData.getAll("otherDocuments") as File[];
    const otherDocsTitles = formData.getAll("otherDocumentsTitle") as string[];

    let profileImage = "";
    let otherDocuments: { title: string; file: string }[] = [];

    // ✅ Basic Validation
    if (!name?.toString().trim()) {
      return c.json({ message: "Name is required" }, 400);
    }

    // ✅ Email Validation (OPTIONAL)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toString())) {
        return c.json({ message: "Invalid email format" }, 400);
      }
    }

    // ✅ Password Validation (OPTIONAL)
    if (password && password.toString().length < 6) {
      return c.json(
        { message: "Password must be at least 6 characters" },
        400
      );
    }

    // ✅ Mobile Validation
    if (mobileNo && !/^\d{10}$/.test(mobileNo.toString())) {
      return c.json({ message: "Mobile number must be 10 digits" }, 400);
    }

    // ✅ Aadhar Validation
    if (aadharNo && !/^\d{12}$/.test(aadharNo.toString())) {
      return c.json({ message: "Aadhar number must be 12 digits" }, 400);
    }

    // 🔥 Profile Image Save
    if (profileImageFile && profileImageFile.size > 0) {
      profileImage = await saveFile(profileImageFile, "profile-images");
    }

    // 🔥 Other Documents Save with Title
    if (otherDocsFiles.length > 0) {
      for (let i = 0; i < otherDocsFiles.length; i++) {
        const file = otherDocsFiles[i];
        if (!file) continue;

        const title = otherDocsTitles[i] || `Document ${i + 1}`;

        if (file.size > 0) {
          const filePath = await saveFile(file, "documents");

          otherDocuments.push({
            title: title.toString(),
            file: filePath
          });
        }
      }
    }

    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const safeRole =
      role && ["admin", "hr", "user"].includes(role.toString())
        ? role
        : "user";

    // ✅ Duplicate check (safe)
    const duplicate = await checkDuplicateUser(
      email || undefined,
      uniqueId
    );

    if (duplicate === "email") {
      return c.json({ message: "Email already exists" }, 400);
    }

    if (duplicate === "uniqueId") {
      return c.json({ message: "Unique ID already exists" }, 400);
    }

    // ✅ Encrypt Password (OPTIONAL)
    let encryptedPassword = undefined;
    if (password) {
      encryptedPassword = await encryptPassword(password);
    }

    let finalCreatedBy;

    if (loggedInUser.role === "admin" && createdBy) {
      finalCreatedBy = createdBy;
    } else {
      finalCreatedBy = loggedInUser.id;
    }

    let employeeRef: any = undefined;

    if (employeeObjId) {
      const employee = await EmployeeId.findById(employeeObjId);

      if (!employee) {
        return c.json({ message: "Invalid employee ID" }, 400);
      }

      employeeRef = employee._id;
    }

    const user = await User.create({
      name,
      email: email || undefined,
      password: encryptedPassword,
      role: safeRole,
      createdBy: finalCreatedBy,
      employeeObjId: employeeRef,
      uniqueId,
      attendancePolicyId,
      payrollPolicyId,

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
      department,
      workingHours,
      aadharNo,
      pfNo,
      esiNo,
      doj,
      doe,
      permanentAddress,
      currentAddress,
      mobileNo,
      companyId,

      profileImage,
      alias,
      contactPerson,
      phoneNumber,
      relation,
      familyMembers,
      referredBy,
      passingYear,
      otherDocuments,
      notes,
      designationId,
      departmentId,
    });

    return c.json(
      {
        message: "User registered successfully",
        data: user
      },
      201
    );
  } catch (error: any) {
    console.error("Register Error:", error);

    if (error?.name === "ValidationError") {
      return c.json({ message: error.message }, 400);
    }

    if (error?.code === 11000) {
      return c.json(
        { message: "Duplicate value found. Email or Unique ID exists." },
        400
      );
    }

    return c.json(
      {
        message: error?.message || "Something went wrong"
      },
      500
    );
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
  department?: string;
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
    const gender = c.req.query("gender");
    const designationId = c.req.query("designationId");
    const departmentId = c.req.query("departmentId");

    const skip = (page - 1) * limit;

    // ✅ filter
    const filter: any = {
      role: { $ne: "admin" },
    };

    // ✅ company filter
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    // ✅ designation filter
    if (designationId && mongoose.Types.ObjectId.isValid(designationId)) {
      filter.designationId = new mongoose.Types.ObjectId(designationId);
    }

    // ✅ department filter
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      filter.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    if (gender) {
      filter.gender = gender.toLowerCase();
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

        // 👉 search by employee code from populated ref
      const employeeMatches = await EmployeeId.find({
        employeeId: { $regex: search, $options: "i" }
      }).select("_id");

      if (employeeMatches.length > 0) {
        orConditions.push({
          employeeObjId: {
            $in: employeeMatches.map((e) => e._id)
          }
        });
      }

    }

    // ✅ fetch users (lean = fast + plain object)
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .populate("payrollPolicyId", "name")
      .populate("attendancePolicyId", "name")
      .populate("employeeObjId", "employeeId")
      .populate("companyId", "name")
      .populate("designationId", "name")
      .populate("departmentId", "name")
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

    const user = await User.findById(id)
      .select("-password")
      .populate({ path: "employeeObjId", select: "employeeId" })
      .populate({ path: "attendancePolicyId", select: "name" })
      .populate({ path: "payrollPolicyId", select: "name" })
      .populate({ path: "companyId", select: "name" })
      .populate({ path: "designationId", select: "name" })
      .populate({ path: "departmentId", select: "name" });
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

    // 🔥 formData (same as register)
    const formData = await c.req.formData();
    const body = Object.fromEntries(formData.entries());

    const user = await User.findById(id);
    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // ---------------- HELPERS ----------------
    const toNumber = (val: any): number | undefined => {
      if (val === undefined || val === null || val === "") return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    };

    // ---------------- ALLOWED FIELDS ----------------
    const allowedFields = Object.keys(User.schema.paths);
    const restrictedFields = ["_id", "__v", "createdAt", "updatedAt"];
    const updatableFields = allowedFields.filter(
      (f) => !restrictedFields.includes(f)
    );

    // ---------------- VALIDATIONS ----------------

    // ✅ Email
    if (body.email !== undefined) {
      const email = body.email.toString().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return c.json({ message: "Invalid email format" }, 400);
      }

      const uniqueId =
        body.uniqueId !== undefined
          ? toNumber(body.uniqueId)
          : user.uniqueId;

      if (body.uniqueId !== undefined && uniqueId === undefined) {
        return c.json({ message: "Unique ID must be a number" }, 400);
      }

      const duplicate = await checkDuplicateUser(
        email,
        uniqueId !== undefined ? Number(uniqueId) : undefined,
        id
      );
      if (duplicate === "email") {
        return c.json({ message: "Email already exists" }, 400);
      }

      if (duplicate === "uniqueId") {
        return c.json({ message: "Unique ID already exists" }, 400);
      }
    }

    // ✅ Role
    if (
      body.role &&
      !["admin", "hr", "user"].includes(body.role.toString())
    ) {
      return c.json({ message: "Invalid role" }, 400);
    }

    // ✅ UniqueId
    if (body.uniqueId !== undefined) {
      const uniqueId = toNumber(body.uniqueId);

      if (uniqueId === undefined) {
        return c.json({ message: "Unique ID must be a number" }, 400);
      }

      const duplicate = await checkDuplicateUser(
        body.email ?? user.email,
        uniqueId,
        id
      );

      if (duplicate === "uniqueId") {
        return c.json({ message: "Unique ID already exists" }, 400);
      }

      user.uniqueId = uniqueId;
      user.markModified("uniqueId");
    }

    // ✅ Mobile
    if (body.mobileNo && !/^\d{10}$/.test(body.mobileNo.toString())) {
      return c.json({ message: "Mobile number must be 10 digits" }, 400);
    }

    // ✅ Aadhar
    if (body.aadharNo && !/^\d{12}$/.test(body.aadharNo.toString())) {
      return c.json({ message: "Aadhar number must be 12 digits" }, 400);
    }

    // ---------------- PASSWORD ----------------
    if (body.password) {
      const pass = body.password.toString();

      if (pass.length < 6) {
        return c.json(
          { message: "Password must be at least 6 characters" },
          400
        );
      }

      user.password = await encryptPassword(pass);
      user.markModified("password");

      delete body.password;
    }

    // ---------------- FILE HANDLING ----------------

    const profileImageFile = formData.get("profileImage") as File | null;
    const otherDocsFiles = formData.getAll("otherDocuments") as File[];
    const otherDocsTitles = formData.getAll("otherDocumentsTitle") as string[];

    // ✅ Profile Image
    if (profileImageFile && profileImageFile.size > 0) {
      const uploaded = await saveFile(profileImageFile, "profile-images");
      user.profileImage = uploaded;
      user.markModified("profileImage");
    }

    // ✅ Other Documents
    if (otherDocsFiles.length > 0) {
      const otherDocuments: { title: string; file: string }[] = [];

      for (let i = 0; i < otherDocsFiles.length; i++) {
        const file = otherDocsFiles[i];
        if (!file || file.size === 0) continue;

        const title = otherDocsTitles[i] || `Document ${i + 1}`;
        const filePath = await saveFile(file, "documents");

        otherDocuments.push({
          title: title.toString(),
          file: filePath,
        });
      }

      user.otherDocuments = otherDocuments;
      user.markModified("otherDocuments");
    }

    // ---------------- DYNAMIC UPDATE ----------------

    Object.keys(body).forEach((key) => {
      if (updatableFields.includes(key)) {
        user.set(key, body[key]);
      }
    });

    await user.save();

    // ---------------- RESPONSE ----------------
    return c.json(
      {
        message: "User updated successfully",
        data: user,
      },
      200
    );
  } catch (error: any) {
    console.error("Update Error:", error);

    if (error?.name === "ValidationError") {
      return c.json({ message: error.message }, 400);
    }

    if (error?.code === 11000) {
      return c.json(
        { message: "Duplicate value found. Email or Unique ID exists." },
        400
      );
    }

    return c.json(
      {
        message: error?.message || "Internal Server Error",
      },
      500
    );
  }
};



// ---------------- DELETE USER ----------------
// export const deleteUser = async (c: Context) => {
//   try {
//     const id = c.req.param("id");

//     const user = await User.findByIdAndDelete(id);

//     if (!user) {
//       return c.json({ message: "User not found" }, 404);
//     }

//     return c.json(
//       { message: "User deleted successfully" },
//       200
//     );
//   } catch (error) {
//     console.error("Delete Error:", error);
//     return c.json({ message: "Invalid User ID" }, 400);
//   }
// };


export const deleteUser = async (c: Context) => {
  try {
    const id = c.req.param("id");
    
    const user = await User.findById(id);

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // 👉 Save into DeletedUser collection
    await DeletedUser.create(user.toObject());

    // 👉 Delete from main collection
    await User.findByIdAndDelete(id);

    return c.json(
      { message: "User moved to deleted users successfully" },
      200
    );
  } catch (error) {
    console.error("Delete Error:", error);
    return c.json({ message: "Invalid User ID" }, 400);
  }
};



// ---------------- USER DROPDOWN ----------------

export const getUsersDropdown = async (c: Context) => {
  try {
    // ✅ query params
    const search = c.req.query("search") || "";
    const companyId = c.req.query("companyId");
    const limit = parseInt(c.req.query("limit") || "20");
    const page = parseInt(c.req.query("page") || "1");
    const skip = (page - 1) * limit;

    // ✅ base filter
    const filter: any = {
      role: { $ne: "admin" },
    };

    // ✅ company filter
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    // ✅ search by name OR employeeId
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "employeeData.employeeId": { $regex: search, $options: "i" } }
      ];
    }
    
    const users = await User.aggregate([
      {
        $lookup: {
          from: "employeeids",
          localField: "employeeObjId",
          foreignField: "_id",
          as: "employeeData"
        }
      },
      {
        $unwind: {
          path: "$employeeData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: filter
      },
      {
        $project: {
          _id: 1,
          name: 1,
          employeeId: "$employeeData.employeeId"
        }
      },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);
  const totalUsers = await User.countDocuments(filter);

    return c.json(
      {
        success: true,
        data: users,
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
    console.error("Get Users Dropdown Error:", error);

    return c.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      500
    );
  }
};








// =============================
// GET USERS STATS / COUNTS API
// Overall Total
// Male / Female Count
// Company Wise Count
// =============================

export const getUsersStats = async (c: Context) => {
  try {
    // =============================
    // BASE FILTER (exclude admin)
    // =============================
    const baseFilter: any = {
      role: { $ne: "admin" },
    };

    // =============================
    // OVERALL TOTAL USERS
    // =============================
    const totalUsers = await User.countDocuments(baseFilter);

    // =============================
    // GENDER COUNTS
    // =============================
    const genderStats = await User.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]);

    let male = 0;
    let female = 0;
    let other = 0;

    genderStats.forEach((item) => {
      const gender = item._id?.toLowerCase();

      if (gender === "male") male = item.count;
      else if (gender === "female") female = item.count;
      else other = item.count;
    });

    // =============================
    // COMPANY WISE USERS COUNT
    // =============================
    const companyWise = await User.aggregate([
      { $match: baseFilter },

      {
        $group: {
          _id: "$companyId",
          totalUsers: { $sum: 1 },

          male: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: "$gender" }, "male"] }, 1, 0],
            },
          },

          female: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: "$gender" }, "female"] }, 1, 0],
            },
          },

          other: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $toLower: "$gender" }, "male"] },
                    { $ne: [{ $toLower: "$gender" }, "female"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // ✅ string to ObjectId convert
      {
        $addFields: {
          companyObjectId: {
            $cond: [
              { $ne: ["$_id", null] },
              { $toObjectId: "$_id" },
              null
            ]
          }
        }
      },

      {
      $lookup: {
        from: "companies",
        let: { companyId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  { $toString: "$_id" },
                  { $toString: "$$companyId" }
                ]
              }
            }
          },
          {
            $project: {
              name: 1
            }
          }
        ],
        as: "company"
      }
    },

      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,
          companyId: "$_id",
          companyName: { $ifNull: ["$company.name", "No Company"] },
          totalUsers: 1,
          male: 1,
          female: 1,
          other: 1,
        },
      },

      { $sort: { totalUsers: -1 } },
    ]);

    // =============================
    // RESPONSE
    // =============================
    return c.json(
      {
        success: true,
        data: {
          overall: {
            totalUsers,
            male,
            female,
            other,
          },
          companyWise,
        },
      },
      200
    );
  } catch (error) {
    console.error("Get Users Stats Error:", error);

    return c.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      500
    );
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

  if (!user.password) {
  return c.json(
    { message: "Password not set for this user" },
    400
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



// get deleted user for view

export const getDeletedUsers = async (c: Context) => {
  try {
    const users = await DeletedUser.find()
      .populate("createdBy")
      .populate("employeeObjId")
      .populate("attendancePolicyId")
      .populate("payrollPolicyId")
      .populate("companyId");

    return c.json(users, 200);
  } catch (error) {
    console.error("Fetch Deleted Users Error:", error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};


//  not in use  restore user api
export const restoreUser = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const user = await DeletedUser.findById(id);

    if (!user) {
      return c.json({ message: "Deleted user not found" }, 404);
    }

    // await User.create(user.toObject());
    await DeletedUser.findByIdAndDelete(id);

    return c.json({ message: "User restored successfully" }, 200);
  } catch (error) {
    return c.json({ message: "Error restoring user" }, 500);
  }
};







//  bulk upload users from excel (not implemented yet, just a placeholder)


export const bulkRegister = async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ message: "Excel file is required" }, 400);
    }

    let workbook;

    try {
      const arrayBuffer = await file.arrayBuffer();
      workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    } catch (err) {
      return c.json(
        { message: "Invalid or unsupported file format" },
        400
      );
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return c.json(
        { message: "Excel file has no sheets" },
        400
      );
    }

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return c.json({ message: "No sheet found in Excel file" }, 400);
    }

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return c.json({ message: "Sheet data not found" }, 400);
    }

    // ✅ Excel → JSON
    const usersData = XLSX.utils.sheet_to_json(sheet);

    if (!usersData.length) {
      return c.json({ message: "Excel is empty" }, 400);
    }

    const createdUsers = [];
    const errors = [];

    const loggedInUser = c.get("user");

    for (let i = 0; i < usersData.length; i++) {
      const row: any = usersData[i];

      try {
        // 🔥 Required fields
        if (!row.name) {
          throw new Error("Name is required");
        }

        // ✅ Mobile validation
        if (row.mobileNo && !/^\d{10}$/.test(row.mobileNo)) {
          throw new Error("Invalid mobile");
        }

        // ✅ Duplicate check (ONLY uniqueId now)
        const duplicate = await checkDuplicateUser(
          undefined,
          row.uniqueId
        );

        if (duplicate === "uniqueId") {
          throw new Error("Duplicate uniqueId");
        }

        // ✅ ObjectId safe handling
        const safeObjectId = (val: any) =>
          val && val !== "" ? val : undefined;

        const user = await User.create({
          name: row.name,

          // ❌ email removed
          // ❌ password removed

          role: "user", // always default

          createdBy: loggedInUser.id,

          uniqueId: row.uniqueId,

          // 🔥 Optional ObjectIds (ONLY allowed ones)
          companyId: safeObjectId(row.companyId),
          attendancePolicyId: safeObjectId(row.attendancePolicyId),
          payrollPolicyId: safeObjectId(row.payrollPolicyId),

          // ❌ removed designationId, departmentId

          // Other fields
          mobileNo: row.mobileNo,
          gender: row.gender,
          dob: row.dob,
          doj: row.doj,
          permanentAddress: row.permanentAddress,
          currentAddress: row.currentAddress,
        });

        createdUsers.push(user);
      } catch (err: any) {
        errors.push({
          row: i + 2,
          error: err.message,
        });
      }
    }

    return c.json({
      message: "Bulk upload completed",
      successCount: createdUsers.length,
      errorCount: errors.length,
      errors,
    });
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
};