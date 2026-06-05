import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FAQ } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  await connectDB();

  const faq = await FAQ.findById(id).lean();
  if (!faq) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  return NextResponse.json({ faq });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { question, answer, category, categoryId, tags, isPublished } = body;

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (tags !== undefined) updateData.tags = tags;
    if (typeof isPublished === "boolean") updateData.isPublished = isPublished;
    updateData.lastUpdated = new Date().toISOString().split("T")[0];
    updateData.version = ((await FAQ.findById(id).select("version").lean())?.version ?? 0) + 1;

    const faq = await FAQ.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!faq) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ faq });
  } catch (error) {
    console.error("Update FAQ error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  await connectDB();

  const faq = await FAQ.findByIdAndUpdate(
    id,
    { isPublished: false },
    { new: true }
  ).lean();

  if (!faq) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}