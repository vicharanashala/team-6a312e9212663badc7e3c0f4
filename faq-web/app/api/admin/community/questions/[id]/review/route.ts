import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CommunityQuestion } from "@/models";
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
    const { action, reason } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    const newStatus = action === "approve" ? "open" : "rejected_by_admin";
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (reason) {
      updateData.adminReviewReason = reason;
    }

    const question = await CommunityQuestion.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Review question error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}