/**
 * app/api/community/announcements/route.ts
 *
 *   GET /api/community/announcements — get all announcements (students)
 *
 * Returns announcements sorted by newest first. Students use this
 * to display admin broadcasts in the notification bell.
 */

import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Announcement } from "@/models";
import { ok, errors } from "@/lib/api";

export async function GET(_req: NextRequest) {
  await connectDB();

  const announcements = await Announcement.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return ok({ announcements });
}
