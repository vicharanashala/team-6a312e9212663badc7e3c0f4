/**
 * src/lib/adminMiddleware.ts
 *
 * Middleware helpers for admin API route protection.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, AdminSession } from "./adminAuth";

export async function withAuth(
  req: NextRequest,
  allowedRoles?: string[]
): Promise<{ session: AdminSession; error?: undefined } | { session?: undefined; error: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}

export function authError(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenError(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}