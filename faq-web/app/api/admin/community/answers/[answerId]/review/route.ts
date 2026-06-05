/**
 * app/api/admin/community/answers/[answerId]/review/route.ts
 *
 *   POST /api/admin/community/answers/:answerId/review
 *     body: { decision: "approve" | "reject" | "hide", note?: string }
 *
 * Admin override of the AI decision. Supports both session-based auth and
 * legacy x-admin-key auth for backward compatibility.
 */

import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CommunityAnswer, CommunityReport } from "@/models";
import { ok, errors, readJson } from "@/lib/api";
import { isAdmin } from "@/lib/community/identity";
import { getSession } from "@/lib/adminAuth";
import {
  recomputeQuestionStats,
  markSummaryStale,
} from "@/lib/community/service";

const DECISIONS = ["approve", "reject", "hide"] as const;
type AdminDecision = (typeof DECISIONS)[number];

async function checkAuth(req: NextRequest): Promise<{ isAuthorized: boolean; adminId: string }> {
  const session = await getSession();
  if (session) {
    return { isAuthorized: true, adminId: session.id };
  }
  if (isAdmin(req)) {
    return { isAuthorized: true, adminId: "legacy-admin" };
  }
  return { isAuthorized: false, adminId: "" };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ answerId: string }> }
) {
  const auth = await checkAuth(req);
  if (!auth.isAuthorized) return errors.forbidden("Admin access required");
  const { answerId } = await ctx.params;

  const body = await readJson<{ decision?: string; note?: string }>(req);
  const decision = body?.decision as AdminDecision;
  if (!DECISIONS.includes(decision))
    return errors.badRequest("decision must be approve, reject, or hide");

  await connectDB();
  const answer = await CommunityAnswer.findById(answerId);
  if (!answer) return errors.notFound("Answer not found");

  answer.status =
    decision === "approve"
      ? "approved"
      : decision === "hide"
        ? "hidden"
        : "rejected";

  answer.moderationLog.push({
    decision,
    adminId: auth.adminId,
    note: (body?.note ?? "").slice(0, 1000),
    at: new Date(),
  });

  // Clearing reports on resolution keeps the queue accurate.
  if (decision !== "approve") {
    await CommunityReport.updateMany({ answerId }, { $set: { resolved: true } });
  }

  await answer.save();
  await recomputeQuestionStats(String(answer.questionId));
  await markSummaryStale(String(answer.questionId));

  return ok({ answerId, status: answer.status });
}
