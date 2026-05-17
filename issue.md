# Planning Project: Auto Clipper (TikTok / YouTube Shorts)

Dokumen ini berisi instruksi high-level (High-Level Design & Implementation Plan) untuk membuat aplikasi Auto Clipper. Dokumen ini dirancang agar dapat dibaca dan diimplementasikan oleh programmer atau AI Model (misal: cursor/claude/gemini) secara bertahap.

## 🎯 Ringkasan Proyek
Aplikasi berbasis web untuk mengotomatisasi proses pembuatan clip video dari YouTube untuk diunggah ke platform video pendek (TikTok, YouTube Shorts, dll). Fitur utamanya mencakup manajemen akun persona, pemotongan video (otomatis/manual), pengeditan, pembuatan metadata (caption & hashtag), dan penjadwalan unggahan.

---

## 🛠️ Rekomendasi Tech Stack (High-Level)
- **Frontend & Backend**: Framework Fullstack modern (misal: Next.js / Nuxt / SvelteKit) atau kombinasi Backend API (Elysia/Express) + Frontend (React/Vue).
- **Database**: PostgreSQL / SQLite menggunakan ORM (seperti Drizzle atau Prisma).
- **Video Processing**: FFmpeg (dijalankan di background worker) & `yt-dlp` untuk mengunduh video.
- **AI/LLM**: Integrasi API LLM (OpenAI/Gemini) untuk generate caption, hashtag, dan transkrip.
- **Background Jobs**: Sistem antrean (Queue) seperti BullMQ / Redis untuk memproses render video agar tidak memblokir server utama.

---

## 📋 Tahapan Implementasi (Implementation Phases)

### Phase 1: Inisialisasi Proyek & Database
1. **Setup Project**: Buat proyek baru dengan framework fullstack pilihan. Konfigurasikan Linter, Formatter, dan environment variables.
2. **Database Schema**: Rancang skema database untuk:
   - `Persona/Account`: Menyimpan data akun khusus (misal: akun khusus YouTuber A, atau akun random clipper).
   - `SourceVideo`: Menyimpan link YouTube original.
   - `Clip`: Menyimpan data klip yang dipotong, status render, dan metadata.
   - `Schedule`: Menyimpan jadwal upload harian.
3. **UI/UX Dasar**: Buat layout dashboard standar yang memiliki menu: Manajemen Akun, Input Video, Editor Klip, dan Penjadwalan.

### Phase 2: Manajemen Akun (Persona)
1. **CRUD Akun**: Buat halaman dan API untuk menambah, mengedit, dan menghapus akun/persona.
2. **Kategori/Niche**: Tambahkan opsi untuk menentukan apakah akun ini fokus ke 1 YouTuber spesifik atau tema campuran.

### Phase 3: Modul Ingesti & Clipping Video
1. **Input Link**: Buat form untuk menempelkan link YouTube dan tarik metadata dasar (judul, thumbnail, durasi).
2. **Pilihan Clipping**:
   - **Manual Clipping**: UI untuk memasukkan timestamp (Start Time - End Time) dari video untuk dipotong.
   - **Auto Clipping**: Implementasikan logika analisis (bisa menggunakan transkrip atau integrasi AI pihak ketiga) untuk mendeteksi momen highlight secara otomatis.

### Phase 4: Modul Editing (Auto & Manual)
1. **Setup FFmpeg Worker**: Buat background worker yang mendengarkan antrean tugas render video.
2. **Pilihan Editing**:
   - **Auto Edit**: Buat preset FFmpeg untuk otomatis mengubah rasio video menjadi 9:16 (vertical/potrait), menambahkan auto-subtitle (misal pakai Whisper AI), dan face-tracking sederhana jika memungkinkan.
   - **Manual Edit**: Berikan UI sederhana bagi pengguna untuk menyesuaikan parameter (misal: area crop, font subtitle, warna) sebelum memerintahkan worker melakukan render final.

### Phase 5: Metadata & Penjadwalan (Scheduling)
1. **Auto Metadata Engine**: Kirimkan konteks/transkrip klip ke API LLM untuk menghasilkan opsi:
   - Caption yang menarik.
   - Hashtag yang relevan agar FYP.
2. **Manual Override**: Sediakan form teks agar pengguna bisa mengedit atau menulis sendiri caption dan hashtag yang dihasilkan.
3. **Sistem Penjadwalan**:
   - Buat fitur untuk menentukan "Berapa kali upload per hari" dan "Jam berapa saja".
   - Buat CRON job atau scheduler worker yang bertugas mengambil klip berstatus `ready` dan mengeksekusi proses unggah via API platform terkait (TikTok API / YouTube API) pada jam yang sudah ditentukan.

### Phase 6: Testing & Deployment
1. Lakukan pengujian end-to-end terutama pada worker FFmpeg karena rentan terhadap kegagalan memori.
2. Implementasikan UI feedback (progress bar atau status) agar pengguna tahu apakah klip sedang di-download, diproses, atau gagal.
3. Buat dokumentasi panduan cara menjalankan worker dan API keys yang dibutuhkan.

---

**Instruksi untuk AI/Programmer berikutnya:**
Mulai dari **Phase 1**, gunakan tech stack yang telah disepakati (misal tanyakan dulu ke pengguna ingin pakai framework apa jika belum ada). Jangan melompat ke Phase berikutnya sebelum Phase sebelumnya berjalan dengan baik dan dites.
