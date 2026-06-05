import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FAQ, Category } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { question: { $regex: search, $options: "i" } },
      { answer: { $regex: search, $options: "i" } },
    ];
  }
  if (category) query.category = category;
  if (status === "published") query.isPublished = true;
  else if (status === "draft") query.isPublished = false;

  const [faqs, total, categories] = await Promise.all([
    FAQ.find(query)
      .sort({ lastUpdated: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FAQ.countDocuments(query),
    Category.find().lean(),
  ]);

  return NextResponse.json({
    faqs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    categories,
  });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { question, answer, category, categoryId, tags, isPublished } = body;

    if (!question || !answer || !category || !categoryId) {
      return NextResponse.json(
        { error: "Question, answer, category, and categoryId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const count = await FAQ.countDocuments();
    const id = `${categoryId}.${count + 1}`;

    const faq = await FAQ.create({
      id,
      question,
      answer,
      category,
      categoryId,
      tags: tags || [],
      isPublished: isPublished ?? true,
    });

    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    console.error("Create FAQ error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}