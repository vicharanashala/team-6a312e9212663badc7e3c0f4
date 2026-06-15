"use client";

import { useEffect, useState } from "react";
import { Check, X, Eye, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface Answer {
  _id: string;
  answer: string;
  authorStudentId: string;
  questionId: string;
  review?: {
    status: string;
    comment?: string;
    reason?: string;
  };
  createdAt: string;
  question?: {
    question: string;
  };
}

export default function AnswersQueuePage() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAnswers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community/answers");
      const data = await res.json();
      setAnswers(data.answers);
    } catch {
      toast.error("Failed to load answers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnswers();
  }, []);

  const handleReview = async (answer: Answer, action: "approve" | "reject") => {
    setActionLoading(answer._id);
    try {
      const res = await fetch(`/api/admin/community/answers/${answer._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: action }),
      });
      if (!res.ok) throw new Error("Failed to review");
      toast.success(`Answer ${action === "approve" ? "approved" : "rejected"}`);
      setSelectedAnswer(null);
      fetchAnswers();
    } catch {
      toast.error("Failed to review answer");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community Answers</h1>
        <p className="text-muted-foreground">Review pending answers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Queue ({answers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : answers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending answers
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((a) => (
                  <div
                    key={a._id}
                    onClick={() => setSelectedAnswer(a)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAnswer?._id === a._id
                        ? "border-blue-500 bg-blue-50"
                        : "hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium truncate">{a.answer.slice(0, 60)}...</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{a.authorStudentId}</span>
                        <span>•</span>
                        <span>{formatDate(a.createdAt)}</span>
                      </div>
                    </div>
                    <Badge className={`mt-2 ${statusColors[a.review?.status || ""] || "bg-slate-100"}`}>
                      {a.review?.status?.replace(/_/g, " ") || "unknown"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAnswer ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Answer</h3>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedAnswer.answer}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Author</p>
                    <p className="font-medium">{selectedAnswer.authorStudentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[selectedAnswer.review?.status || ""]}>
                      {selectedAnswer.review?.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                {selectedAnswer.review?.comment && (
                  <div>
                    <h3 className="font-semibold mb-2">AI Review Comment</h3>
                    <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
                      {selectedAnswer.review.comment}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleReview(selectedAnswer, "approve")}
                    disabled={actionLoading === selectedAnswer._id}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReview(selectedAnswer, "reject")}
                    disabled={actionLoading === selectedAnswer._id}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select an answer to review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}