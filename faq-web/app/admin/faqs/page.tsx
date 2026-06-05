"use client";

import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/admin/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

interface FAQ {
  _id: string;
  id: string;
  question: string;
  answer: string;
  category: string;
  categoryId: number;
  tags: string[];
  helpful: number;
  notHelpful: number;
  isPublished: boolean;
  version: number;
  lastUpdated: string;
}

interface Category {
  _id: string;
  id: number;
  name: string;
  icon: string;
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "",
    categoryId: 0,
    tags: "",
    isPublished: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchFaqs = async (page = 1, searchVal = search, category = categoryFilter, status = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(searchVal && { search: searchVal }),
        ...(category && { category }),
        ...(status && { status }),
      });
      const res = await fetch(`/api/admin/faqs?${params}`);
      const data = await res.json();
      setFaqs(data.faqs);
      setCategories(data.categories);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchFaqs(1, value, categoryFilter, statusFilter);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    fetchFaqs(1, search, value, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    fetchFaqs(1, search, categoryFilter, value);
  };

  const handleCreate = async () => {
    if (!formData.question || !formData.answer || !formData.category) {
      toast.error("Question, answer, and category are required");
      return;
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c.name === formData.category);
      const res = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          categoryId: cat?.id || formData.categoryId,
          tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("FAQ created successfully");
      setIsCreateOpen(false);
      resetForm();
      fetchFaqs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      categoryId: faq.categoryId,
      tags: faq.tags.join(", "),
      isPublished: faq.isPublished,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingFaq) return;
    setSaving(true);
    try {
      const cat = categories.find((c) => c.name === formData.category);
      const res = await fetch(`/api/admin/faqs/${editingFaq._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          categoryId: cat?.id || formData.categoryId,
          tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("FAQ updated successfully");
      setIsEditOpen(false);
      setEditingFaq(null);
      resetForm();
      fetchFaqs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faq: FAQ) => {
    if (!confirm(`Unpublish "${faq.question.slice(0, 30)}..."?`)) return;
    try {
      const res = await fetch(`/api/admin/faqs/${faq._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("FAQ unpublished");
      fetchFaqs();
    } catch {
      toast.error("Failed to unpublish FAQ");
    }
  };

  const resetForm = () => {
    setFormData({ question: "", answer: "", category: "", categoryId: 0, tags: "", isPublished: true });
  };

  const columns: ColumnDef<FAQ>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "question",
      header: "Question",
      cell: ({ row }) => (
        <div className="max-w-md truncate">{row.getValue("question") as string}</div>
      ),
    },
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "helpful",
      header: "Votes",
      cell: ({ row }) => {
        const helpful = row.original.helpful;
        const notHelpful = row.original.notHelpful;
        return (
          <span className="text-sm">
            <span className="text-green-600">+{helpful}</span> /{" "}
            <span className="text-red-600">-{notHelpful}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "isPublished",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("isPublished") ? "default" : "secondary"}>
          {row.getValue("isPublished") ? "Published" : "Draft"}
        </Badge>
      ),
    },
    { accessorKey: "lastUpdated", header: "Updated" },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.original)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Unpublish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FAQ Management</h1>
          <p className="text-muted-foreground">Manage your FAQs</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={(v: string | null) => handleCategoryFilter(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v: string | null) => handleStatusFilter(v ?? "")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={faqs} searchKey="question" searchPlaceholder="Search by question..." />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New FAQ</DialogTitle>
            <DialogDescription>Create a new FAQ entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="What is the refund policy?"
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the answer..."
                className="min-h-32"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v: string | null) => setFormData({ ...formData, category: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="refund, payment, policy"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>Update FAQ details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                className="min-h-32"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v: string | null) => setFormData({ ...formData, category: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={formData.isPublished ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, isPublished: true })}
              >
                <Eye className="mr-2 h-4 w-4" />
                Published
              </Button>
              <Button
                variant={!formData.isPublished ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, isPublished: false })}
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Draft
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}