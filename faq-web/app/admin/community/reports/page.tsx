"use client";

import { useEffect, useState } from "react";
import { Check, X, AlertTriangle, Flag, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

interface Report {
  _id: string;
  answerId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: string;
  createdAt: string;
  answer?: {
    answer: string;
    authorName: string;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async (status = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/community/reports?${params}`);
      const data = await res.json();
      setReports(data.reports);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleResolve = async (report: Report, action: "dismiss" | "resolve", hideContent = false) => {
    setActionLoading(report._id);
    try {
      const res = await fetch(`/api/admin/community/reports/${report._id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hideContent }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      toast.success(action === "dismiss" ? "Report dismissed" : "Report resolved");
      setSelectedReport(null);
      fetchReports();
    } catch {
      toast.error("Failed to resolve report");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    dismissed: "bg-slate-100 text-slate-800",
  };

  const reasonLabels: Record<string, string> = {
    spam: "Spam",
    inappropriate: "Inappropriate Content",
    harassment: "Harassment",
    misinformation: "Misinformation",
    other: "Other",
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
        <h1 className="text-2xl font-bold">Content Reports</h1>
        <p className="text-muted-foreground">Manage reported content</p>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Reports ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports found
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div
                    key={r._id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReport?._id === r._id
                        ? "border-red-500 bg-red-50"
                        : "hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {reasonLabels[r.reason] || r.reason}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>By {r.reporterName}</span>
                          <span>•</span>
                          <span>{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                      <Badge className={statusColors[r.status] || "bg-slate-100"}>
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Report Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReport ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Reason</h3>
                  <Badge variant="outline">
                    {reasonLabels[selectedReport.reason] || selectedReport.reason}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Reported By</h3>
                  <p className="text-sm">{selectedReport.reporterName}</p>
                </div>

                {selectedReport.answer && (
                  <div>
                    <h3 className="font-semibold mb-2">Reported Answer</h3>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">
                      {selectedReport.answer.answer}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {selectedReport.answer.authorName}
                    </p>
                  </div>
                )}

                {selectedReport.status === "pending" && (
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <p className="text-sm font-medium">Actions</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleResolve(selectedReport, "dismiss")}
                        disabled={actionLoading === selectedReport._id}
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => handleResolve(selectedReport, "resolve")}
                        disabled={actionLoading === selectedReport._id}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Resolve & Hide
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select a report to review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}