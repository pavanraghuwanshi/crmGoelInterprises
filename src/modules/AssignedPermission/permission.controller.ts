import type { Context } from "hono";
import { ModulePermission } from "./permission";
import { User } from "../user/user.model";



export const assignPermissions = async (c: Context) => {
    try {
      const loggedInUser = c.get("user");
  
      if (!loggedInUser || loggedInUser.role !== "admin") {
        return c.json({ message: "Only admin can assign permissions" }, 403);
      }
  
      const body = await c.req.json();
      const { userId, permissions } = body;
  
      if (!userId) {
        return c.json({ message: "UserId is required" }, 400);
      }
  
      const user = await User.findById(userId);
  
      if (!user || user.role !== "hr") {
        return c.json({ message: "Permissions can be assigned only to HR" }, 400);
      }
  
      const data = await ModulePermission.findOneAndUpdate(
        { userId },
        {
          permissions,
          createdBy: loggedInUser.id
        },
        { upsert: true, new: true }
      );
  
      return c.json({
        message: "Permissions assigned successfully",
        data
      });
    } catch (error: any) {
      return c.json({ message: error.message }, 500);
    }
  };


  export const getAllPermissions = async (c: Context) => {
    try {
      const loggedInUser = c.get("user");
  
      if (!loggedInUser || loggedInUser.role !== "admin") {
        return c.json({ message: "Only admin can view all permissions" }, 403);
      }
  
      const data = await ModulePermission.find()
        .populate("userId", "name email role") // 👈 important
        .sort({ createdAt: -1 });
  
      return c.json({
        success: true,
        count: data.length,
        data
      });
    } catch (error: any) {
      return c.json({ message: error.message }, 500);
    }
  };


  export const getPermissions = async (c: Context) => {
    try {
      const userId = c.req.param("userId");
  
      const data = await ModulePermission.findOne({ userId });
  
      return c.json({
        success: true,
        data: data || {}
      });
    } catch (error: any) {
      return c.json({ message: error.message }, 500);
    }
  };



  export const updatePermissions = async (c: Context) => {
    try {
      const loggedInUser = c.get("user");
  
      if (loggedInUser.role !== "admin") {
        return c.json({ message: "Only admin can update" }, 403);
      }
  
      const userId = c.req.param("userId");
      const body = await c.req.json();
  
      const data = await ModulePermission.findOneAndUpdate(
        { userId },
        { permissions: body.permissions },
        { new: true }
      );
  
      return c.json({
        message: "Updated successfully",
        data
      });
    } catch (error: any) {
      return c.json({ message: error.message }, 500);
    }
  };


  export const deletePermissions = async (c: Context) => {
    try {
      const loggedInUser = c.get("user");
  
      if (loggedInUser.role !== "admin") {
        return c.json({ message: "Only admin can delete" }, 403);
      }
  
      const userId = c.req.param("userId");
  
      await ModulePermission.findOneAndDelete({ userId });
  
      return c.json({
        message: "Permissions removed"
      });
    } catch (error: any) {
      return c.json({ message: error.message }, 500);
    }
  };