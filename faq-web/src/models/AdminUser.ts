/**
 * src/models/AdminUser.ts
 *
 * Mongoose model for admin users.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export type AdminRole = "super_admin" | "admin" | "moderator";

export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "moderator"],
      default: "admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "admin_users",
  }
);

const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser ?? mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;