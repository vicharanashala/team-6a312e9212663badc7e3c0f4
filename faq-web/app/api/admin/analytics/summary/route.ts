import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FAQ, Category, PendingQuestion, CommunityQuestion, CommunityAnswer, CommunityReport } from "@/models";
import { withAuth } from "@/lib/adminMiddleware";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  await connectDB();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalFAQs,
    totalCategories,
    pendingQuestions,
    urgentQuestions,
    totalCommunityQuestions,
    openQuestions,
    pendingAnswers,
    pendingReports,
  ] = await Promise.all([
    FAQ.countDocuments({ isPublished: true }),
    Category.countDocuments(),
    PendingQuestion.countDocuments({ status: "pending" }),
    PendingQuestion.countDocuments({ status: "pending", priority: "urgent" }),
    CommunityQuestion.countDocuments(),
    CommunityQuestion.countDocuments({ status: "open" }),
    CommunityAnswer.countDocuments({ "review.status": "pending_review" }),
    CommunityReport.countDocuments({ status: "pending" }),
  ]);

  const recentQuestions = await CommunityQuestion.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  const recentAnswers = await CommunityAnswer.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  const recentActivity = await CommunityQuestion.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("question authorName status createdAt")
    .lean();

  const recentActivityWithType = await Promise.all(
    recentActivity.map(async (q) => {
      const answerCount = await CommunityAnswer.countDocuments({ questionId: q._id });
      return {
        type: "question" as const,
        id: q._id.toString(),
        title: q.title.slice(0, 50) + (q.title.length > 50 ? "..." : ""),
        author: q.authorStudentId,
        status: q.status,
        createdAt: q.createdAt,
        answerCount,
      };
    })
  );

  const topCategories = await FAQ.aggregate([
    { $match: { isPublished: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  return NextResponse.json({
    stats: {
      faqs: {
        total: totalFAQs,
        categories: totalCategories,
      },
      pending: {
        questions: pendingQuestions,
        urgent: urgentQuestions,
        answers: pendingAnswers,
        reports: pendingReports,
      },
      community: {
        total: totalCommunityQuestions,
        open: openQuestions,
        newThisWeek: recentQuestions,
        answersThisWeek: recentAnswers,
      },
    },
    recentActivity: recentActivityWithType,
    topCategories,
  });
}