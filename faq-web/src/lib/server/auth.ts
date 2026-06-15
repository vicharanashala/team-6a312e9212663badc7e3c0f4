/**
 * src/lib/server/auth.ts
 *
 * Server-side authentication helpers.
 * These use MongoDB and JWT verification - do NOT import in client code.
 */

import { ObjectId } from "mongodb";
import { verifyToken, type JwtPayload } from "../jwt";
import ConnectDB from "../mongoClient";

export interface AuthUser extends JwtPayload {
  isAdmin: boolean;
}

export async function getAuthUser(token: string): Promise<AuthUser | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  const client = await ConnectDB();
  const db = client.db(process.env.MONGODB_DB ?? "samagama");

  let userId: ObjectId;
  try {
    userId = new ObjectId(payload.userId);
  } catch {
    return null;
  }

  const userDoc = await db.collection("users").findOne(
    { _id: userId },
    { projection: { isAdmin: 1 } }
  );

  await client.close();

  if (!userDoc) return null;

  return {
    userId: payload.userId,
    email: payload.email,
    isAdmin: userDoc.isAdmin === true,
  };
}

export async function requireAdmin(req: Request): Promise<{ ok: true; user: AuthUser } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false, response: new Response(JSON.stringify({ ok: false, error: { code: "unauthorized", message: "No token provided" } }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }

  const user = await getAuthUser(token);

  if (!user) {
    return { ok: false, response: new Response(JSON.stringify({ ok: false, error: { code: "unauthorized", message: "Invalid token" } }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }

  if (!user.isAdmin) {
    return { ok: false, response: new Response(JSON.stringify({ ok: false, error: { code: "forbidden", message: "Admin access required" } }), { status: 403, headers: { "Content-Type": "application/json" } }) };
  }

  return { ok: true, user };
}