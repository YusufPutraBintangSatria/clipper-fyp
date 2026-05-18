import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { db } from "./db";
import { clips, sourceVideos, schedules, accounts } from "./db/schema";
import { eq, and, lte, isNull } from "drizzle-orm";
import {
  refreshYouTubeToken,
  refreshTikTokToken,
  uploadToYouTubeShorts,
  uploadToTikTok,
} from "./lib/upload";

// Load environment variables
dotenv.config();

// Ensure output directories exist
fs.mkdirSync("public/clips", { recursive: true });
fs.mkdirSync("temp", { recursive: true });

// Helper to format seconds to HH:MM:SS for yt-dlp
function toHHMMSS(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Promisified child_process.spawn
function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] Running: ${command} ${args.join(" ")}`);
    const proc = spawn(command, args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}.\nError: ${stderr}`));
      }
    });
  });
}

// Generate Captions and Hashtags using Gemini API
async function generateAIMetadata(clipTitle: string, videoTitle: string): Promise<{ caption: string; hashtags: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[AI] No GEMINI_API_KEY found. Skipping AI metadata generation.");
    return { caption: "", hashtags: "" };
  }

  console.log(`[AI] Generating viral caption and hashtags for clip: "${clipTitle}"`);
  const prompt = `Anda adalah asisten pembuat konten TikTok/YouTube Shorts. Buatkan caption singkat yang sangat menarik dan interaktif, serta 5-8 hashtag populer untuk video klip berjudul "${clipTitle}" dari video original "${videoTitle}". Format output harus JSON dengan field "caption" dan "hashtags" (string dipisahkan spasi). Jangan sertakan markdown atau teks penjelasan lainnya, hanya JSON.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(text);
    return {
      caption: parsed.caption || `Momen menarik dari ${videoTitle}! 🔥`,
      hashtags: parsed.hashtags || "#fyp #shorts #viral",
    };
  } catch (error) {
    console.error("[AI] Error generating AI metadata:", error);
    return { caption: "", hashtags: "" };
  }
}

// Generate Subtitles (SRT) from Audio using Gemini API
async function generateAISubtitles(audioPath: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[AI] No GEMINI_API_KEY found. Skipping subtitle transcription.");
    return "";
  }

  console.log("[AI] Sending audio to Gemini for SRT transcription...");
  try {
    const audioBase64 = fs.readFileSync(audioPath).toString("base64");
    const prompt = "Transkripsikan audio ini ke format subtitle SRT dengan timestamp. Output harus berupa konten SRT mentah saja tanpa penjelasan apa pun.";

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "audio/mp3",
                  data: audioBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("[AI] Error generating AI subtitles:", error);
    return "";
  }
}

// Core function to process a video clip
async function processClip(clip: any) {
  const tempSegment = path.join("temp", `${clip.id}_temp.mp4`);
  const tempCrop = path.join("temp", `${clip.id}_crop.mp4`);
  const tempAudio = path.join("temp", `${clip.id}_audio.mp3`);
  const tempSrt = path.join("temp", `${clip.id}_subs.srt`);
  const finalClipPath = path.join("public", "clips", `${clip.id}.mp4`);

  try {
    console.log(`\n==================================================`);
    console.log(`[WORKER] Starting video processing for Clip ID: ${clip.id}`);
    console.log(`[WORKER] Title: "${clip.title}"`);
    console.log(`[WORKER] Range: ${clip.startTime}s - ${clip.endTime}s`);
    console.log(`==================================================`);

    // 1. Get source video details
    const [sourceVideo] = await db.select().from(sourceVideos).where(eq(sourceVideos.id, clip.sourceVideoId));
    if (!sourceVideo) {
      throw new Error(`Source video not found for ID: ${clip.sourceVideoId}`);
    }

    // Update status to rendering
    await db.update(clips).set({ status: "rendering" }).where(eq(clips.id, clip.id));

    // 2. Download specific section using yt-dlp
    console.log(`[VIDEO] Downloading segment from: ${sourceVideo.url}`);
    const startStr = toHHMMSS(clip.startTime);
    const endStr = toHHMMSS(clip.endTime);

    // Try downloading segment directly
    try {
      await runCommand("yt-dlp", [
        "-f", "mp4",
        "--download-sections", `*${startStr}-${endStr}`,
        "--force-overwrites",
        sourceVideo.url,
        "-o", tempSegment,
      ]);
    } catch (dlError) {
      console.warn(`[VIDEO] yt-dlp segment download failed, trying alternative/fallback...`);
      // Fallback: Download full and cut using FFmpeg
      const tempFull = path.join("temp", `${clip.id}_full.mp4`);
      await runCommand("yt-dlp", ["-f", "mp4", "--force-overwrites", sourceVideo.url, "-o", tempFull]);
      await runCommand("ffmpeg", [
        "-y",
        "-i", tempFull,
        "-ss", clip.startTime.toString(),
        "-to", clip.endTime.toString(),
        "-c", "copy",
        tempSegment,
      ]);
      if (fs.existsSync(tempFull)) fs.unlinkSync(tempFull);
    }

    if (!fs.existsSync(tempSegment)) {
      throw new Error("Failed to download/create clip segment file.");
    }

    // 3. Crop to 9:16 vertical ratio using FFmpeg
    console.log(`[VIDEO] Cropping segment to 9:16 vertical ratio...`);
    await runCommand("ffmpeg", [
      "-y",
      "-i", tempSegment,
      "-vf", "crop=ih*9/16:ih",
      "-c:v", "libx264",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      tempCrop,
    ]);

    if (!fs.existsSync(tempCrop)) {
      throw new Error("Failed to crop vertical video.");
    }

    // 4. Generate AI Metadata (Caption & Hashtags) if empty
    let finalCaption = clip.caption;
    let finalHashtags = clip.hashtags;

    if (!clip.caption || clip.caption.startsWith("🔥 Gila keren")) {
      const aiMeta = await generateAIMetadata(clip.title, sourceVideo.title);
      if (aiMeta.caption && aiMeta.hashtags) {
        finalCaption = aiMeta.caption;
        finalHashtags = aiMeta.hashtags;
      }
    }

    // 5. AI Subtitles & Audio processing
    let subtitled = false;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      console.log(`[AUDIO] Extracting audio for AI transcription...`);
      await runCommand("ffmpeg", ["-y", "-i", tempCrop, "-q:a", "0", "-map", "a", tempAudio]);

      if (fs.existsSync(tempAudio)) {
        const srtContent = await generateAISubtitles(tempAudio);
        if (srtContent && srtContent.trim().length > 10) {
          fs.writeFileSync(tempSrt, srtContent);
          console.log(`[VIDEO] Subtitles generated successfully, burning into vertical video...`);

          try {
            // Burn subtitles
            // We use relative path with forward slashes to avoid Windows path issues with subtitles filter
            const relativeSrtPath = tempSrt.replace(/\\/g, "/");
            await runCommand("ffmpeg", [
              "-y",
              "-i", tempCrop,
              "-vf", `subtitles=${relativeSrtPath}:force_style='Alignment=2,FontSize=14,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,Outline=1'`,
              "-c:a", "copy",
              finalClipPath,
            ]);
            subtitled = true;
          } catch (burnError) {
            console.error(`[WARNING] Failed to burn subtitles into video:`, burnError);
          }
        }
      }
    }

    // If subtitle burning failed or was skipped, copy vertical crop as final video
    if (!subtitled) {
      console.log(`[VIDEO] Copying cropped video as final clip (without subtitles)...`);
      fs.copyFileSync(tempCrop, finalClipPath);
    }

    // 6. Update database with success
    const finalVideoPath = `/clips/${clip.id}.mp4`;
    await db.update(clips).set({
      status: "ready",
      videoPath: finalVideoPath,
      caption: finalCaption,
      hashtags: finalHashtags,
    }).where(eq(clips.id, clip.id));

    console.log(`[SUCCESS] Clip ${clip.id} is ready at ${finalVideoPath}!`);

  } catch (error: any) {
    console.error(`[ERROR] Processing failed for Clip ${clip.id}:`, error.message);
    await db.update(clips).set({ status: "failed" }).where(eq(clips.id, clip.id));
  } finally {
    // Cleanup temporary files
    [tempSegment, tempCrop, tempAudio, tempSrt].forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (e) {
          console.warn(`[CLEANUP] Failed to delete temporary file ${file}`);
        }
      }
    });
  }
}

// Polling schedules to publish automatically
async function checkSchedules() {
  try {
    const now = new Date();
    // Get scheduled uploads
    const pendingSchedules = await db
      .select({
        scheduleId: schedules.id,
        clipId: schedules.clipId,
        platform: schedules.platform,
        publishTime: schedules.publishTime,
        clipTitle: clips.title,
        clipCaption: clips.caption,
        clipHashtags: clips.hashtags,
        clipStatus: clips.status,
        clipVideoPath: clips.videoPath,
        accountId: accounts.id,
        accountName: accounts.name,
        accessToken: accounts.accessToken,
        refreshToken: accounts.refreshToken,
        tokenExpiresAt: accounts.tokenExpiresAt,
      })
      .from(schedules)
      .leftJoin(clips, eq(schedules.clipId, clips.id))
      .leftJoin(accounts, eq(clips.accountId, accounts.id))
      .where(and(eq(schedules.status, "scheduled"), lte(schedules.publishTime, now)));

    for (const sched of pendingSchedules) {
      if (sched.clipStatus !== "ready" || !sched.clipVideoPath) {
        console.log(`[SCHEDULE] Clip "${sched.clipTitle}" is scheduled but not yet 'ready' (current status: ${sched.clipStatus}). Skipping...`);
        continue;
      }

      console.log(`\n[AUTO-UPLOAD] Publishing schedule ID: ${sched.scheduleId}`);
      console.log(`[AUTO-UPLOAD] Clip: "${sched.clipTitle}"`);
      console.log(`[AUTO-UPLOAD] Account: "${sched.accountName}"`);
      console.log(`[AUTO-UPLOAD] Platform: ${sched.platform.toUpperCase()}`);

      // Update status to publishing
      await db.update(schedules).set({ status: "publishing" }).where(eq(schedules.id, sched.scheduleId));

      let uploadSuccess = false;
      let errorMsg = "";

      // Real integration logic if accessToken exists
      if (sched.accessToken) {
        let currentToken = sched.accessToken;
        const accountId = sched.accountId || "";
        const refreshToken = sched.refreshToken || "";
        const clipTitle = sched.clipTitle || "Clip";

        // Check if token is expired (or expires in < 5 minutes)
        if (sched.tokenExpiresAt && new Date(sched.tokenExpiresAt).getTime() - Date.now() < 5 * 60 * 1000 && sched.refreshToken) {
          console.log(`[AUTO-UPLOAD] Token for ${sched.accountName} is expired or expiring soon. Refreshing...`);
          let refreshedToken: string | null = null;
          if (sched.platform === "shorts") {
            refreshedToken = await refreshYouTubeToken(accountId, refreshToken);
          } else if (sched.platform === "tiktok") {
            refreshedToken = await refreshTikTokToken(accountId, refreshToken);
          }
          if (refreshedToken) {
            currentToken = refreshedToken;
          }
        }

        const absoluteVideoPath = path.join("public", sched.clipVideoPath.replace(/^\//, ""));
        const captionWithHashtags = `${clipTitle} ${sched.clipHashtags || ""}`.substring(0, 150);

        if (sched.platform === "shorts") {
          const uploadResult = await uploadToYouTubeShorts(absoluteVideoPath, clipTitle, sched.clipCaption || "", currentToken);
          uploadSuccess = uploadResult.success;
          errorMsg = uploadResult.error || "";
        } else if (sched.platform === "tiktok") {
          const uploadResult = await uploadToTikTok(absoluteVideoPath, captionWithHashtags, currentToken);
          uploadSuccess = uploadResult.success;
          errorMsg = uploadResult.error || "";
        }
      } else {
        // Fallback simulation
        console.log(`[AUTO-UPLOAD] No real accessToken found for account ${sched.accountName}. Simulating upload...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        uploadSuccess = true;
      }

      if (uploadSuccess) {
        // Update to published
        await db.update(schedules).set({ status: "published" }).where(eq(schedules.id, sched.scheduleId));
        console.log(`[AUTO-UPLOAD] Successfully published schedule ID: ${sched.scheduleId}!`);
      } else {
        // Rollback status to scheduled so it retries on next poll
        await db.update(schedules).set({ status: "scheduled" }).where(eq(schedules.id, sched.scheduleId));
        console.error(`[AUTO-UPLOAD] Failed to upload schedule ID: ${sched.scheduleId}. Error: ${errorMsg}`);
      }
    }
  } catch (error) {
    console.error("[SCHEDULE] Error checking schedules:", error);
  }
}

// File cleanup task (runs every 6 hours to clear video files older than 3 days)
async function runFileCleanup() {
  console.log("\n[CLEANUP] Running scheduled video file cleanup task...");
  try {
    const clipsDir = path.join("public", "clips");
    if (!fs.existsSync(clipsDir)) return;

    const files = fs.readdirSync(clipsDir);
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      if (file === ".gitkeep" || !file.endsWith(".mp4")) continue;

      const filePath = path.join(clipsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtime.getTime();

      if (fileAge > threeDaysMs) {
        console.log(`[CLEANUP] Deleting expired video file: ${file} (Age: ${(fileAge / 1000 / 60 / 60 / 24).toFixed(1)} days)`);
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    console.log(`[CLEANUP] Cleanup finished. Deleted ${deletedCount} file(s).\n`);
  } catch (error) {
    console.error("[CLEANUP] Error during file cleanup:", error);
  }
}

// Background poll loop
async function startWorker() {
  console.log("==================================================");
  console.log("🚀 Auto Clipper Background Worker Active!");
  console.log("Watching for pending / rendering clips & scheduled uploads...");
  console.log("Press Ctrl+C to terminate.");
  console.log("==================================================\n");

  let isProcessing = false;

  // Run cleanup task once immediately on startup
  runFileCleanup();

  // Run cleanup task every 6 hours
  setInterval(runFileCleanup, 6 * 60 * 60 * 1000);

  // Main loop interval for video rendering & auto upload polling
  setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // 1. Check for unrendered clips
      const pendingClips = await db
        .select()
        .from(clips)
        .where(isNull(clips.videoPath));

      for (const clip of pendingClips) {
        if (clip.status === "failed") continue; // Skip permanently failed ones
        await processClip(clip);
      }

      // 2. Check for scheduled uploads
      await checkSchedules();

    } catch (err) {
      console.error("[WORKER] Error in main loop:", err);
    } finally {
      isProcessing = false;
    }
  }, 5000); // Check every 5 seconds
}

startWorker();
