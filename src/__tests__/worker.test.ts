import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { db } from "../db";
import { accounts, sourceVideos, clips, schedules } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  toHHMMSS,
  runFileCleanup,
  generateAIMetadata,
  checkSchedules,
} from "../worker";
import * as uploadModule from "../lib/upload";

// Mock upload functions
vi.mock("../lib/upload", () => ({
  refreshYouTubeToken: vi.fn(),
  refreshTikTokToken: vi.fn(),
  uploadToYouTubeShorts: vi.fn().mockResolvedValue({ success: true }),
  uploadToTikTok: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Background Worker & Scheduler Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("toHHMMSS", () => {
    it("should format seconds into HH:MM:SS format", () => {
      expect(toHHMMSS(0)).toBe("00:00:00");
      expect(toHHMMSS(59)).toBe("00:00:59");
      expect(toHHMMSS(60)).toBe("00:01:00");
      expect(toHHMMSS(3600)).toBe("01:00:00");
      expect(toHHMMSS(3665)).toBe("01:01:05");
    });
  });

  describe("generateAIMetadata", () => {
    it("should return viral caption and hashtags from Gemini API response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      caption: "Viral Caption!",
                      hashtags: "#fyp #viral #test",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const metadata = await generateAIMetadata("Awesome Clip", "Original Video");

      expect(metadata.caption).toBe("Viral Caption!");
      expect(metadata.hashtags).toBe("#fyp #viral #test");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.any(Object)
      );
    });
  });

  describe("runFileCleanup", () => {
    it("should delete video files older than 3 days", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "clip-1.mp4",
        "clip-2.mp4",
        ".gitkeep",
      ] as any);

      const now = Date.now();
      const fourDaysAgo = now - 4 * 24 * 60 * 60 * 1000;
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      vi.spyOn(fs, "statSync").mockImplementation((filePath: string) => {
        if (filePath.endsWith("clip-1.mp4")) {
          return { mtime: new Date(fourDaysAgo) } as any;
        }
        return { mtime: new Date(oneDayAgo) } as any;
      });

      const unlinkSpy = vi.spyOn(fs, "unlinkSync").mockImplementation(() => {});

      await runFileCleanup();

      expect(unlinkSpy).toHaveBeenCalledTimes(1);
      expect(unlinkSpy).toHaveBeenCalledWith(expect.stringContaining("clip-1.mp4"));
    });
  });

  describe("checkSchedules", () => {
    it("should process and upload pending schedules that are past due", async () => {
      // 1. Setup Test Database Entries
      const testAccount = {
        id: "acc-scheduler",
        name: "Scheduler Account",
        niche: "Gaming",
        type: "specific",
        targetPlatform: "all",
        accessToken: "valid-acc-token",
        refreshToken: "valid-ref-token",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // Expiry 1 hr from now
      };

      const testVideo = {
        id: "vid-scheduler",
        url: "https://youtube.com/something",
        title: "Original Video Title",
      };

      const testClip = {
        id: "clip-scheduler",
        sourceVideoId: "vid-scheduler",
        accountId: "acc-scheduler",
        title: "Test Clip Title",
        startTime: 0,
        endTime: 30,
        status: "ready",
        videoPath: "/clips/clip-scheduler.mp4",
        caption: "Test Clip Caption",
        hashtags: "#gaming #test",
      };

      const pastDueSchedule = {
        id: "sched-past",
        clipId: "clip-scheduler",
        publishTime: new Date(Date.now() - 60 * 1000), // 1 minute in the past
        status: "scheduled",
        platform: "shorts",
      };

      await db.insert(accounts).values(testAccount);
      await db.insert(sourceVideos).values(testVideo);
      await db.insert(clips).values(testClip);
      await db.insert(schedules).values(pastDueSchedule);

      // Mock the YouTube upload call
      vi.mocked(uploadModule.uploadToYouTubeShorts).mockResolvedValue({
        success: true,
        publishId: "youtube-published-123",
      });

      // Mock path.join/fs to pretend clip file exists
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      // 2. Execute Schedule Check
      await checkSchedules();

      // 3. Assertions
      expect(uploadModule.uploadToYouTubeShorts).toHaveBeenCalled();
      const [sched] = await db.select().from(schedules).where(eq(schedules.id, "sched-past"));
      expect(sched.status).toBe("published");
    });
  });
});
