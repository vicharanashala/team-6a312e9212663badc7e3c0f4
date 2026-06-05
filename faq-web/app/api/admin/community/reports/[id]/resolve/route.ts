import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CommunityReport, CommunityAnswer } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { action, hideContent } = body;

    if (!["dismiss", "resolve"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    if (action === "dismiss") {
      const report = await CommunityReport.findByIdAndUpdate(
        id,
        { status: "dismissed" },
        { new: true }
      ).lean();

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      return NextResponse.json({ report });
    }

    if (hideContent && hideContent === true) {
      await CommunityAnswer.findByIdAndUpdate(
        id,
        { status: "hidden" },
        { new: true }
      );
    }

    const report = await CommunityReport.findByIdAndUpdate(
      id,
      { status: "resolved" },
      { new: true }
    ).lean();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Resolve report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}