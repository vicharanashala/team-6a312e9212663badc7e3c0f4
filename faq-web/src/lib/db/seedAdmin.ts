/**
 * Seed script to create initial admin user
 * Run with: npm run db:seed:admin
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["super_admin", "admin", "moderator"], default: "admin" },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
}, { timestamps: true, collection: "admin_users" });

const AdminUser = mongoose.model("AdminUser", adminSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin";

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log("Admin user already exists");
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.create({
    email,
    passwordHash,
    name,
    role: "super_admin",
  });

  console.log(`Admin user created: ${email} / ${password}`);
  await mongoose.disconnect();
}

seed().catch(console.error);