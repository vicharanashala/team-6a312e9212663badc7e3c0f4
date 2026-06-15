"use client";

import { useEffect, useState } from "react";
import {
  FileQuestion,
  MessageSquare,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface DashboardData {
  stats: {
    faqs: { total: number; categories: number };
    pending: { questions: number; urgent: number; answers: number; reports: number };
    community: { total: number; open: number; newThisWeek: number; answersThisWeek: number };
  };
  recentActivity: Array<{
    type: "question";
    id: string;
    title: string;
    author: string;
    status: string;
    createdAt: string;
    answerCount: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/summary")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Failed to load dashboard data</div>;
  }

  const { stats } = data;
  const totalPending =
    stats.pending.questions + stats.pending.answers + stats.pending.reports;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your FAQ community platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total FAQs"
          value={stats.faqs.total}
          description={`Across ${stats.faqs.categories} categories`}
          icon={FileQuestion}
          variant="default"
        />
        <StatCard
          title="Community Questions"
          value={stats.community.total}
          description={`${stats.community.open} open questions`}
          icon={MessageSquare}
          variant="default"
        />
        <StatCard
          title="Pending Review"
          value={totalPending}
          description={`${stats.pending.urgent} urgent`}
          icon={AlertTriangle}
          variant={totalPending > 10 ? "danger" : "warning"}
        />
        <StatCard
          title="New This Week"
          value={stats.community.newThisWeek}
          description={`${stats.community.answersThisWeek} answers`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Moderation Queue</CardTitle>
            <Link href="/admin/community/questions" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Pending Questions</span>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {stats.pending.questions}
                </Badge>
              </div>
              <Link href="/admin/community/answers" className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Pending Answers</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {stats.pending.answers}
                </Badge>
              </Link>
              <Link href="/admin/community/reports" className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Reports</span>
                </div>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {stats.pending.reports}
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Recent Questions</CardTitle>
            <Link href="/admin/community/questions" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No recent questions
                </p>
              ) : (
                data.recentActivity.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-2 border-b last:border-0"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        by {item.author} • {item.answerCount} answers
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === "open"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-800"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}