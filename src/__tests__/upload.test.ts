import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { db } from "../db";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  refreshYouTubeToken,
  refreshTikTokToken,
  uploadToYouTubeShorts,
  uploadToTikTok,
} from "../lib/upload";

describe("Upload Services & Auth Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("refreshYouTubeToken", () => {
    it("should refresh Google token and save it to the DB", async () => {
      await db.insert(accounts).values({
        id: "acc-yt-test",
        name: "YouTube Tester",
        niche: "Gaming",
        type: "specific",
        targetPlatform: "shorts",
        refreshToken: "yt-refresh-token",
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-yt-access-token",
          expires_in: 3600,
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const token = await refreshYouTubeToken("acc-yt-test", "yt-refresh-token");

      expect(token).toBe("new-yt-access-token");

      const [acc] = await db.select().from(accounts).where(eq(accounts.id, "acc-yt-test"));
      expect(acc.accessToken).toBe("new-yt-access-token");
      expect(acc.tokenExpiresAt).toBeDefined();
    });

    it("should return null if API returns error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });
      vi.stubGlobal("fetch", mockFetch);

      const token = await refreshYouTubeToken("acc-yt-test", "yt-refresh-token");
      expect(token).toBeNull();
    });
  });

  describe("refreshTikTokToken", () => {
    it("should refresh TikTok token and save it to the DB", async () => {
      await db.insert(accounts).values({
        id: "acc-tt-test",
        name: "TikTok Tester",
        niche: "Gaming",
        type: "specific",
        targetPlatform: "tiktok",
        refreshToken: "tt-refresh-token",
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-tt-access-token",
          expires_in: 86400,
          refresh_token: "new-tt-refresh-token",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const token = await refreshTikTokToken("acc-tt-test", "tt-refresh-token");

      expect(token).toBe("new-tt-access-token");

      const [acc] = await db.select().from(accounts).where(eq(accounts.id, "acc-tt-test"));
      expect(acc.accessToken).toBe("new-tt-access-token");
      expect(acc.refreshToken).toBe("new-tt-refresh-token");
    });
  });

  describe("uploadToYouTubeShorts", () => {
    it("should perform multipart upload successfully", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("fake-video-content"));

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "youtube-video-id-123",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await uploadToYouTubeShorts(
        "public/clips/clip-1.mp4",
        "My Cool Shorts Title",
        "Shorts description!",
        "valid-access-token"
      );

      expect(result.success).toBe(true);
      expect(result.publishId).toBe("youtube-video-id-123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("youtube/v3/videos"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer valid-access-token",
            "Content-Type": expect.stringContaining("multipart/related; boundary="),
          }),
        })
      );
    });

    it("should fail gracefully if video file does not exist", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      const result = await uploadToYouTubeShorts(
        "invalid-path.mp4",
        "Title",
        "Desc",
        "token"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Video file not found");
    });
  });

  describe("uploadToTikTok", () => {
    it("should perform TikTok upload (init + publish) successfully", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("fake-video"));

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              upload_url: "https://tiktok.upload.api/chunk",
              publish_id: "tiktok-publish-id-123",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "success",
        });
      vi.stubGlobal("fetch", mockFetch);

      const result = await uploadToTikTok(
        "public/clips/clip-2.mp4",
        "Viral TikTok Caption!",
        "valid-access-token"
      );

      expect(result.success).toBe(true);
      expect(result.publishId).toBe("tiktok-publish-id-123");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
