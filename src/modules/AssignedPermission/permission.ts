import mongoose, { Schema, Document, Types } from "mongoose";

export interface IModulePermission extends Document {
  userId: Types.ObjectId; // HR user
  permissions: Record<string, boolean>; // dynamic key-value
  createdBy: Types.ObjectId;
}

const ModulePermissionSchema = new Schema<IModulePermission>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true // one config per HR
    },
    permissions: {
      type: Map,
      of: Boolean,
      default: {}
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export const ModulePermission = mongoose.model<IModulePermission>(
  "ModulePermission",
  ModulePermissionSchema
);