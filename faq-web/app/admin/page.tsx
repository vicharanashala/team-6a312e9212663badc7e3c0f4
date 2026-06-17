"use client";

/**
 * app/admin/page.tsx
 *
 * Admin panel — review, answer, reject, or promote pending questions.
 * Three tabs:
 *   - "Questions"          — all pending questions (ask_page + yaksha_chat source)
 *   - "FAQ Suggestions"    — only yaksha_chat questions ready for FAQ promotion
 *   - "Community Reviews"  — student replies in the community section awaiting
 *                            admin accept / rewrite / reject
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Trash2,
  Send,
  Filter,
  Sparkles,
  Mail,
  RefreshCw,
  BookText,
  PlusCircle,
  X,
  Tag,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categories } from "@/data/faqData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ManualFAQForm from "../resolve/ManualFAQForm";
import ResolveAssistant from "../resolve/ResolveAssistant";


interface PendingQuestion {
  id: string;
  question: string;
  category: string;
  email: string;
  priority: "normal" | "urgent";
  submittedAt: string;
  status: "pending" | "resolved" | "rejected";
  suggestedAnswer?: string | null;
  answer?: string | null;
  source?: string;
}

export default function AdminPage() {
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<PendingQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "urgent" | "rejected">("all");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"questions" | "faq_suggestions" | "manual_faq" | "chat_feedback" | "live_faqs" | "announcements">("questions");
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteCategoryId, setPromoteCategoryId] = useState(1);
  const [promoteTags, setPromoteTags] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<{
    found: boolean;
    confidence?: number;
    matchedFaqQuestion?: string;
    matchedFaqCategory?: string;
    suggestedReply?: string;
    message?: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  interface ChatFeedback {
    id: string;
    studentId: string;
    question: string;
    answer: string;
    feedback: "up" | "down";
    sources: string[];
    confidence: number;
    createdAt: string;
  }
  const [feedbacks, setFeedbacks] = useState<ChatFeedback[]>([]);

  // Announcements state
  interface Announcement {
    _id: string;
    title: string;
    message: string;
    priority: "normal" | "important" | "urgent";
    createdBy: string;
    createdAt: string;
  }
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementListLoading, setAnnouncementListLoading] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const adminKey = localStorage.getItem("samagama_admin_key") ?? "dev-admin";
      if (tab === "chat_feedback") {
        const res = await fetch("/api/admin/chat-feedback", {
          headers: { "x-admin-key": adminKey },
        });
        const data = await res.json();
        if (data.ok) {
          setFeedbacks(data.feedback);
        } else {
          toast.error(data.error?.message ?? "Failed to load chat feedback");
        }
      } else {
        const srcParam = tab === "faq_suggestions" ? "&source=yaksha_chat" : "";
        const res = await fetch(`/api/admin/pending-questions?status=all${srcParam}`, {
          headers: { "x-admin-key": adminKey },
        });
        const data = await res.json();
        if (data.ok) {
          setQuestions(data.questions);
        } else {
          toast.error(data.error?.message ?? "Failed to load questions");
        }
      }
    } catch {
      toast.error("Network error — could not load data");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch("/api/admin/auth/me");
        const data = await res.json();
        if (data.admin?.email) setAdminEmail(data.admin.email);
      } catch {}
    };
    void fetchAdmin();
  }, []);

  const filteredQuestions = questions.filter((q) => {
    if (filter === "pending") return q.status === "pending";
    if (filter === "urgent") return q.priority === "urgent" && q.status === "pending";
    if (filter === "rejected") return q.status === "rejected";
    return q.status !== "rejected";
  });

  const handleResolve = async (id: string) => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/pending-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": localStorage.getItem("samagama_admin_key") ?? "dev-admin",
        },
        body: JSON.stringify({ id, action: "resolve", answer }),
      });
      const data = await res.json();
      if (data.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: "resolved" as const } : q))
        );
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-semibold">
              <Mail size={14} />
              <span>Question resolved</span>
            </div>
            <p className="text-xs opacity-80">
              Notification sent to {selectedQuestion?.email || "submitter"}
            </p>
          </div>,
          { duration: 4000 }
        );
        setSelectedQuestion(null);
        setAnswer("");
      } else {
        toast.error(data.error?.message ?? "Failed to resolve question");
      }
    } catch {
      toast.error("Network error — could not resolve question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/pending-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": localStorage.getItem("samagama_admin_key") ?? "dev-admin",
        },
        body: JSON.stringify({ id, action: "reject" }),
      });
      const data = await res.json();
      if (data.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: "rejected" as const } : q))
        );
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-semibold">
              <Mail size={14} />
              <span>Question rejected</span>
            </div>
            <p className="text-xs opacity-80">
              Submitter notified: {selectedQuestion?.email || "unknown"}
            </p>
          </div>,
          { duration: 4000 }
        );
        setSelectedQuestion(null);
        setAnswer("");
      } else {
        toast.error(data.error?.message ?? "Failed to reject question");
      }
    } catch {
      toast.error("Network error — could not reject question");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteToFaq = async () => {
    if (!answer.trim() || !selectedQuestion) return;
    setSubmitting(true);
    try {
      const adminKey = localStorage.getItem("samagama_admin_key") ?? "dev-admin";
      let targetQuestionId = selectedQuestion.id;

      if (tab === "chat_feedback") {
        // 1. Submit the feedback question to chat-suggestion to create a pending question doc
        const resSubmit = await fetch("/api/chat-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: selectedQuestion.question, category: "General" }),
        });
        const dataSubmit = await resSubmit.json();
        if (!dataSubmit.ok) {
          toast.error(dataSubmit.error?.message ?? "Failed to initialize FAQ suggestion");
          setSubmitting(false);
          return;
        }
        targetQuestionId = dataSubmit.questionId;
      }

      const res = await fetch("/api/admin/pending-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          id: targetQuestionId,
          action: "promote_faq",
          answer,
          promoteFaq: {
            categoryId: promoteCategoryId,
            tags: promoteTags
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (tab === "chat_feedback") {
          // Delete feedback from MongoDB
          await fetch(`/api/admin/chat-feedback?id=${selectedQuestion.id}`, {
            method: "DELETE",
            headers: {
              "x-admin-key": adminKey,
            }
          });
          setFeedbacks((prev) => prev.filter((f) => f.id !== selectedQuestion.id));
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-semibold">
                <BookText size={14} />
                <span>FAQ created: {data.faqId}</span>
              </div>
              <p className="text-xs opacity-80">
                Chat feedback promoted and published to FAQ
              </p>
            </div>,
            { duration: 5000 }
          );
        } else {
          setQuestions((prev) =>
            prev.map((q) => (q.id === selectedQuestion.id ? { ...q, status: "resolved" as const } : q))
          );
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-semibold">
                <BookText size={14} />
                <span>FAQ created: {data.faqId}</span>
              </div>
              <p className="text-xs opacity-80">
                Question promoted and published to FAQ
              </p>
            </div>,
            { duration: 5000 }
          );
        }
        setSelectedQuestion(null);
        setAnswer("");
        setPromoteModalOpen(false);
        setPromoteTags("");
      } else {
        toast.error(data.error?.message ?? "Failed to promote to FAQ");
      }
    } catch {
      toast.error("Network error — could not promote to FAQ");
    } finally {
      setSubmitting(false);
    }
  };

  const openPromoteModal = () => {
    setPromoteCategoryId(1);
    setPromoteTags("");
    setPromoteModalOpen(true);
  };

  const handleDismissFeedback = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/chat-feedback?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": localStorage.getItem("samagama_admin_key") ?? "dev-admin",
        },
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
        toast.success("Feedback dismissed");
        setSelectedQuestion(null);
      } else {
        toast.error(data.error?.message ?? "Failed to dismiss feedback");
      }
    } catch {
      toast.error("Network error — could not dismiss feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedQuestion) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/questions/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: selectedQuestion.question }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiSuggestion(data);
      } else {
        toast.error("Failed to generate suggestion");
      }
    } catch {
      toast.error("Network error — could not generate suggestion");
    } finally {
      setAiLoading(false);
    }
  };

  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const urgentCount = questions.filter((q) => q.priority === "urgent" && q.status === "pending").length;
  const resolvedCount = questions.filter((q) => q.status === "resolved").length;

  const categoryCounts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const PIE_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#ec4899"];
  const categoryColorMap = Object.fromEntries(
    chartData.map((d, i) => [d.name, PIE_COLORS[i % PIE_COLORS.length]])
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Resolve <span className="text-accent">Questions</span>
              </h1>
              <p className="text-muted text-sm">
                Admin panel — review, answer, or reject pending questions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadQuestions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted hover:text-foreground hover:border-muted transition-all text-sm"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>{adminEmail || "admin"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-card border border-border w-fit">
          <button
            onClick={() => { setTab("questions"); setSelectedQuestion(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "questions"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <MessageSquare size={14} />
            Questions
          </button>
          <button
            onClick={() => { setTab("faq_suggestions"); setSelectedQuestion(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "faq_suggestions"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <BookText size={14} />
            FAQ Suggestions
          </button>
          <button
            onClick={() => { setTab("manual_faq"); setSelectedQuestion(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "manual_faq"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <PlusCircle size={14} />
            Manual FAQ
          </button>
          <button
            onClick={() => { setTab("chat_feedback"); setSelectedQuestion(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "chat_feedback"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <Sparkles size={14} />
            Chat Feedback
          </button>
          <button
            onClick={() => { setTab("live_faqs"); setSelectedQuestion(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "live_faqs"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <BookText size={14} />
            Live FAQs
          </button>
          <button
            onClick={() => { setTab("announcements"); setSelectedQuestion(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "announcements"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            )}
          >
            <Mail size={14} />
            Announcements
          </button>
        </div>

        {/* Stats (questions tab only) */}
        {tab === "questions" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-accent" />
                <span className="text-xs text-muted">Pending</span>
              </div>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-danger" />
                <span className="text-xs text-muted">Urgent</span>
              </div>
              <p className="text-2xl font-bold text-danger">{urgentCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-success" />
                <span className="text-xs text-muted">Resolved</span>
              </div>
              <p className="text-2xl font-bold text-success">{resolvedCount}</p>
            </div>
          </motion.div>
        )}

        {/* Filter */}
        {tab === "questions" && (
          <div className="flex items-center gap-2 mb-6">
            <Filter size={16} className="text-muted" />
            {(["all", "pending", "urgent", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  filter === f
                    ? "bg-accent text-background"
                    : "bg-card border border-border text-muted hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Category Chart */}
        {tab === "questions" && chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-border bg-card p-6"
          >
            <h3 className="text-sm font-semibold mb-4">Questions by Category</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#888" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Questions Grid (Questions + FAQ Suggestions tabs) */}
        {tab !== "manual_faq" && tab !== "live_faqs" && tab !== "announcements" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-16 text-muted text-sm">
                Loading...
              </div>
            ) : tab === "chat_feedback" ? (
              feedbacks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={48} className="text-success mx-auto mb-4 opacity-50" />
                  <p className="text-muted">No chat feedback logged yet</p>
                </div>
              ) : (
                feedbacks.map((f, idx) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedQuestion({
                        id: f.id,
                        question: f.question,
                        category: "Yaksha Chat Feedback",
                        email: f.studentId,
                        priority: "normal",
                        status: "pending",
                        answer: f.answer,
                        suggestedAnswer: f.answer,
                        submittedAt: f.createdAt,
                        source: "yaksha_chat"
                      });
                      setAnswer(f.answer);
                    }}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all",
                      selectedQuestion?.id === f.id
                        ? "border-accent bg-accent/5"
                        : "border-border bg-card hover:border-muted",
                      f.feedback === "down" ? "border-danger/30 hover:border-danger/50" : ""
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 uppercase tracking-wide",
                            f.feedback === "up" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                          )}>
                            {f.feedback === "up" ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}
                            {f.feedback === "up" ? "Helpful" : "Unhelpful"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-card border border-border text-muted">
                            Confidence: {Math.round(f.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-relaxed mb-1 text-foreground">
                          {f.question}
                        </p>
                        <p className="text-xs text-muted leading-relaxed line-clamp-2 bg-background/50 p-2 rounded-lg border border-border/50">
                          <span className="font-semibold text-[10px] uppercase text-muted mr-1">Bot Answer:</span>
                          {f.answer}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted">
                          <span>User: {f.studentId}</span>
                          <span>&middot;</span>
                          <span>
                            {new Date(f.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={48} className="text-success mx-auto mb-4 opacity-50" />
                <p className="text-muted">No questions in this filter</p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    setSelectedQuestion(q);
                    setAnswer(q.suggestedAnswer || q.answer || "");
                  }}
                  className={cn(
                    "rounded-xl border p-4 cursor-pointer transition-all",
                    selectedQuestion?.id === q.id
                      ? "border-accent bg-accent/5"
                      : "border-border bg-card hover:border-muted",
                    q.status === "resolved" && "opacity-50",
                    q.status === "rejected" && "opacity-30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {tab === "faq_suggestions" && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent">
                            FAQ Suggestion
                          </span>
                        )}
                        {q.priority === "urgent" && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-danger/20 text-danger">
                            urgent
                          </span>
                        )}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: (categoryColorMap[q.category] || "#888") + "20",
                            color: categoryColorMap[q.category] || "#888",
                          }}
                        >
                          {q.category}
                        </span>
                        {q.status !== "pending" && (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              q.status === "resolved"
                                ? "bg-success/20 text-success"
                                : "bg-danger/20 text-danger"
                            )}
                          >
                            {q.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        {q.question}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {q.email && <span className="text-xs text-muted">{q.email}</span>}
                        <span className="text-xs text-muted">
                          {new Date(q.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <MessageSquare size={16} className="text-muted shrink-0" />
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Answer Panel */}
          <AnimatePresence mode="wait">
            {selectedQuestion ? (
              <motion.div
                key={selectedQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="sticky top-24 rounded-xl border border-border bg-card p-6 h-fit"
              >
                {tab === "faq_suggestions" ? (
                  <h3 className="text-sm font-semibold mb-1">Promote to FAQ</h3>
                ) : (
                  <h3 className="text-sm font-semibold mb-1">Answer this question</h3>
                )}
                <p className="text-xs text-muted mb-4">
                  {selectedQuestion.question}
                </p>

                {selectedQuestion.suggestedAnswer && (
                  <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-accent" />
                      <span className="text-xs font-medium text-accent">
                        AI-suggested answer
                      </span>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {selectedQuestion.suggestedAnswer}
                    </p>
                    <button
                      onClick={() => setAnswer(selectedQuestion.suggestedAnswer || "")}
                      className="mt-2 text-xs text-accent hover:underline"
                    >
                      Use this answer →
                    </button>
                  </div>
                )}

                {tab === "questions" && !selectedQuestion.suggestedAnswer && (
                  <div className="mb-4">
                    <button
                      onClick={handleAiSuggest}
                      disabled={aiLoading}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all w-full justify-center",
                        aiLoading
                          ? "bg-card border border-border text-muted cursor-wait"
                          : "bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20"
                      )}
                    >
                      <Sparkles size={14} className={aiLoading ? "animate-pulse" : ""} />
                      {aiLoading ? "Finding suggestion..." : "AI Suggest Reply"}
                    </button>
                  </div>
                )}

                {aiSuggestion && (
                  <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-accent" />
                      <span className="text-xs font-medium text-accent">
                        AI Suggestion {aiSuggestion.found ? `(${aiSuggestion.confidence}% match)` : ""}
                      </span>
                    </div>
                    {aiSuggestion.found ? (
                      <>
                        <p className="text-xs text-muted mb-2">
                          Matched: {aiSuggestion.matchedFaqQuestion} ({aiSuggestion.matchedFaqCategory})
                        </p>
                        <div className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap mb-2">
                          {aiSuggestion.suggestedReply}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAnswer(aiSuggestion.suggestedReply || "");
                              setAiSuggestion(null);
                            }}
                            className="text-xs text-accent hover:underline"
                          >
                            Use this answer →
                          </button>
                          <button
                            onClick={() => setAiSuggestion(null)}
                            className="text-xs text-muted hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-foreground/70">{aiSuggestion.message}</p>
                    )}
                  </div>
                )}

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none placeholder:text-muted mb-4"
                  disabled={submitting}
                />

                {tab === "faq_suggestions" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={openPromoteModal}
                      disabled={!answer.trim() || submitting}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                        answer.trim() && !submitting
                          ? "bg-accent text-background hover:bg-accent-hover"
                          : "bg-card border border-border text-muted cursor-not-allowed"
                      )}
                    >
                      <PlusCircle size={14} />
                      Promote to FAQ
                    </button>
                    <button
                      onClick={() => handleReject(selectedQuestion.id)}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Reject
                    </button>
                  </div>
                ) : tab === "chat_feedback" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={openPromoteModal}
                      disabled={!answer.trim() || submitting}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                        answer.trim() && !submitting
                          ? "bg-accent text-background hover:bg-accent-hover"
                          : "bg-card border border-border text-muted cursor-not-allowed"
                      )}
                    >
                      <PlusCircle size={14} />
                      Promote to FAQ
                    </button>
                    <button
                      onClick={() => handleDismissFeedback(selectedQuestion.id)}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted hover:bg-background transition-all disabled:opacity-50"
                    >
                      <X size={14} />
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(selectedQuestion.id)}
                      disabled={!answer.trim() || submitting}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                        answer.trim() && !submitting
                          ? "bg-success text-background hover:bg-success/90"
                          : "bg-card border border-border text-muted cursor-not-allowed"
                      )}
                    >
                      <Send size={14} />
                      {submitting ? "Resolving…" : "Resolve"}
                    </button>
                    <button
                      onClick={() => handleReject(selectedQuestion.id)}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="sticky top-24 rounded-xl border border-border bg-card p-12 text-center"
              >
                <MessageSquare size={48} className="text-muted mx-auto mb-4 opacity-30" />
                <p className="text-sm text-muted">
                  Select a question to {tab === "faq_suggestions" || tab === "chat_feedback" ? "promote" : "answer"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Manual FAQ Tab */}
        {tab === "manual_faq" && (
          <div className="max-w-2xl">
            <ManualFAQForm />
          </div>
        )}

        {/* Resolve Assistant */}
        <div className="mt-10 pt-8 border-t border-border">
          <ResolveAssistant />
        </div>

        {/* Live FAQs Tab */}
        {tab === "live_faqs" && <LiveFaqstab />}

        {/* Announcements Tab */}
        {tab === "announcements" && (
          <AnnouncementTab
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            title={announcementTitle}
            setTitle={setAnnouncementTitle}
            message={announcementMessage}
            setMessage={setAnnouncementMessage}
            priority={announcementPriority}
            setPriority={setAnnouncementPriority}
            loading={announcementLoading}
            setLoading={setAnnouncementLoading}
            listLoading={announcementListLoading}
            setListLoading={setAnnouncementListLoading}
          />
        )}
      </main>

      {/* Promote to FAQ Modal */}
      <AnimatePresence>
        {promoteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPromoteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookText size={18} className="text-accent" />
                  <h3 className="text-sm font-semibold">Promote to FAQ</h3>
                </div>
                <button
                  onClick={() => setPromoteModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-muted mb-4 line-clamp-2">
                {selectedQuestion?.question}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    <Tag size={12} className="inline mr-1" />
                    Category
                  </label>
                  <select
                    value={promoteCategoryId}
                    onChange={(e) => setPromoteCategoryId(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={promoteTags}
                    onChange={(e) => setPromoteTags(e.target.value)}
                    placeholder="e.g. noc, deadline, application"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-muted"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePromoteToFaq}
                    disabled={!answer.trim() || submitting}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                      answer.trim() && !submitting
                        ? "bg-accent text-background hover:bg-accent-hover"
                        : "bg-card border border-border text-muted cursor-not-allowed"
                    )}
                  >
                    <PlusCircle size={14} />
                    {submitting ? "Promoting…" : "Create FAQ Entry"}
                  </button>
                  <button
                    onClick={() => setPromoteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted hover:bg-background transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Announcement Tab Component ──────────────────────────────────────────────

function AnnouncementTab({
  announcements,
  setAnnouncements,
  title,
  setTitle,
  message,
  setMessage,
  priority,
  setPriority,
  loading,
  setLoading,
  listLoading,
  setListLoading,
}: {
  announcements: { _id: string; title: string; message: string; priority: string; createdBy: string; createdAt: string }[];
  setAnnouncements: (a: { _id: string; title: string; message: string; priority: string; createdBy: string; createdAt: string }[]) => void;
  title: string;
  setTitle: (t: string) => void;
  message: string;
  setMessage: (m: string) => void;
  priority: "normal" | "important" | "urgent";
  setPriority: (p: "normal" | "important" | "urgent") => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  listLoading: boolean;
  setListLoading: (l: boolean) => void;
}) {
  const priorityColors = {
    normal: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    important: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  // Load announcements on mount
  useEffect(() => {
    setListLoading(true);
    fetch("/api/admin/announcements", {
      headers: { "x-admin-key": localStorage.getItem("samagama_admin_key") ?? "dev-admin" },
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAnnouncements(d.announcements); })
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [setListLoading, setAnnouncements]);

  async function handlePost() {
    if (!title.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": localStorage.getItem("samagama_admin_key") ?? "dev-admin",
        },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), priority }),
      });
      const data = await res.json();
      if (data.ok) {
        setAnnouncements([data.announcement, ...announcements]);
        setTitle("");
        setMessage("");
        setPriority("normal");
        toast.success("Announcement posted!");
      } else {
        toast.error(data.error?.message ?? "Failed to post");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    // Optimistic remove
    setAnnouncements(announcements.filter((a) => a._id !== id));
    // TODO: add DELETE endpoint if needed
  }

  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-xl border border-border bg-card p-6"
      >
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Mail size={16} className="text-accent" />
          Post Announcement
        </h3>
        <p className="text-xs text-muted mb-4">
          This will be visible to all students in their notification bell.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deadline Extended, New Feature Released..."
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the announcement details..."
              rows={4}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-muted resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(["normal", "important", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                    priority === p
                      ? priorityColors[p]
                      : "border-border text-muted hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePost}
            disabled={loading || !title.trim() || !message.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              !loading && title.trim() && message.trim()
                ? "bg-accent text-background hover:bg-accent-hover"
                : "bg-card border border-border text-muted cursor-not-allowed"
            )}
          >
            <Send size={14} />
            {loading ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      </motion.div>

      {/* Existing Announcements */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Posted Announcements</h3>
        {listLoading ? (
          <div className="text-center py-8 text-muted text-sm">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">No announcements yet</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase",
                        priorityColors[a.priority as keyof typeof priorityColors]
                      )}>
                        {a.priority}
                      </span>
                      <span className="text-[10px] text-muted">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mb-1">{a.title}</p>
                    <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{a.message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Live FAQs Tab ─────────────────────────────────────────────────────────────
// Displays all FAQs with count, edit/rewrite, and delete buttons.

interface LiveFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  categoryId: number;
  tags: string[];
  keywords: string[];
  lastUpdated: string;
  isPublished: boolean;
  version: number;
}

function FaqCard({
  faq,
  idx,
  onEdit,
  onDelete,
  onPublish,
  publishingId,
}: {
  faq: LiveFaq;
  idx: number;
  onEdit: (faq: LiveFaq) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  publishingId: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent">
              {faq.id}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted">
              {faq.category}
            </span>
            <span className="text-xs text-muted">
              v{faq.version}
            </span>
            {!faq.isPublished && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
                draft
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-relaxed mb-1">
            {faq.question}
          </p>
          <p className="text-xs text-muted line-clamp-2">
            {faq.answer}
          </p>
          <p className="text-xs text-muted mt-1">
            Updated: {faq.lastUpdated} | Tags: {faq.tags.length > 0 ? faq.tags.join(", ") : "none"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!faq.isPublished && (
            <button
              onClick={() => onPublish(faq.id)}
              disabled={publishingId === faq.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-success/30 text-success hover:bg-success/10 transition-all disabled:opacity-50"
            >
              {publishingId === faq.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Publish
            </button>
          )}
          <button
            onClick={() => onEdit(faq)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted hover:text-foreground hover:border-muted transition-all"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={() => onDelete(faq.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-all"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LiveFaqstab() {
  const [faqs, setFaqs] = useState<LiveFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState<LiveFaq | null>(null);
  const [editForm, setEditForm] = useState({
    question: "",
    answer: "",
    category: "",
    categoryId: 1,
    tags: "",
    keywords: "",
  });
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faqs?admin=true");
      const data = await res.json();
      if (data.ok) {
        setFaqs(data.faqs as LiveFaq[]);
      } else {
        toast.error("Failed to load FAQs");
      }
    } catch {
      toast.error("Network error — could not load FAQs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const openEdit = (faq: LiveFaq) => {
    setEditingFaq(faq);
    setEditForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      categoryId: faq.categoryId,
      tags: faq.tags.join(", "),
      keywords: faq.keywords.join(", "),
    });
  };

  const handleSave = async () => {
    if (!editingFaq) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/faqs/${editingFaq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: editForm.question,
          answer: editForm.answer,
          category: editForm.category,
          categoryId: editForm.categoryId,
          tags: editForm.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
          keywords: editForm.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("FAQ updated successfully");
        setEditingFaq(null);
        void loadFaqs();
      } else {
        toast.error(data.error?.message ?? "Failed to update FAQ");
      }
    } catch {
      toast.error("Network error — could not update FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faqId: string) => {
    if (!confirm("Are you sure you want to delete this FAQ? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/faqs/${faqId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("FAQ deleted successfully");
        setFaqs((prev) => prev.filter((f) => f.id !== faqId));
      } else {
        toast.error(data.error?.message ?? "Failed to delete FAQ");
      }
    } catch {
      toast.error("Network error — could not delete FAQ");
    }
  };

  const handlePublish = async (faqId: string) => {
    setPublishingId(faqId);
    try {
      const res = await fetch(`/api/faqs/${faqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: true }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("FAQ published successfully");
        setFaqs((prev) =>
          prev.map((f) => (f.id === faqId ? { ...f, isPublished: true, version: data.faq.version } : f))
        );
      } else {
        toast.error(data.error?.message ?? "Failed to publish FAQ");
      }
    } catch {
      toast.error("Network error — could not publish FAQ");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Live FAQs</h2>
          <p className="text-xs text-muted">
            Manage all FAQs. Edit, rewrite, or delete entries.
          </p>
        </div>
        <button
          onClick={loadFaqs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted hover:text-foreground hover:border-muted transition-all text-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookText size={16} className="text-accent" />
            <span className="text-xs text-muted">Total FAQs</span>
          </div>
          <p className="text-2xl font-bold">{faqs.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-success" />
            <span className="text-xs text-muted">Published</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {faqs.filter((f) => f.isPublished).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-muted" />
            <span className="text-xs text-muted">Unpublished</span>
          </div>
          <p className="text-2xl font-bold">
            {faqs.filter((f) => !f.isPublished).length}
          </p>
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16 text-muted text-sm">Loading FAQs...</div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12">
            <BookText size={48} className="text-muted mx-auto mb-4 opacity-30" />
            <p className="text-muted">No FAQs found.</p>
          </div>
        ) : (
          <>
            {/* Unpublished (Drafts) */}
            {faqs.filter((f) => !f.isPublished).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-yellow-500 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Unpublished ({faqs.filter((f) => !f.isPublished).length})
                </h3>
                <div className="space-y-3">
                  {faqs.filter((f) => !f.isPublished).map((faq, idx) => (
                    <FaqCard
                      key={faq.id}
                      faq={faq}
                      idx={idx}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onPublish={handlePublish}
                      publishingId={publishingId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Published */}
            {faqs.filter((f) => f.isPublished).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
                  <CheckCircle size={14} />
                  Published ({faqs.filter((f) => f.isPublished).length})
                </h3>
                <div className="space-y-3">
                  {faqs.filter((f) => f.isPublished).map((faq, idx) => (
                    <FaqCard
                      key={faq.id}
                      faq={faq}
                      idx={idx}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onPublish={handlePublish}
                      publishingId={publishingId}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit/Rewrite Modal */}
      <AnimatePresence>
        {editingFaq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingFaq(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Pencil size={18} className="text-accent" />
                  <h3 className="text-sm font-semibold">Rewrite FAQ: {editingFaq.id}</h3>
                </div>
                <button
                  onClick={() => setEditingFaq(null)}
                  className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Question</label>
                  <input
                    type="text"
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">Answer</label>
                  <textarea
                    value={editForm.answer}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                    rows={8}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Category</label>
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Category ID</label>
                    <input
                      type="number"
                      value={editForm.categoryId}
                      onChange={(e) => setEditForm({ ...editForm, categoryId: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    <Tag size={12} className="inline mr-1" />
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="e.g. noc, deadline, application"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-muted"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    <Tag size={12} className="inline mr-1" />
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.keywords}
                    onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                    placeholder="e.g. noc, objection certificate, permission"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-muted"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !editForm.question.trim() || !editForm.answer.trim()}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                      !saving && editForm.question.trim() && editForm.answer.trim()
                        ? "bg-accent text-background hover:bg-accent-hover"
                        : "bg-card border border-border text-muted cursor-not-allowed"
                    )}
                  >
                    <Send size={14} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditingFaq(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted hover:bg-background transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}