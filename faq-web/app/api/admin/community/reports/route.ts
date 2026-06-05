import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CommunityReport } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "";
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (status) {
    query.status = status;
  }

  const [reports, total] = await Promise.all([
    CommunityReport.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CommunityReport.countDocuments(query),
  ]);

  return NextResponse.json({
    reports,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}