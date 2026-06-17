/**
 * app/api/community/my-contributions/route.ts
 *
 *   GET /api/community/my-contributions
 *
 * Returns ALL contributions made by the current user:
 *
 *   1. Community Q&A  — questions from `community_questions` and answers from
 *      `community_answers`, identified by the `x-student-id` header
 *      (localStorage UUID used by the community module).
 *
 *   2. Legacy /ask questions — questions from `pending_questions`, identified
 *      by the user's email decoded from the JWT Bearer token (the old ask flow
 *      did not record a studentId, only an email).
 *
 * Both sets are merged and returned in a unified shape so the "My
 * Contributions" page can render everything in one list.
 */

import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CommunityAnswer, CommunityQuestion, PendingQuestion } from "@/models";
import type {
  ICommunityAnswer,
  ICommunityQuestion,
  IPendingQuestion,
} from "@/models";
import { ok, errors } from "@/lib/api";
import { getStudent } from "@/lib/community/identity";
import { serializeAnswer, serializeQuestion } from "@/lib/community/serialize";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const student = getStudent(req);
  if (!student) return errors.unauthorized("Missing student identity");

  // Optionally decode the JWT to fetch the user's email for legacy questions.
  const authHeader = req.headers.get("authorization") ?? "";
  const jwtToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const jwtPayload = jwtToken ? verifyToken(jwtToken) : null;
  const userEmail = jwtPayload?.email?.trim().toLowerCase() ?? null;

  await connectDB();

  // ── 1. Community Q&A contributions (new flow) ────────────────────────────
  const [communityQuestions, communityAnswers] = await Promise.all([
    CommunityQuestion.find({
      authorStudentId: student.studentId,
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .lean<ICommunityQuestion[]>(),
    CommunityAnswer.find({
      authorStudentId: student.studentId,
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .lean<ICommunityAnswer[]>(),
  ]);

  // Map answers to their parent question titles for display.
  const qTitles = new Map<string, string>();
  const qIds = communityAnswers.map((a) => String(a.questionId));
  if (qIds.length) {
    const qs = await CommunityQuestion.find({ _id: { $in: qIds } })
      .select("title")
      .lean<{ _id: unknown; title: string }[]>();
    for (const q of qs) qTitles.set(String(q._id), q.title);
  }

  // Fetch ALL answers to the user's questions (from other students) for notifications.
  const myQuestionIds = communityQuestions.map((q) => q._id);
  const answersToMyQuestions = myQuestionIds.length
    ? await CommunityAnswer.find({
        questionId: { $in: myQuestionIds },
        authorStudentId: { $ne: student.studentId },
        status: { $ne: "deleted" },
      })
        .sort({ createdAt: -1 })
        .lean<ICommunityAnswer[]>()
    : [];

  // Group answers by questionId for notification building.
  const answersByQuestion = new Map<string, ICommunityAnswer[]>();
  for (const a of answersToMyQuestions) {
    const qid = String(a.questionId);
    if (!answersByQuestion.has(qid)) answersByQuestion.set(qid, []);
    answersByQuestion.get(qid)!.push(a);
  }

  const serializedCommunityQuestions = communityQuestions.map((q) => ({
    ...serializeQuestion(q as never),
    // Attach answers from other students so the frontend can build reply notifications.
    replies: (answersByQuestion.get(String(q._id)) ?? []).map((a) => ({
      id: String(a._id),
      author: a.authorStudentId,
      authorEmail: a.authorEmail,
      authorRole: "user" as const,
      content: (a.body ?? "").slice(0, 100),
      timestamp: String(a.createdAt),
      status: a.status,
    })),
  }));

  const serializedCommunityAnswers = communityAnswers.map((a) => ({
    ...serializeAnswer(a as never, { studentId: student.studentId }),
    questionTitle: qTitles.get(String(a.questionId)) ?? "(removed)",
  }));

  // ── 2. Legacy /ask contributions (pending_questions collection) ───────────
  // These were submitted before the community module existed; they use email
  // as the author identifier instead of a studentId.
  let legacyQuestions: ReturnType<typeof serializePendingQuestion>[] = [];
  if (userEmail) {
    const pending = await PendingQuestion.find({ email: userEmail })
      .sort({ createdAt: -1 })
      .lean<IPendingQuestion[]>();

    legacyQuestions = pending.map(serializePendingQuestion);
  }

  return ok({
    // Community Q&A questions + legacy /ask questions merged, newest first.
    questions: [...serializedCommunityQuestions, ...legacyQuestions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    answers: serializedCommunityAnswers,
  });
}

/** Serialize a PendingQuestion into the same shape as a QuestionDTO. */
function serializePendingQuestion(q: IPendingQuestion & { _id: unknown }) {
  // Count human replies (non-bot, non-rejected) as the answer count.
  const humanReplies = (q.replies ?? []).filter(
    (r) => r.authorRole !== "bot" && r.status !== "rejected"
  );
  const approvedHumanReplies = humanReplies.filter(
    (r) => r.status === "approved" || r.status === undefined
  );
  // Include pending replies as well so the owner sees activity.
  const replyCount = humanReplies.length;

  return {
    id: String(q._id),
    // PendingQuestion stores the full text in `question`; use first line as title.
    title: q.question.split("\n")[0].slice(0, 160),
    body: q.question,
    tags: q.category ? [q.category] : [],
    status: mapPendingStatus(q.status),
    authorStudentId: "",
    acceptedAnswerId: null,
    approvedAnswerCount: replyCount,
    viewCount: q.views ?? 0,
    voteScore: 0,
    lastActivityAt: q.updatedAt ?? q.createdAt,
    createdAt: q.createdAt,
    // Extra field so the UI can distinguish legacy questions (no /community/:id link).
    isLegacy: true,
    // Include reply details so notifications can show who answered.
    replies: humanReplies.map((r) => ({
      id: r.id,
      author: r.author,
      authorEmail: r.authorEmail,
      authorRole: r.authorRole,
      content: r.content.slice(0, 100),
      timestamp: r.timestamp,
      status: r.status,
    })),
  };
}

/**
 * Map PendingQuestion status values to the QuestionStatus enum used by the
 * community module so the frontend StatusBadge renders correctly.
 */
function mapPendingStatus(
  status: IPendingQuestion["status"]
): "open" | "approved" | "pending_rag" | "rejected_by_rag" | "closed" | "hidden" | "deleted" {
  switch (status) {
    case "approved":
      return "approved";
    case "pending_rag":
      return "pending_rag";
    case "rejected_by_rag":
      return "rejected_by_rag";
    case "resolved":
      return "approved"; // resolved = answered = effectively approved for display
    case "rejected":
      return "rejected_by_rag";
    case "open":
      return "open";
    case "pending":
    default:
      return "pending_rag"; // treat plain "pending" as awaiting review
  }
}
