/**
 * src/models/Announcement.ts
 *
 * Admin broadcast announcements visible to all students.
 *
 * Admins create announcements via the /admin panel.
 * Students see them in the notification bell.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  priority: "normal" | "important" | "urgent";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    createdBy: { type: String, default: "admin" },
  },
  { timestamps: true, collection: "announcements" }
);

AnnouncementSchema.index({ createdAt: -1 });

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ??
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);

export default Announcement;
