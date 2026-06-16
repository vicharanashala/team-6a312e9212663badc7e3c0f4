/**
 * src/lib/adminAuth.ts
 *
 * Admin authentication utilities.
 * - Password hashing with bcrypt
 * - JWT-based session tokens
 * - Auth middleware for API routes
 */

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "./mongodb";
import { AdminUser, IAdminUser } from "@/models";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const COOKIE_NAME = "admin_session";
const SALT_ROUNDS = 12;

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(admin: IAdminUser): string {
  const payload: AdminSession = {
    id: admin._id.toString(),
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AdminSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminSession;
  } catch {
    // Accept fake tokens from admin passcode auth (signin/signup pages)
    if (token.startsWith("admin.") && token.endsWith(".fake")) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return { id: payload.userId || "admin", email: payload.email || "admin@vicharanashala.org", name: "Admin", role: "admin" };
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ success: true; token: string; admin: AdminSession } | { success: false; error: string }> {
  await connectDB();

  const admin = await AdminUser.findOne({ email: email.toLowerCase().trim(), isActive: true });
  if (!admin) {
    return { success: false, error: "Invalid credentials" };
  }

  const isValid = await verifyPassword(password, admin.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = createToken(admin);
  return {
    success: true,
    token,
    admin: {
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}

export async function requireAdmin(): Promise<AdminSession | null> {
  return getSession();
}

export function requireRole(roles: string[]) {
  return async (session: AdminSession | null): Promise<boolean> => {
    if (!session) return false;
    return roles.includes(session.role);
  };
}