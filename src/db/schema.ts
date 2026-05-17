import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  niche: text("niche").notNull(), // e.g. "Gaming", "Motivasi", "YouTuber A"
  type: text("type").notNull(),  // e.g. "specific", "random"
  targetPlatform: text("target_platform").notNull(), // e.g. "tiktok", "shorts", "all"
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const sourceVideos = sqliteTable("source_videos", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  duration: integer("duration"), // durasi dalam detik
  author: text("author"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const clips = sqliteTable("clips", {
  id: text("id").primaryKey(),
  sourceVideoId: text("source_video_id")
    .notNull()
    .references(() => sourceVideos.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  startTime: integer("start_time").notNull(), // timestamp mulai (detik)
  endTime: integer("end_time").notNull(),   // timestamp selesai (detik)
  status: text("status").notNull().default("pending"), // pending, rendering, ready, failed
  videoPath: text("video_path"),
  caption: text("caption"),
  hashtags: text("hashtags"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  clipId: text("clip_id")
    .notNull()
    .references(() => clips.id, { onDelete: "cascade" }),
  publishTime: integer("publish_time", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, published, failed
  platform: text("platform").notNull(), // tiktok, shorts
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// Relationships
export const accountsRelations = relations(accounts, ({ many }) => ({
  clips: many(clips),
}));

export const sourceVideosRelations = relations(sourceVideos, ({ many }) => ({
  clips: many(clips),
}));

export const clipsRelations = relations(clips, ({ one, many }) => ({
  sourceVideo: one(sourceVideos, {
    fields: [clips.sourceVideoId],
    references: [sourceVideos.id],
  }),
  account: one(accounts, {
    fields: [clips.accountId],
    references: [accounts.id],
  }),
  schedules: many(schedules),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  clip: one(clips, {
    fields: [schedules.clipId],
    references: [clips.id],
  }),
}));

import { sql } from "drizzle-orm";
