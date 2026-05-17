"use client";

import React, { useState, useTransition } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Scissors, 
  Calendar, 
  Plus, 
  Trash2, 
  Play, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  Globe, 
  Tv, 
  FileText, 
  HelpCircle,
  TrendingUp,
  Share2,
  Cpu
} from "lucide-react";
import { 
  createAccount, 
  deleteAccount, 
  addSourceVideo, 
  createClip, 
  createSchedule, 
  seedMockData 
} from "./actions";

interface Account {
  id: string;
  name: string;
  niche: string;
  type: string;
  targetPlatform: string;
  createdAt: Date | null;
}

interface SourceVideo {
  id: string;
  url: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  author: string | null;
  createdAt: Date | null;
}

interface Clip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  status: string;
  videoPath: string | null;
  caption: string | null;
  hashtags: string | null;
  sourceVideoTitle: string | null;
  sourceVideoThumbnail: string | null;
  accountName: string | null;
  createdAt: Date | null;
}

interface Schedule {
  id: string;
  publishTime: Date;
  status: string;
  platform: string;
  clipTitle: string | null;
  sourceVideoThumbnail: string | null;
  accountName: string | null;
}

interface DashboardProps {
  initialAccounts: Account[];
  initialSourceVideos: SourceVideo[];
  initialClips: Clip[];
  initialSchedules: Schedule[];
}

export default function Dashboard({
  initialAccounts,
  initialSourceVideos,
  initialClips,
  initialSchedules,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isPending, startTransition] = useTransition();

  // Form states
  const [newAccName, setNewAccName] = useState("");
  const [newAccNiche, setNewAccNiche] = useState("");
  const [newAccType, setNewAccType] = useState("specific");
  const [newAccPlatform, setNewAccPlatform] = useState("all");

  const [newVidUrl, setNewVidUrl] = useState("");
  const [newVidTitle, setNewVidTitle] = useState("");
  const [newVidDuration, setNewVidDuration] = useState("");
  const [newVidAuthor, setNewVidAuthor] = useState("");

  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [clipTitle, setClipTitle] = useState("");
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");
  const [clippingMethod, setClippingMethod] = useState("manual"); // manual vs auto
  const [clipCaption, setClipCaption] = useState("");
  const [clipHashtags, setClipHashtags] = useState("");

  const [selectedClipId, setSelectedClipId] = useState("");
  const [schedPlatform, setSchedPlatform] = useState("tiktok");
  const [schedTime, setSchedTime] = useState("");

  // UI Modals / UI State
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotification = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSeed = () => {
    startTransition(async () => {
      const res = await seedMockData();
      if (res.success) {
        showNotification("success", "Database berhasil di-seed dengan data simulasi!");
      } else {
        showNotification("error", "Gagal melakukan seeding database.");
      }
    });
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName || !newAccNiche) return;

    startTransition(async () => {
      const res = await createAccount({
        name: newAccName,
        niche: newAccNiche,
        type: newAccType,
        targetPlatform: newAccPlatform,
      });

      if (res.success) {
        setNewAccName("");
        setNewAccNiche("");
        showNotification("success", "Akun/Persona baru berhasil ditambahkan!");
      } else {
        showNotification("error", res.error || "Gagal menambahkan akun.");
      }
    });
  };

  const handleDeleteAccount = (id: string) => {
    startTransition(async () => {
      const res = await deleteAccount(id);
      if (res.success) {
        showNotification("success", "Akun berhasil dihapus.");
      } else {
        showNotification("error", res.error || "Gagal menghapus akun.");
      }
    });
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVidUrl || !newVidTitle || !newVidDuration) return;

    startTransition(async () => {
      const res = await addSourceVideo({
        url: newVidUrl,
        title: newVidTitle,
        durationString: newVidDuration,
        author: newVidAuthor,
      });

      if (res.success) {
        setNewVidUrl("");
        setNewVidTitle("");
        setNewVidDuration("");
        setNewVidAuthor("");
        showNotification("success", "Video original berhasil disimpan ke database!");
      } else {
        showNotification("error", res.error || "Gagal menambahkan video.");
      }
    });
  };

  const handleCreateClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoId || !selectedAccountId || !clipTitle) return;

    startTransition(async () => {
      let finalCaption = clipCaption;
      let finalHashtags = clipHashtags;

      // Auto generate caption if AI/Auto selected
      if (clippingMethod === "auto") {
        finalCaption = `🔥 Gila keren banget momen ini! Gimana menurut kalian?`;
        finalHashtags = `#fyp #trending #clipper #viral #viralshorts`;
      }

      const res = await createClip({
        sourceVideoId: selectedVideoId,
        accountId: selectedAccountId,
        title: clipTitle,
        startTime: parseInt(clipStart) || 0,
        endTime: parseInt(clipEnd) || 30,
        status: clippingMethod === "auto" ? "rendering" : "ready",
        caption: finalCaption,
        hashtags: finalHashtags,
      });

      if (res.success) {
        setClipTitle("");
        setClipStart("");
        setClipEnd("");
        setClipCaption("");
        setClipHashtags("");
        showNotification("success", clippingMethod === "auto" 
          ? "Klip AI sedang di-ekstrak dan dirender di background!"
          : "Klip manual berhasil dibuat dan siap dijadwalkan!"
        );
        setActiveTab("clips");
      } else {
        showNotification("error", res.error || "Gagal membuat klip.");
      }
    });
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClipId || !schedTime) return;

    startTransition(async () => {
      const res = await createSchedule({
        clipId: selectedClipId,
        publishTime: new Date(schedTime),
        platform: schedPlatform,
      });

      if (res.success) {
        setSelectedClipId("");
        setSchedTime("");
        showNotification("success", "Klip berhasil masuk antrean jadwal upload!");
        setActiveTab("scheduler");
      } else {
        showNotification("error", res.error || "Gagal menjadwalkan klip.");
      }
    });
  };

  const formatSeconds = (seconds: number | null) => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all duration-300 border ${
          notification.type === "success" 
            ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40" 
            : "bg-rose-950/90 text-rose-300 border-rose-500/40"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-xl flex flex-col justify-between p-6">
        <div>
          {/* Logo / Header */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Clipper FYP
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                Dashboard V1
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "accounts", label: "Manajemen Akun", icon: Users },
              { id: "clipping", label: "Input Video & Clip", icon: Video },
              { id: "clips", label: "Editor Klip (Render)", icon: Scissors },
              { id: "scheduler", label: "Jadwal Upload", icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-600/15"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / Seeding */}
        <div className="space-y-4 pt-6 border-t border-slate-800/60">
          <button
            onClick={handleSeed}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-lg shadow-orange-500/10 transition-all duration-300 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isPending ? "Mengisi database..." : "Seed Data Simulasi"}
          </button>
          
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
              YP
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Yusuf Putra</p>
              <p className="text-[10px] text-slate-400">Creator Mode</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-slate-900 to-slate-950">
        
        {/* Top Navbar */}
        <header className="h-20 border-b border-slate-800/40 flex items-center justify-between px-8 bg-slate-950/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold capitalize text-slate-100">
              {activeTab === "clipping" ? "Input Video & Clip" : activeTab === "scheduler" ? "Jadwal Upload" : activeTab}
            </h2>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Clipper Bot Online
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">System Time:</span>
              <span className="font-semibold text-slate-200">18:00 WIB</span>
            </div>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Highlight Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900/60 to-indigo-900/60 border border-indigo-500/30 p-8 shadow-xl">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="max-w-xl space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-indigo-400/10 text-indigo-300 text-xs px-3 py-1.5 rounded-full font-semibold border border-indigo-400/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto Clipper Engine Ready
                  </div>
                  <h3 className="text-3xl font-extrabold text-white leading-tight">
                    Optimasi Video Klip Anda untuk Masuk FYP dalam Sekali Klik!
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Atur persona akun Anda, masukkan video mentah dari YouTube, potong bagian terseru secara manual atau otomatis dengan AI, edit parameter, dan jadwalkan upload harian.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Jumlah Akun/Persona", val: initialAccounts.length, desc: "Persona khusus / random", icon: Users, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                  { label: "Total Video Ingested", val: initialSourceVideos.length, desc: "Unduhan dari YouTube", icon: Video, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
                  { label: "Total Rendered Clips", val: initialClips.length, desc: "Siap upload & sedang proses", icon: Scissors, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
                  { label: "Upload Terjadwal", val: initialSchedules.length, desc: "Dalam antrean upload", icon: Calendar, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 flex items-center justify-between shadow-sm">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-3xl font-bold text-white">{stat.val}</p>
                        <p className="text-[10px] text-slate-500">{stat.desc}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border ${stat.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Main Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Upcoming Schedules (Left 2 columns) */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                    <div>
                      <h4 className="font-bold text-slate-100">Antrean Upload Mendatang</h4>
                      <p className="text-xs text-slate-400">Jadwal upload otomatis berikutnya</p>
                    </div>
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </div>

                  <div className="space-y-4">
                    {initialSchedules.length === 0 ? (
                      <div className="text-center py-10 space-y-3">
                        <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-sm text-slate-500">Belum ada jadwal upload mendatang.</p>
                      </div>
                    ) : (
                      initialSchedules.slice(0, 3).map((sched) => (
                        <div key={sched.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800/40 rounded-xl p-4 hover:border-slate-700/60 transition-all">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {sched.sourceVideoThumbnail && (
                              <img src={sched.sourceVideoThumbnail} alt="clip thumbnail" className="w-16 h-10 object-cover rounded-lg" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-200 truncate">{sched.clipTitle}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">{sched.accountName}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> {sched.platform.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-semibold text-indigo-400 block">
                              {new Date(sched.publishTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(sched.publishTime).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* System Status (Right column) */}
                <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                    <div>
                      <h4 className="font-bold text-slate-100">Status Sistem</h4>
                      <p className="text-xs text-slate-400">Kondisi core-worker & AI</p>
                    </div>
                    <Cpu className="w-5 h-5 text-indigo-400" />
                  </div>

                  <div className="space-y-5">
                    {[
                      { label: "FFmpeg Rendering Engine", status: "Active (Idle)", indicator: "bg-emerald-500 shadow-emerald-500/20" },
                      { label: "YouTube Ingest (yt-dlp)", status: "Connected", indicator: "bg-emerald-500 shadow-emerald-500/20" },
                      { label: "AI Highlight Classifier", status: "API Connected", indicator: "bg-emerald-500 shadow-emerald-500/20" },
                      { label: "Platform API Integrations", status: "Ready", indicator: "bg-emerald-500 shadow-emerald-500/20" }
                    ].map((sys, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/20 p-3 rounded-xl border border-slate-800/30">
                        <span className="text-xs font-medium text-slate-300">{sys.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">{sys.status}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${sys.indicator} shadow`}></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MANAJEMEN AKUN */}
          {activeTab === "accounts" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form Add Account (1 Column) */}
                <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6 self-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Tambah Akun / Persona</h3>
                    <p className="text-xs text-slate-400">Buat setingan akun clipper khusus atau tema acak</p>
                  </div>

                  <form onSubmit={handleAddAccount} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Nama Akun/Clipper</label>
                      <input 
                        type="text" 
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        placeholder="Contoh: MrBeast Indo Clipper" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Niche / Target Konten</label>
                      <input 
                        type="text" 
                        value={newAccNiche}
                        onChange={(e) => setNewAccNiche(e.target.value)}
                        placeholder="Contoh: Gaming, Motivasi, Lucu" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Tipe Akun</label>
                      <select 
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="specific">Khusus (Fokus 1 YouTuber/Kreator)</option>
                        <option value="random">Random Clipper (Campuran/Trend FYP)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Target Platform Upload</label>
                      <select 
                        value={newAccPlatform}
                        onChange={(e) => setNewAccPlatform(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="all">Semua Platform (TikTok & Shorts)</option>
                        <option value="tiktok">Khusus TikTok</option>
                        <option value="shorts">Khusus YouTube Shorts</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {isPending ? "Menyimpan..." : "Simpan Akun"}
                    </button>
                  </form>
                </div>

                {/* List Accounts (2 Columns) */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Daftar Akun Persona Anda</h3>
                    <p className="text-xs text-slate-400">Total akun terdaftar yang siap dipasangkan dengan klip</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {initialAccounts.length === 0 ? (
                      <div className="col-span-2 text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                        <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-400">Belum Ada Akun Terdaftar</p>
                        <p className="text-xs text-slate-500 mt-1">Silakan tambahkan akun pertama Anda atau gunakan data simulasi.</p>
                      </div>
                    ) : (
                      initialAccounts.map((acc) => (
                        <div key={acc.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-5 hover:border-indigo-500/30 transition-all duration-300 relative group">
                          
                          {/* Trash Delete Action */}
                          <button 
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/80 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-950/30 border border-slate-800/80 transition-all"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <h4 className="font-bold text-slate-100">{acc.name}</h4>
                          
                          <div className="mt-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Niche:</span>
                              <span className="font-semibold text-slate-200">{acc.niche}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Tipe Akun:</span>
                              <span className="font-semibold capitalize text-indigo-400">{acc.type === "specific" ? "Khusus YouTuber" : "Random Clipper"}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Target Platform:</span>
                              <span className="font-semibold uppercase text-indigo-300">{acc.targetPlatform}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: INPUT VIDEO & CLIPPING */}
          {activeTab === "clipping" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form Input Video URL (1 Column) */}
                <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6 self-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Ingest Link Video</h3>
                    <p className="text-xs text-slate-400">Salin link YouTube yang ingin dipotong</p>
                  </div>

                  <form onSubmit={handleAddVideo} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">URL YouTube Video</label>
                      <input 
                        type="url" 
                        value={newVidUrl}
                        onChange={(e) => setNewVidUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..." 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Judul Video (Original)</label>
                      <input 
                        type="text" 
                        value={newVidTitle}
                        onChange={(e) => setNewVidTitle(e.target.value)}
                        placeholder="Contoh: I Survived 100 Days in A Circle" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">Durasi (MM:SS)</label>
                        <input 
                          type="text" 
                          value={newVidDuration}
                          onChange={(e) => setNewVidDuration(e.target.value)}
                          placeholder="15:30" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">Pemilik (Author)</label>
                        <input 
                          type="text" 
                          value={newVidAuthor}
                          onChange={(e) => setNewVidAuthor(e.target.value)}
                          placeholder="MrBeast" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {isPending ? "Menyimpan..." : "Ingest Video"}
                    </button>
                  </form>
                </div>

                {/* Clipper Maker Workspace (2 Columns) */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Clipper Workspace</h3>
                    <p className="text-xs text-slate-400">Pilih salah satu video untuk memotong momen terbaik</p>
                  </div>

                  {initialSourceVideos.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                      <Video className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-400">Belum Ada Video Terdaftar</p>
                      <p className="text-xs text-slate-500 mt-1">Silakan ingest/unduh video pertama di panel kiri atau gunakan data simulasi.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Video Selection Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {initialSourceVideos.map((vid) => (
                          <div 
                            key={vid.id} 
                            onClick={() => {
                              setSelectedVideoId(vid.id);
                              // Auto set placeholder title
                              setClipTitle(`Highlight - ${vid.title}`);
                            }}
                            className={`flex gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
                              selectedVideoId === vid.id 
                                ? "bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-600/5" 
                                : "bg-slate-950/40 border-slate-800/60 hover:border-slate-700"
                            }`}
                          >
                            {vid.thumbnail && (
                              <img src={vid.thumbnail} alt="video thumbnail" className="w-24 h-16 object-cover rounded-lg border border-slate-800 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex flex-col justify-between py-0.5">
                              <p className="text-xs font-bold text-slate-200 truncate">{vid.title}</p>
                              <div>
                                <p className="text-[10px] text-slate-400 font-semibold">{vid.author || "Unknown"}</p>
                                <p className="text-[10px] text-indigo-400 font-bold mt-1.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {formatSeconds(vid.duration)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Clipping Editor Area */}
                      {selectedVideoId && (
                        <div className="border-t border-slate-800/60 pt-6 animate-in slide-in-from-bottom-2 duration-300">
                          <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2 mb-4">
                            <Scissors className="w-4 h-4 text-indigo-400" />
                            Buat Potongan Klip Baru
                          </h4>

                          <form onSubmit={handleCreateClip} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300">Pilih Target Akun / Persona</label>
                                <select 
                                  value={selectedAccountId}
                                  onChange={(e) => setSelectedAccountId(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  required
                                >
                                  <option value="">-- Pilih Akun --</option>
                                  {initialAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.niche})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300">Judul Klip Hasil Potongan</label>
                                <input 
                                  type="text" 
                                  value={clipTitle}
                                  onChange={(e) => setClipTitle(e.target.value)}
                                  placeholder="Momen menegangkan saat..." 
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  required
                                />
                              </div>
                            </div>

                            {/* Clipping Method Choice */}
                            <div className="grid grid-cols-2 gap-4 p-1 bg-slate-950 border border-slate-800/80 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setClippingMethod("manual")}
                                className={`py-3 rounded-lg text-xs font-bold transition-all ${
                                  clippingMethod === "manual" 
                                    ? "bg-slate-900 text-indigo-400 border border-slate-800" 
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                Manual Clipping
                              </button>
                              <button
                                type="button"
                                onClick={() => setClippingMethod("auto")}
                                className={`py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  clippingMethod === "auto" 
                                    ? "bg-slate-900 text-indigo-400 border border-slate-800" 
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Auto Clipper
                              </button>
                            </div>

                            {/* Conditional Settings */}
                            {clippingMethod === "manual" ? (
                              <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-300">Mulai (Detik Ke-)</label>
                                    <input 
                                      type="number" 
                                      value={clipStart}
                                      onChange={(e) => setClipStart(e.target.value)}
                                      placeholder="0" 
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                                      required={clippingMethod === "manual"}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-300">Selesai (Detik Ke-)</label>
                                    <input 
                                      type="number" 
                                      value={clipEnd}
                                      onChange={(e) => setClipEnd(e.target.value)}
                                      placeholder="30" 
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                                      required={clippingMethod === "manual"}
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-300">Caption / Deskripsi</label>
                                    <textarea 
                                      value={clipCaption}
                                      onChange={(e) => setClipCaption(e.target.value)}
                                      placeholder="Ketik caption yang akan memancing interaksi penonton..." 
                                      rows={2}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-300">Hashtags (FYP Optimization)</label>
                                    <textarea 
                                      value={clipHashtags}
                                      onChange={(e) => setClipHashtags(e.target.value)}
                                      placeholder="#fyp #shorts #trending" 
                                      rows={2}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
                                <p className="text-xs text-indigo-400 font-bold flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4" /> AI Auto Clipping Enabled
                                </p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  Sistem AI kami akan otomatis melakukan ekstraksi transkrip audio, mendeteksi nada suara, serta menganalisis frame visual video untuk mendeteksi 1 momen highlight paling menarik (FYP Score tertinggi). Caption dan Hashtags akan digenerate otomatis menggunakan AI.
                                </p>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={isPending}
                              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                              <Scissors className="w-4 h-4" />
                              {isPending 
                                ? "Memproses Klip..." 
                                : clippingMethod === "auto" 
                                  ? "Gunakan AI & Mulai Render" 
                                  : "Buat & Render Klip"
                              }
                            </button>

                          </form>
                        </div>
                      )}

                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

          {/* TAB 4: EDITOR KLIP (RENDER) */}
          {activeTab === "clips" && (
            <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Editor & Render Manager</h3>
                <p className="text-xs text-slate-400">Daftar klip hasil potongan, pantau rendering video di background</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {initialClips.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                    <Scissors className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Belum Ada Klip Terbuat</p>
                    <p className="text-xs text-slate-500 mt-1">Gunakan tab "Input Video & Clip" untuk memotong video YouTube pertama Anda.</p>
                  </div>
                ) : (
                  initialClips.map((clip) => (
                    <div key={clip.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between">
                      <div>
                        {/* Thumbnail Header with Status overlay */}
                        <div className="relative h-40 bg-slate-900 border-b border-slate-800">
                          {clip.sourceVideoThumbnail && (
                            <img src={clip.sourceVideoThumbnail} alt="source thumbnail" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-slate-950/40"></div>
                          
                          {/* Rendering status pill */}
                          <div className="absolute top-3 right-3">
                            {clip.status === "ready" ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 backdrop-blur-sm">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                              </span>
                            ) : clip.status === "rendering" ? (
                              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 backdrop-blur-sm animate-pulse">
                                <Cpu className="w-3.5 h-3.5 animate-spin" /> Rendering
                              </span>
                            ) : (
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 backdrop-blur-sm">
                                <AlertCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </div>

                          {/* Time range overlay */}
                          <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                            {formatSeconds(clip.startTime)} - {formatSeconds(clip.endTime)} ({clip.endTime - clip.startTime}s)
                          </div>
                        </div>

                        {/* Info details */}
                        <div className="p-5 space-y-3.5">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">{clip.accountName}</span>
                            <h4 className="font-bold text-sm text-slate-100 mt-1 line-clamp-1">{clip.title}</h4>
                          </div>

                          <div className="space-y-1 border-t border-slate-900 pt-3">
                            <p className="text-[11px] font-semibold text-slate-400">Caption / Hashtags:</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                              {clip.caption || "Tidak ada caption."} {clip.hashtags}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action scheduling button */}
                      <div className="p-5 pt-0">
                        {clip.status === "ready" ? (
                          <button
                            onClick={() => {
                              setSelectedClipId(clip.id);
                              setActiveTab("scheduler");
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            Jadwalkan Upload
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-slate-950 text-slate-600 border border-slate-900/60 text-xs font-bold py-2.5 rounded-xl transition-all cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            Tunggu Render Selesai
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 5: PENJADWALAN */}
          {activeTab === "scheduler" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form Add Schedule (1 Column) */}
                <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6 self-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Buat Jadwal Upload</h3>
                    <p className="text-xs text-slate-400">Tentukan jam upload optimal untuk FYP</p>
                  </div>

                  <form onSubmit={handleCreateSchedule} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Pilih Klip Video Ready</label>
                      <select 
                        value={selectedClipId}
                        onChange={(e) => setSelectedClipId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">-- Pilih Klip --</option>
                        {initialClips
                          .filter(c => c.status === "ready")
                          .map((clip) => (
                            <option key={clip.id} value={clip.id}>
                              [{clip.accountName}] {clip.title}
                            </option>
                          ))}
                      </select>
                      {initialClips.filter(c => c.status === "ready").length === 0 && (
                        <p className="text-[10px] text-rose-400 font-semibold">Tidak ada klip 'Ready'. Silakan tunggu proses render atau potong video baru.</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Platform Tujuan</label>
                      <select 
                        value={schedPlatform}
                        onChange={(e) => setSchedPlatform(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="tiktok">TikTok (Vertical Feed)</option>
                        <option value="shorts">YouTube Shorts</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Waktu Publikasi</label>
                      <input 
                        type="datetime-local" 
                        value={schedTime}
                        onChange={(e) => setSchedTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || initialClips.filter(c => c.status === "ready").length === 0}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      {isPending ? "Menjadwalkan..." : "Simpan Jadwal"}
                    </button>
                  </form>
                </div>

                {/* Queue Schedules (2 Columns) */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/40 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Antrean Jadwal Unggahan Aktif</h3>
                    <p className="text-xs text-slate-400">Total jadwal upload terdaftar yang akan diposting otomatis</p>
                  </div>

                  <div className="space-y-4">
                    {initialSchedules.length === 0 ? (
                      <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                        <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-400">Belum Ada Jadwal Publikasi</p>
                        <p className="text-xs text-slate-500 mt-1">Silakan jadwalkan klip pertama Anda melalui form di sebelah kiri.</p>
                      </div>
                    ) : (
                      initialSchedules.map((sched) => (
                        <div key={sched.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-5 flex items-center justify-between hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-4 min-w-0">
                            {sched.sourceVideoThumbnail && (
                              <img src={sched.sourceVideoThumbnail} alt="clip thumbnail" className="w-20 h-12 object-cover rounded-lg border border-slate-800/60 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-100 truncate">{sched.clipTitle}</h4>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                                <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-indigo-400 font-semibold">{sched.accountName}</span>
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                                  <Globe className="w-3.5 h-3.5 text-slate-400" /> {sched.platform.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 ml-4">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                              Active
                            </span>
                            <span className="text-xs font-semibold text-indigo-400 block mt-2">
                              {new Date(sched.publishTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {new Date(sched.publishTime).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
