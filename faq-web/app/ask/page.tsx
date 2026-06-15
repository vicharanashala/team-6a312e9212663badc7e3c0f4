"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import YakshaChat from "@/components/YakshaChat";
import type { FAQ, Category } from "@/data/faqData";
import FAQSuggestionBox from "@/components/FAQSuggestionBox";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Mail,
  ImagePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AskPage() {
  const [faqData, setFaqData] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [images, setImages] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/faqs");
        const data = await res.json();
        if (data.ok) {
          setFaqData(data.faqs ?? []);
          setCategories(data.categories ?? []);
        }
      } catch (err) {
        console.error("[AskPage] Failed to load FAQs:", err);
      }
    };
    void load();
  }, []);

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...imageFiles].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleImages(e.dataTransfer.files);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (!category) {
      setSubmitError("Please select a category.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);

    try {
      // Convert images to base64 data URLs
      const imagePromises = images.map((file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
      );
      const imageDataUrls = await Promise.all(imagePromises);

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          category,
          email,
          priority,
          images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        setSubmitted(true);
        setImages([]);
      } else {
        setSubmitError(data.error?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <CheckCircle size={64} className="text-success mx-auto mb-6" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-3"
          >
            Question Submitted!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted mb-8"
          >
            Our team will review and answer your question soon. You&apos;ll be
            notified when it&apos;s resolved.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 justify-center"
          >
            <button
              onClick={() => {
                setSubmitted(false);
                setQuestion("");
                setCategory("");
                setSubmitError("");
              }}
              className="px-5 py-2.5 rounded-xl bg-accent text-background font-medium hover:bg-accent-hover transition-colors"
            >
              Ask Another
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-card transition-colors"
            >
              Back to FAQ
            </a>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Ask a <span className="text-accent">Question</span>
          </h1>
          <p className="text-muted text-sm">
            Can&apos;t find your answer? Submit your question and our team will
            respond.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="lg:col-span-2 space-y-5"
          >
            {/* Question Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Question *
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here... (e.g., 'How do I submit my NOC if my college is closed?')"
                rows={4}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none placeholder:text-muted"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
                <option value="Others"> Others</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Email (for notification)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-muted"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Priority
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPriority("normal")}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    priority === "normal"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:border-muted"
                  )}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("urgent")}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    priority === "urgent"
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border text-muted hover:border-muted"
                  )}
                >
                  <AlertCircle size={14} className="inline mr-1" />
                  Urgent
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Attach Images <span className="text-muted">(optional, max 5)</span>
              </label>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all",
                  dragOver
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50 hover:bg-card/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImages(e.target.files)}
                  className="hidden"
                />
                <ImagePlus size={24} className="mx-auto mb-2 text-muted" />
                <p className="text-sm text-muted">
                  Drag & drop images here or <span className="text-accent">browse</span>
                </p>
                <p className="text-xs text-muted/60 mt-1">PNG, JPG, GIF up to 5MB each</p>
              </div>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {images.map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${i + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
                <AlertCircle size={16} />
                {submitError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!question.trim() || !category || submitting}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm transition-all",
                question.trim() && category && !submitting
                  ? "bg-accent text-background hover:bg-accent-hover shadow-lg shadow-accent/20"
                  : "bg-card text-muted border border-border cursor-not-allowed"
              )}
            >
              <Send size={16} />
              {submitting ? "Submitting…" : "Submit Question"}
            </button>
          </motion.form>

          {/* Sidebar Tips */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <FAQSuggestionBox question={question} faqData={faqData} />

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2">Response Time</h3>
              <p className="text-xs text-muted">
                Normal questions are typically answered within 24 hours. Urgent
                questions are prioritized.
              </p>
            </div>
          </motion.aside>
        </div>
      </main>

      <YakshaChat />
    </div>
  );
}
