/**
 * app/api/admin/announcements/route.ts
 *
 *   GET  /api/admin/announcements  — list all announcements (admin)
 *   POST /api/admin/announcements  — create a new announcement (admin)
 */

import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Announcement } from "@/models";
import { ok, errors, readJson } from "@/lib/api";
import { isAdmin } from "@/lib/community/identity";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return errors.forbidden("Admin key required");

  await connectDB();
  const announcements = await Announcement.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return ok({ announcements });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return errors.forbidden("Admin key required");

  const body = await readJson<{ title?: string; message?: string; priority?: string }>(req);
  if (!body) return errors.badRequest("Invalid JSON body");

  const title = (body.title ?? "").trim();
  const message = (body.message ?? "").trim();
  const priority = body.priority ?? "normal";

  if (!title || !message) {
    return errors.badRequest("Title and message are required");
  }

  if (!["normal", "important", "urgent"].includes(priority)) {
    return errors.badRequest("Priority must be normal, important, or urgent");
  }

  await connectDB();

  const announcement = await Announcement.create({
    title,
    message,
    priority,
    createdBy: req.headers.get("x-admin-key") ?? "admin",
  });

  return ok({ announcement });
}
