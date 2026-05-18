import fs from "fs";
import { db } from "../db";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";

interface UploadResult {
  success: boolean;
  error?: string;
  publishId?: string;
}

// Refresh Google OAuth2 Token (YouTube)
export async function refreshYouTubeToken(accountId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[UPLOAD] YouTube client credentials missing. Skipping token refresh.");
    return null;
  }

  try {
    console.log(`[UPLOAD] Refreshing YouTube OAuth token for account ID: ${accountId}`);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`Google token endpoint returned status ${res.status}`);
    const data = await res.json();

    const accessToken = data.access_token;
    const expiresSeconds = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresSeconds * 1000);

    // Save back to DB
    await db.update(accounts).set({
      accessToken,
      tokenExpiresAt: expiresAt,
    }).where(eq(accounts.id, accountId));

    console.log("[UPLOAD] YouTube OAuth token refreshed successfully!");
    return accessToken;
  } catch (error) {
    console.error("[UPLOAD] Failed to refresh YouTube OAuth token:", error);
    return null;
  }
}

// Refresh TikTok OAuth2 Token
export async function refreshTikTokToken(accountId: string, refreshToken: string): Promise<string | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    console.warn("[UPLOAD] TikTok client credentials missing. Skipping token refresh.");
    return null;
  }

  try {
    console.log(`[UPLOAD] Refreshing TikTok OAuth token for account ID: ${accountId}`);
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`TikTok token endpoint returned status ${res.status}`);
    const data = await res.json();

    const accessToken = data.access_token;
    const expiresSeconds = data.expires_in || 86400; // TikTok tokens usually expire in 24 hours
    const expiresAt = new Date(Date.now() + expiresSeconds * 1000);

    // TikTok can also return a new refresh token
    const newRefreshToken = data.refresh_token || refreshToken;

    // Save back to DB
    await db.update(accounts).set({
      accessToken,
      refreshToken: newRefreshToken,
      tokenExpiresAt: expiresAt,
    }).where(eq(accounts.id, accountId));

    console.log("[UPLOAD] TikTok OAuth token refreshed successfully!");
    return accessToken;
  } catch (error) {
    console.error("[UPLOAD] Failed to refresh TikTok OAuth token:", error);
    return null;
  }
}

// Upload Video to YouTube Shorts via Multipart Upload Protocol
export async function uploadToYouTubeShorts(
  videoPath: string,
  title: string,
  description: string,
  accessToken: string
): Promise<UploadResult> {
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at path: ${videoPath}`);
    }

    const videoBuffer = fs.readFileSync(videoPath);
    const boundary = "clipper_fyp_youtube_multipart_boundary";

    const metadata = {
      snippet: {
        title: title,
        description: description,
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPartHeader = `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`;
    const mediaPartFooter = `\r\n--${boundary}--`;

    const body = Buffer.concat([
      Buffer.from(metadataPart),
      Buffer.from(mediaPartHeader),
      videoBuffer,
      Buffer.from(mediaPartFooter),
    ]);

    console.log(`[UPLOAD] Sending multipart upload to YouTube API (${(body.length / 1024 / 1024).toFixed(2)} MB)...`);
    const res = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": body.length.toString(),
      },
      body: body,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`YouTube API returned status ${res.status}. Response: ${errorText}`);
    }

    const data = await res.json();
    return {
      success: true,
      publishId: data.id,
    };
  } catch (error: any) {
    console.error("[UPLOAD] YouTube Shorts upload failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Upload Video to TikTok via Direct Post API Protocol
export async function uploadToTikTok(
  videoPath: string,
  caption: string,
  accessToken: string
): Promise<UploadResult> {
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at path: ${videoPath}`);
    }

    const videoBuffer = fs.readFileSync(videoPath);
    const videoSizeBytes = videoBuffer.length;

    // Step 1: Initialize Upload Session
    console.log("[UPLOAD] Initializing TikTok upload session...");
    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSizeBytes,
          chunk_size: videoSizeBytes,
          total_chunk_count: 1,
        },
      }),
    });

    if (!initRes.ok) {
      const errorText = await initRes.text();
      throw new Error(`TikTok Direct Post Init failed. Status: ${initRes.status}. Response: ${errorText}`);
    }

    const initData = await initRes.json();
    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;

    if (!uploadUrl) {
      throw new Error(`Failed to obtain upload URL from TikTok initialization.`);
    }

    // Step 2: Upload Video Binary File
    console.log(`[UPLOAD] Uploading video to TikTok endpoint: ${uploadUrl.substring(0, 50)}...`);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoSizeBytes.toString(),
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`TikTok video chunk upload failed. Status: ${uploadRes.status}. Response: ${errorText}`);
    }

    console.log("[UPLOAD] TikTok video upload successfully transmitted!");
    return {
      success: true,
      publishId,
    };
  } catch (error: any) {
    console.error("[UPLOAD] TikTok upload failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
