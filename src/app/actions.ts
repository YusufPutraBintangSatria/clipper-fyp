"use server";

import { db } from "@/db";
import { accounts, sourceVideos, clips, schedules } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// --- Accounts Actions ---
/**
 * Mengambil seluruh data akun dari database (SQLite).
 * Diurutkan berdasarkan tanggal pembuatan (terbaru di atas).
 * @returns {Promise<Array>} Array data akun.
 */
export async function getAccounts() {
  try {
    return await db.select().from(accounts).orderBy(desc(accounts.createdAt));
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return [];
  }
}

/**
 * Mendaftarkan akun target baru ke database.
 * Fungsi ini meng-generate UUID otomatis.
 * @param formData - Data form berisi nama, niche, tipe, dan target platform.
 */
export async function createAccount(formData: {
  name: string;
  niche: string;
  type: string;
  targetPlatform: string;
}) {
  try {
    const id = crypto.randomUUID();
    await db.insert(accounts).values({
      id,
      name: formData.name,
      niche: formData.niche,
      type: formData.type,
      targetPlatform: formData.targetPlatform,
      createdAt: new Date(),
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { success: false, error: "Gagal membuat akun" };
  }
}

/**
 * Menghapus akun berdasarkan ID-nya.
 * @param id - ID string unik akun yang ingin dihapus.
 */
export async function deleteAccount(id: string) {
  try {
    await db.delete(accounts).where(eq(accounts.id, id));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, error: "Gagal menghapus akun" };
  }
}

// --- Source Videos Actions ---
/**
 * Mengambil seluruh daftar video mentah (Source Video) dari database.
 */
export async function getSourceVideos() {
  try {
    return await db.select().from(sourceVideos).orderBy(desc(sourceVideos.createdAt));
  } catch (error) {
    console.error("Failed to fetch source videos:", error);
    return [];
  }
}

/**
 * Mendaftarkan URL video asli dari platform seperti YouTube/TikTok.
 * Otomatis menghitung durasi ke dalam detik dan mengekstrak thumbnail YouTube.
 * @param formData - Berisi url, title, string durasi (misal "15:30"), dan author.
 */
export async function addSourceVideo(formData: {
  url: string;
  title: string;
  durationString: string;
  author: string;
}) {
  try {
    // Parse duration to seconds (e.g. "10:30" -> 630)
    let durationSeconds = 0;
    const parts = formData.durationString.split(":");
    if (parts.length === 2) {
      durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else {
      durationSeconds = parseInt(formData.durationString) || 0;
    }

    const id = crypto.randomUUID();
    // Simple mock thumbnail
    const videoIdMatch = formData.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const thumbnail = videoIdMatch 
      ? `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`
      : "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=300&auto=format&fit=crop";

    await db.insert(sourceVideos).values({
      id,
      url: formData.url,
      title: formData.title,
      duration: durationSeconds,
      thumbnail,
      author: formData.author || "Unknown",
      createdAt: new Date(),
    });
    revalidatePath("/");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to add source video:", error);
    return { success: false, error: "Gagal menyimpan video" };
  }
}

// --- Clips Actions ---
/**
 * Mengambil seluruh riwayat klip potongan video.
 * Menggabungkan (JOIN) metadata dari tabel sourceVideos dan accounts.
 */
export async function getClips() {
  try {
    return await db
      .select({
        id: clips.id,
        title: clips.title,
        startTime: clips.startTime,
        endTime: clips.endTime,
        status: clips.status,
        videoPath: clips.videoPath,
        caption: clips.caption,
        hashtags: clips.hashtags,
        sourceVideoTitle: sourceVideos.title,
        sourceVideoThumbnail: sourceVideos.thumbnail,
        accountName: accounts.name,
        createdAt: clips.createdAt,
      })
      .from(clips)
      .leftJoin(sourceVideos, eq(clips.sourceVideoId, sourceVideos.id))
      .leftJoin(accounts, eq(clips.accountId, accounts.id))
      .orderBy(desc(clips.createdAt));
  } catch (error) {
    console.error("Failed to fetch clips:", error);
    return [];
  }
}

/**
 * Membuat data antrean klip/potongan video baru.
 * Saat dibuat, default status adalah "pending" yang nantinya akan diproses oleh Background Worker.
 */
export async function createClip(formData: {
  sourceVideoId: string;
  accountId: string;
  title: string;
  startTime: number;
  endTime: number;
  status?: string;
  caption?: string;
  hashtags?: string;
}) {
  try {
    const id = crypto.randomUUID();
    await db.insert(clips).values({
      id,
      sourceVideoId: formData.sourceVideoId,
      accountId: formData.accountId,
      title: formData.title,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: formData.status || "pending",
      caption: formData.caption || "",
      hashtags: formData.hashtags || "",
      createdAt: new Date(),
    });
    revalidatePath("/");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create clip:", error);
    return { success: false, error: "Gagal membuat klip" };
  }
}

/**
 * Memperbarui status klip (misal: "pending" -> "rendering" -> "ready").
 * Berfungsi sebagai titik komunikasi status antara Worker dan UI Dashboard.
 */
export async function updateClipStatus(id: string, status: string, videoPath?: string) {
  try {
    await db
      .update(clips)
      .set({ status, videoPath })
      .where(eq(clips.id, id));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update clip status:", error);
    return { success: false };
  }
}

// --- Schedules Actions ---
/**
 * Mengambil antrean jadwal tayang/upload video.
 * Menggabungkan metadata dengan clips, sourceVideos, dan accounts.
 */
export async function getSchedules() {
  try {
    return await db
      .select({
        id: schedules.id,
        publishTime: schedules.publishTime,
        status: schedules.status,
        platform: schedules.platform,
        clipTitle: clips.title,
        sourceVideoThumbnail: sourceVideos.thumbnail,
        accountName: accounts.name,
      })
      .from(schedules)
      .leftJoin(clips, eq(schedules.clipId, clips.id))
      .leftJoin(sourceVideos, eq(clips.sourceVideoId, sourceVideos.id))
      .leftJoin(accounts, eq(clips.accountId, accounts.id))
      .orderBy(desc(schedules.publishTime));
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return [];
  }
}

/**
 * Mendaftarkan jadwal baru (waktu unggah otomatis) untuk klip tertentu.
 * Background worker akan rutin mengecek waktu `publishTime` vs waktu saat ini.
 */
export async function createSchedule(formData: {
  clipId: string;
  publishTime: Date;
  platform: string;
}) {
  try {
    const id = crypto.randomUUID();
    await db.insert(schedules).values({
      id,
      clipId: formData.clipId,
      publishTime: formData.publishTime,
      status: "scheduled",
      platform: formData.platform,
      createdAt: new Date(),
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return { success: false, error: "Gagal membuat jadwal" };
  }
}

// --- Seed Mock Data ---
export async function seedMockData() {
  try {
    // 1. Clear database
    await db.delete(schedules);
    await db.delete(clips);
    await db.delete(sourceVideos);
    await db.delete(accounts);

    // 2. Insert Accounts
    const accIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    await db.insert(accounts).values([
      {
        id: accIds[0],
        name: "MrBeast Indo Clipper",
        niche: "MrBeast",
        type: "specific",
        targetPlatform: "all",
        createdAt: new Date(),
      },
      {
        id: accIds[1],
        name: "Shorts Motivasi Sukses",
        niche: "Motivasi & Produktivitas",
        type: "random",
        targetPlatform: "shorts",
        createdAt: new Date(),
      },
      {
        id: accIds[2],
        name: "TikTok Gaming Highlight",
        niche: "Gaming & Esports",
        type: "random",
        targetPlatform: "tiktok",
        createdAt: new Date(),
      },
    ]);

    // 3. Insert Source Videos
    const vidIds = [crypto.randomUUID(), crypto.randomUUID()];
    await db.insert(sourceVideos).values([
      {
        id: vidIds[0],
        url: "https://www.youtube.com/watch?v=tj38fS03R8w",
        title: "I Survived 100 Days In A Circle",
        duration: 930, // 15:30
        thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop",
        author: "MrBeast",
        createdAt: new Date(),
      },
      {
        id: vidIds[1],
        url: "https://www.youtube.com/watch?v=y881t8ilYGc",
        title: "Cara Menjadi Lebih Produktif dalam 5 Menit",
        duration: 300, // 5:00
        thumbnail: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&auto=format&fit=crop",
        author: "Mindset Sukses",
        createdAt: new Date(),
      },
    ]);

    // 4. Insert Clips
    const clipIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    await db.insert(clips).values([
      {
        id: clipIds[0],
        sourceVideoId: vidIds[0],
        accountId: accIds[0],
        title: "Detik-Detik Kemenangan 100 Hari!",
        startTime: 880,
        endTime: 920,
        status: "ready",
        videoPath: "/mock-videos/victory.mp4",
        caption: "Detik-detik akhir tantangan 100 hari di dalam lingkaran! Gila banget perjuangannya 😱🔥",
        hashtags: "#mrbeast #challenge #100days #viral #fyp #shorts",
        createdAt: new Date(),
      },
      {
        id: clipIds[1],
        sourceVideoId: vidIds[0],
        accountId: accIds[0],
        title: "MrBeast Kasih Makan Gajah",
        startTime: 120,
        endTime: 165,
        status: "rendering",
        videoPath: null,
        caption: "Momen seru saat MrBeast bawa gajah ke dalam lingkaran 🐘😂",
        hashtags: "#mrbeast #elephant #funny #animals #fyp",
        createdAt: new Date(),
      },
      {
        id: clipIds[2],
        sourceVideoId: vidIds[1],
        accountId: accIds[1],
        title: "Rahasia Sukses Bangun Jam 5 Pagi",
        startTime: 10,
        endTime: 69,
        status: "ready",
        videoPath: "/mock-videos/morning.mp4",
        caption: "Kenapa orang sukses selalu bangun jam 5 pagi? Ini penjelasannya! 🌅💡",
        hashtags: "#produktivitas #sukses #tips #motivasi #mindset #fyp",
        createdAt: new Date(),
      },
    ]);

    // 5. Insert Schedules
    const tomorrow10am = new Date();
    tomorrow10am.setDate(tomorrow10am.getDate() + 1);
    tomorrow10am.setHours(10, 0, 0, 0);

    const tomorrow6pm = new Date();
    tomorrow6pm.setDate(tomorrow6pm.getDate() + 1);
    tomorrow6pm.setHours(18, 0, 0, 0);

    await db.insert(schedules).values([
      {
        id: crypto.randomUUID(),
        clipId: clipIds[0],
        publishTime: tomorrow10am,
        status: "scheduled",
        platform: "shorts",
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        clipId: clipIds[2],
        publishTime: tomorrow6pm,
        status: "scheduled",
        platform: "tiktok",
        createdAt: new Date(),
      },
    ]);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to seed mock data:", error);
    return { success: false, error: "Gagal melakukan seeding data" };
  }
}
