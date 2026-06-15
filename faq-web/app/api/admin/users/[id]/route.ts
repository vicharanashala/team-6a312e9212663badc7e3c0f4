import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AdminUser } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";
import { hashPassword } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin"]);
  if (auth.error) return auth.error;

  await connectDB();

  const user = await AdminUser.findById(id).select("-passwordHash").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, role, isActive, password } = body;

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (role) {
      if (!["super_admin", "admin", "moderator"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = role;
    }
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);

    const user = await AdminUser.findByIdAndUpdate(id, updateData, { new: true })
      .select("-passwordHash")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
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
  const auth = await withAuth(req, ["super_admin"]);
  if (auth.error) return auth.error;

  await connectDB();

  const user = await AdminUser.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).select("-passwordHash");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}