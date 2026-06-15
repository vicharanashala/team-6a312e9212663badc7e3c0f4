"use client";

import { useEffect, useState } from "react";
import { Check, X, Eye, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface Question {
  _id: string;
  question: string;
  authorName: string;
  status: string;
  priority?: string;
  createdAt: string;
  ragReview?: {
    status: string;
    comment?: string;
  };
}

export default function QuestionsQueuePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community/questions");
      const data = await res.json();
      setQuestions(data.questions);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleReview = async (question: Question, action: "approve" | "reject") => {
    setActionLoading(question._id);
    try {
      const res = await fetch(`/api/admin/community/questions/${question._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to review");
      toast.success(`Question ${action === "approve" ? "approved" : "rejected"}`);
      setSelectedQuestion(null);
      fetchQuestions();
    } catch {
      toast.error("Failed to review question");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending_rag: "bg-yellow-100 text-yellow-800",
    needs_admin_review: "bg-orange-100 text-orange-800",
    open: "bg-green-100 text-green-800",
    closed: "bg-slate-100 text-slate-800",
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
        <h1 className="text-2xl font-bold">Community Questions</h1>
        <p className="text-muted-foreground">Review pending community questions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Queue ({questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending questions
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div
                    key={q._id}
                    onClick={() => setSelectedQuestion(q)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedQuestion?._id === q._id
                        ? "border-blue-500 bg-blue-50"
                        : "hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="font-medium truncate">{q.question}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{q.authorName}</span>
                          <span>•</span>
                          <span>{formatDate(q.createdAt)}</span>
                        </div>
                      </div>
                      <Badge className={statusColors[q.status] || "bg-slate-100"}>
                        {q.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {q.ragReview?.comment && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        AI: {q.ragReview.comment.slice(0, 100)}...
                      </p>
                    )}
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
            {selectedQuestion ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Question</h3>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedQuestion.question}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Author</p>
                    <p className="font-medium">{selectedQuestion.authorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[selectedQuestion.status]}>
                      {selectedQuestion.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                {selectedQuestion.ragReview?.comment && (
                  <div>
                    <h3 className="font-semibold mb-2">AI Review Comment</h3>
                    <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
                      {selectedQuestion.ragReview.comment}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleReview(selectedQuestion, "approve")}
                    disabled={actionLoading === selectedQuestion._id}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReview(selectedQuestion, "reject")}
                    disabled={actionLoading === selectedQuestion._id}
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
                <p>Select a question to review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}