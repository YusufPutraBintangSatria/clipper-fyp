import { describe, it, expect } from "vitest";
import { db } from "../db";
import { accounts, sourceVideos, clips, schedules } from "../db/schema";
import { eq } from "drizzle-orm";

describe("Database & ORM Schema Tests", () => {
  it("should successfully insert and retrieve an account", async () => {
    const testAccount = {
      id: "acc-123",
      name: "Test Account",
      niche: "Gaming",
      type: "specific",
      targetPlatform: "tiktok",
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      tokenExpiresAt: new Date(),
    };

    await db.insert(accounts).values(testAccount);

    const [retrieved] = await db.select().from(accounts).where(eq(accounts.id, testAccount.id));
    expect(retrieved).toBeDefined();
    expect(retrieved.name).toBe(testAccount.name);
    expect(retrieved.niche).toBe(testAccount.niche);
  });

  it("should successfully insert and retrieve a source video", async () => {
    const testVideo = {
      id: "vid-123",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Rick Astley - Never Gonna Give You Up",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
      duration: 212,
      author: "Rick Astley",
    };

    await db.insert(sourceVideos).values(testVideo);

    const [retrieved] = await db.select().from(sourceVideos).where(eq(sourceVideos.id, testVideo.id));
    expect(retrieved).toBeDefined();
    expect(retrieved.title).toBe(testVideo.title);
    expect(retrieved.author).toBe(testVideo.author);
  });

  it("should successfully create a clip linked to a source video and account", async () => {
    // Insert Account and Video first due to Foreign Key constraints
    await db.insert(accounts).values({
      id: "acc-456",
      name: "Account 2",
      niche: "Comedy",
      type: "random",
      targetPlatform: "all",
    });

    await db.insert(sourceVideos).values({
      id: "vid-456",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Another Video",
    });

    const testClip = {
      id: "clip-123",
      sourceVideoId: "vid-456",
      accountId: "acc-456",
      title: "Cool Clip",
      startTime: 10,
      endTime: 30,
      status: "pending",
      caption: "Funny moment!",
      hashtags: "#funny #lol",
    };

    await db.insert(clips).values(testClip);

    const [retrieved] = await db.select().from(clips).where(eq(clips.id, testClip.id));
    expect(retrieved).toBeDefined();
    expect(retrieved.title).toBe(testClip.title);
    expect(retrieved.status).toBe("pending");
  });

  it("should successfully create a schedule linked to a clip", async () => {
    await db.insert(accounts).values({
      id: "acc-789",
      name: "Account 3",
      niche: "Education",
      type: "specific",
      targetPlatform: "shorts",
    });

    await db.insert(sourceVideos).values({
      id: "vid-789",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Edu Video",
    });

    await db.insert(clips).values({
      id: "clip-789",
      sourceVideoId: "vid-789",
      accountId: "acc-789",
      title: "Edu Clip",
      startTime: 0,
      endTime: 60,
    });

    const testSchedule = {
      id: "sched-123",
      clipId: "clip-789",
      publishTime: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      status: "scheduled",
      platform: "shorts",
    };

    await db.insert(schedules).values(testSchedule);

    const [retrieved] = await db.select().from(schedules).where(eq(schedules.id, testSchedule.id));
    expect(retrieved).toBeDefined();
    expect(retrieved.platform).toBe("shorts");
    expect(retrieved.status).toBe("scheduled");
  });
});
