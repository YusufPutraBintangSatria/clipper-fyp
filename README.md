# 🎬 Auto Clipper App

Auto Clipper adalah sebuah aplikasi cerdas berbasis web dan *background worker* yang secara otomatis dapat mengunduh, memotong, menambahkan *subtitle*, menghasilkan *caption* viral dengan bantuan AI, dan mengunggah (*upload*) video secara terjadwal ke **YouTube Shorts** dan **TikTok**.

---

## 🏗️ Arsitektur Sistem

Sistem ini terbagi menjadi 2 komponen utama yang saling bekerja sama melalui *database* lokal:

1. **Dashboard UI (Next.js)**: Antarmuka web modern untuk mengelola akun (YouTube/TikTok), memasukkan *link* sumber video, mengatur titik potong (*clipping*), dan menjadwalkan waktu unggah (*publishing*).
2. **Background Worker (Node.js)**: Robot pemrosesan video yang berjalan di latar belakang. *Worker* ini rutin memonitor *database*, melakukan pengunduhan video, pemotongan rasio 9:16 vertikal, menyisipkan teks AI, membakar *subtitle*, hingga akhirnya mengunggah video ke *platform* sosial pada waktu yang telah ditentukan.

---

## 💻 Tech Stack (Tumpukan Teknologi)

Proyek ini dibangun menggunakan teknologi modern dan efisien:
- **Framework Frontend**: Next.js 14+ (App Router), React 19
- **Styling**: TailwindCSS v4, Lucide React (Ikon)
- **Database & ORM**: SQLite (`local.db`), Drizzle ORM
- **Video Processing Engine**: FFmpeg, yt-dlp
- **Artificial Intelligence**: Gemini 1.5 Flash (untuk *caption*, *hashtag*, dan transkripsi SRT)
- **API Integration**: YouTube Data API v3 (Multipart Upload), TikTok Content Posting API (Direct Post)
- **Testing**: Vitest (Unit Testing)

---

## ⚙️ Cara Setup (Instalasi Lokal)

### 1. Prasyarat Sistem
Pastikan komputer Anda sudah terinstal:
- **Node.js** (v20 atau lebih baru)
- **FFmpeg**: Terinstal dan terdaftar di *System PATH* (agar bisa dipanggil dari CMD/Terminal).
- **yt-dlp**: Terinstal dan terdaftar di *System PATH*.

### 2. Kloning dan Instalasi
```bash
git clone https://github.com/YusufPutraBintangSatria/clipper-fyp.git
cd clipper-fyp
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env` di folder utama aplikasi dengan variabel berikut:
```env
# URL Database SQLite
DATABASE_URL="file:local.db"

# Kredensial YouTube API (Google Cloud Console)
YOUTUBE_CLIENT_ID="your_google_client_id"
YOUTUBE_CLIENT_SECRET="your_google_client_secret"

# Kredensial TikTok Developer Portal (Sandbox/Production)
TIKTOK_CLIENT_KEY="your_tiktok_client_key"
TIKTOK_CLIENT_SECRET="your_tiktok_client_secret"

# Gemini API untuk otomatisasi teks dan transkripsi audio
GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Migrasi Database
Untuk menginisialisasi *schema* ke dalam `local.db`:
```bash
npx drizzle-kit push
```

---

## 🚀 Cara Menjalankan Aplikasi

Anda perlu menjalankan dua *terminal* terpisah agar UI dan Worker bekerja bersama-sama.

**Terminal 1: Menjalankan Web Dashboard**
```bash
npm run dev
```
Aplikasi web bisa diakses di `http://localhost:3000`.

**Terminal 2: Menjalankan Background Worker**
```bash
npm run worker
```
*Worker* akan hidup, mengunduh video yang masuk antrean, memproses AI, dan melakukan unggah terjadwal.

---

## 🧪 Pengujian (Unit Testing)
Sistem dilengkapi dengan skenario *mock testing* lengkap untuk memastikan tidak ada *database* atau API pihak ketiga yang terganggu selama pengujian.
```bash
npm run test
```

---

## 👨‍💻 Kontribusi dan Lisensi
Proyek ini dibuat untuk keperluan *Final Year Project* (FYP). Silakan mengeksplorasi dokumentasi *source code* (dilengkapi dengan komentar JSDoc) dan dokumentasi API di `/api-docs`.
