import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  await connectDB();

  const categories = await Category.find().sort({ id: 1 }).lean();

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, icon, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await connectDB();

    const maxCat = await Category.findOne().sort({ id: -1 });
    const newId = maxCat ? maxCat.id + 1 : 1;

    const category = await Category.create({
      id: newId,
      name,
      icon: icon || "Folder",
      description: description || "",
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}