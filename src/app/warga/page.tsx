"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import PearCanvas from "@/components/webgl/pear-canvas";
import ChatbotWidget from "@/components/warga/chatbot-widget";
import { playSuccessChime, playSirenSound } from "@/lib/audio-alert";
import { compressImage, CompressedImageResult } from "@/lib/image-compress";
import {
  Camera,
  Ticket,
  Clock,
  X,
  ShieldCheck,
  Sparkles,
  Radio,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface StationItem {
  id: string;
  deviceId: string;
  name: string;
  lokasi: string;
}

interface ActiveSessionData {
  id: string;
  sessionCode: string;
  stationId: string;
  status: "WAITING_TRASH" | "TRASH_DETECTED" | "COMPLETED" | "NEEDS_REVIEW" | "REJECTED" | "EXPIRED";
  expiresAt: string;
  eventTriggeredAt?: string | null;
  rewardAmount?: number;
  userCategory?: string | null;
  aiCategory?: string | null;
  aiConfidence?: number | null;
  aiReason?: string | null;
  aiTips?: string | null;
  isCorrected?: boolean;
}

interface CitizenSessionHistory {
  id: string;
  sessionCode: string;
  status: string;
  rewardAmount: number;
  userCategory: string | null;
  aiCategory: string | null;
  imageUrl: string | null;
  aiConfidence: number | null;
  aiReason: string | null;
  createdAt: string;
  isCorrected: boolean;
}

const STATIONS: StationItem[] = [
  { id: "st_001", deviceId: "ST-001", name: "Stasiun TPST Terpadu Kayumas", lokasi: "Kawasan Kayumas Kaja" },
  { id: "st_002", deviceId: "ST-002", name: "Stasiun TPS Seminyak Coastal", lokasi: "Depot Seminyak" },
];

const VOUCHERS = [
  { id: "V-PLN-20K", title: "Token Listrik PLN Rp 20.000", costPoints: 20000, category: "Listrik", issuer: "PLN Distribusi Bali" },
  { id: "V-PLS-10K", title: "Pulsa Seluler Rp 10.000", costPoints: 10000, category: "Pulsa", issuer: "Telkomsel" },
  { id: "V-EMONEY-25K", title: "Saldo E-Money (GoPay / OVO / Dana) Rp 25.000", costPoints: 25000, category: "E-Money", issuer: "Dompet Digital" },
  { id: "V-EMONEY-50K", title: "Saldo E-Money (GoPay / OVO / Dana) Rp 50.000", costPoints: 50000, category: "E-Money", issuer: "Dompet Digital" },
];

export default function CircularExchangePage() {
  const [balance, setBalance] = useState<number>(45000);
  const [tariff, setTariff] = useState({ organicRate: 2000, inorganicRate: 3000 });
  const [history, setHistory] = useState<CitizenSessionHistory[]>([]);

  // Sesi Setor IoT
  const [selectedStationId, setSelectedStationId] = useState<string>(STATIONS[0].id);
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionTimer, setSessionTimer] = useState<string>("05:00");

  // Drawer & Foto
  const [drawerMode, setDrawerMode] = useState<"NONE" | "DEPOSIT_FLOW" | "CAMERA" | "REDEEM">("NONE");
  const [selectedCategory, setSelectedCategory] = useState<"ORGANIK" | "ANORGANIK">("ORGANIK");
  const [compressedResult, setCompressedResult] = useState<CompressedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedVoucher, setSelectedVoucher] = useState<(typeof VOUCHERS)[0] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  const loadCitizenData = async () => {
    try {
      const res = await fetch("/api/citizen/sessions");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === "number") setBalance(data.balance);
        if (data.tariff) setTariff(data.tariff);
        if (data.sessions) setHistory(data.sessions);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadCitizenData();
  }, []);

  // Polling sesi aktif (2.5 detik) jika sesi sedang menunggu atau terdeteksi
  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.status === "COMPLETED" || activeSession.status === "REJECTED" || activeSession.status === "EXPIRED") return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      if (document.hidden) return; // Hentikan polling jika tab tidak aktif
      try {
        const res = await fetch(`/api/sessions/${activeSession.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session && isSubscribed) {
            setActiveSession(data.session);
            if (data.session.status === "TRASH_DETECTED" && activeSession.status === "WAITING_TRASH") {
              playSuccessChime();
              setSuccessToast("Sensor ultrasonik mendeteksi sampah masuk! Silakan ambil foto sampah Anda.");
            }
          }
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeSession]);

  // Hitung mundur sisa waktu sesi 5 menit
  useEffect(() => {
    if (!activeSession?.expiresAt) return;
    const updateCountdown = () => {
      const remainingMs = new Date(activeSession.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setSessionTimer("00:00");
        setActiveSession((prev) => (prev ? { ...prev, status: "EXPIRED" } : null));
        return;
      }
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setSessionTimer(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.expiresAt]);

  // Memulai Sesi Setor
  const handleStartSession = async (stationId = selectedStationId) => {
    setIsCreatingSession(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat sesi setor");

      setActiveSession(data.session);
      setDrawerMode("DEPOSIT_FLOW");
      playSuccessChime();
      setSuccessToast(`Sesi ${data.session.sessionCode} aktif! Silakan masukkan sampah ke stasiun.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMessage(msg);
      playSirenSound();
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Trigger Hardware Simulator (Simulasi sensor ultrasonic mendeteksi sampah)
  const handleSimulateUltrasonic = async () => {
    const curStation = STATIONS.find((s) => s.id === (activeSession?.stationId || selectedStationId)) || STATIONS[0];
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: curStation.deviceId,
          action: "waste_in",
          distanceCm: 13.5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playSuccessChime();
        setSuccessToast("Simulasi sensor ultrasonik: Sampah berhasil terdeteksi!");
        if (activeSession) {
          setActiveSession((prev) => (prev ? { ...prev, status: "TRASH_DETECTED" } : null));
        }
      }
    } catch {
      // ignore
    }
  };

  // Tangkap & Kompres Foto Kamera HP
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const result = await compressImage(file);
      setCompressedResult(result);
      // Auto-tebak kategori dari signature kompresi
      if (result.predictedCategory === "ORGANIK") {
        setSelectedCategory("ORGANIK");
      } else {
        setSelectedCategory("ANORGANIK");
      }
      playSuccessChime();
    } catch {
      alert("Gagal membaca kamera. Silakan coba lagi.");
    } finally {
      setIsCompressing(false);
    }
  };

  // Uji Coba Cepat Preset Foto
  const handleQuickPreset = (category: "ORGANIK" | "ANORGANIK", sampleUrl: string) => {
    setSelectedCategory(category);
    setCompressedResult({
      dataUrl: sampleUrl,
      originalSizeKb: 1420,
      compressedSizeKb: 84,
      width: 800,
      height: 600,
      compressionRatio: 94,
      predictedCategory: category === "ORGANIK" ? "ORGANIK" : "PET",
      predictedConfidence: 96,
    });
    playSuccessChime();
  };

  // Submit Foto & Verifikasi AI Vision ke Server
  const handleSubmitVerification = async () => {
    if (!activeSession) return;
    if (!compressedResult) {
      alert("Harap ambil foto sampah terlebih dahulu");
      return;
    }

    setIsVerifyingAi(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/submit-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCategory: selectedCategory,
          imageBase64: compressedResult.dataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses verifikasi");

      playSuccessChime();
      setActiveSession(data.session);
      setSuccessToast(data.message);
      loadCitizenData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMessage(msg);
    } finally {
      setIsVerifyingAi(false);
    }
  };

  // Penukaran Saldo / Voucher
  const handleRedeemVoucher = (voucher: (typeof VOUCHERS)[0]) => {
    if (balance < voucher.costPoints) {
      alert("Saldo kas Anda belum mencukupi untuk penukaran voucher ini.");
      return;
    }
    setSelectedVoucher(voucher);
    setDrawerMode("REDEEM");
  };

  const confirmRedeem = async () => {
    if (!selectedVoucher) return;
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedVoucher.costPoints,
          notes: `Penukaran ${selectedVoucher.title}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan penukaran");

      playSuccessChime();
      setSuccessToast(`Pengajuan penukaran ${selectedVoucher.title} berhasil diajukan ke petugas.`);
      setDrawerMode("NONE");
      setSelectedVoucher(null);
      loadCitizenData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengajukan penukaran");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f2f1ed] text-[#1d1c19] selection:bg-[#1d1c19] selection:text-[#f2f1ed]">
      {/* ----- CANVAS BACKGROUND ----- */}
      <PearCanvas />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10 mix-blend-multiply">
        <video
          src="/films/signal.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>

      {/* ----- TOAST NOTIFICATION (SYMMETRICAL) ----- */}
      {successToast && (
        <aside
          role="status"
          className="sticky top-0 inset-x-0 z-40 bg-[#015186] text-white py-2.5 px-4 sm:px-6 lg:px-8 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successToast}</span>
        </aside>
      )}

      {errorMessage && (
        <aside
          role="alert"
          className="sticky top-0 inset-x-0 z-40 bg-[#b91c1c] text-white py-2.5 px-4 sm:px-6 lg:px-8 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in flex items-center justify-center gap-2"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </aside>
      )}

      {/* HIDDEN CAMERA INPUT (capture=environment untuk kamera belakang HP) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        aria-hidden="true"
      />

      {/* ----- MAIN WORKSPACE (SEIMBANG & SYMMETRICAL) ----- */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <header className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-gt-mono text-[11px] text-[#015186] font-semibold uppercase tracking-wider mb-1">
              <span className="size-2 rounded-full bg-[#1d1c19]" />
              <span>BANK SAMPAH IOT // SISTEM PENGELOLAAN SAMPAH CERDAS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
              Setor Sampah Cerdas &amp; Verifikasi AI
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-gt-mono text-xs">
            <button
              onClick={() => handleStartSession()}
              disabled={isCreatingSession}
              className="border border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] px-4 py-2 uppercase text-[11px] font-bold tracking-wider hover:bg-black transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Camera className="size-3.5" />
              <span>{isCreatingSession ? "Menyiapkan Sesi..." : "Mulai Setor Baru"}</span>
            </button>
          </div>
        </header>

        {/* 12-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- KOLOM KIRI (5/12 NASABAH & STATUS SESI IOT) ----- */}
          <div className="lg:col-span-5 space-y-6">
            {/* CARD 1: MEMBER PASS & SALDO */}
            <div className="bg-white/95 text-[#1d1c19] border border-[#1d1c19]/15 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-4 font-gt-mono text-xs">
                <span className="text-[#84827a] tracking-widest uppercase text-[10px]">
                  KARTU DIGITAL PENGGUNA
                </span>
                <span className="flex items-center gap-1 text-emerald-600 text-[10px] tracking-wider font-bold">
                  <ShieldCheck className="size-3.5" />
                  <span>TERHUBUNG IOT</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] font-gt-mono text-[#84827a] block">Nama:</span>
                <h2 className="text-2xl font-bold tracking-tight text-[#1d1c19]">I Wayan Sudiarta</h2>
                <span className="font-gt-mono text-xs text-[#55534c] mt-0.5 block">
                  Denpasar Timur &bull; Pengguna Aktif
                </span>
              </div>

              {/* SALDO FLAT & TARIF SAMPAH */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-gt-mono border-t border-[#1d1c19]/10">
                <div className="bg-[#f2f1ed]/80 border border-[#1d1c19]/10 p-3.5">
                  <span className="text-[10px] text-[#84827a] uppercase block">Saldo Terkumpul</span>
                  <p className="text-2xl sm:text-3xl font-bold text-[#1d1c19] mt-0.5">
                    Rp {balance.toLocaleString("id-ID")}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                    Atomic Point Ledger
                  </span>
                </div>

                <div className="bg-[#f2f1ed]/80 border border-[#1d1c19]/10 p-3.5">
                  <span className="text-[10px] text-[#84827a] uppercase block">Tarif Flat Sampah</span>
                  <p className="text-xs font-bold text-[#1d1c19] mt-1">
                    Organik: <span className="text-emerald-700">Rp {tariff.organicRate.toLocaleString("id-ID")}</span>
                  </p>
                  <p className="text-xs font-bold text-[#1d1c19] mt-0.5">
                    Anorganik: <span className="text-[#015186]">Rp {tariff.inorganicRate.toLocaleString("id-ID")}</span>
                  </p>
                  <span className="text-[9px] text-[#84827a] block mt-1">Flat per sesi setoran</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartSession()}
                  className="bg-[#1d1c19] text-[#f2f1ed] py-3 px-3 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                >
                  <Camera className="size-4" />
                  <span>Setor Sampah</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerMode("REDEEM")}
                  className="border border-[#1d1c19]/25 bg-white text-[#1d1c19] py-3 px-3 text-xs font-bold uppercase tracking-wider hover:bg-[#1d1c19]/5 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
                >
                  <Ticket className="size-4" />
                  <span>Tukar Saldo</span>
                </button>
              </div>
            </div>

            {/* CARD 2: KONTROL SESI AKTIF IOT */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-[#015186] animate-pulse" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Status Sesi Stasiun IoT
                  </span>
                </div>
                {activeSession && (
                  <span className="font-bold text-xs text-[#015186] bg-blue-50 px-2 py-0.5 border border-[#015186]/30">
                    Sisa Waktu: {sessionTimer}
                  </span>
                )}
              </div>

              {activeSession ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[#fbfbfa] border border-[#1d1c19]/15 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#84827a] uppercase">Kode Sesi:</span>
                      <span className="font-bold text-sm text-[#1d1c19]">{activeSession.sessionCode}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#84827a] uppercase">Status:</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 border uppercase ${
                          activeSession.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-600/40"
                            : activeSession.status === "TRASH_DETECTED"
                            ? "bg-blue-50 text-[#015186] border-[#015186]/40 animate-pulse"
                            : activeSession.status === "NEEDS_REVIEW"
                            ? "bg-amber-50 text-amber-900 border-amber-600/40"
                            : "bg-zinc-100 text-[#55534c] border-zinc-300"
                        }`}
                      >
                        {activeSession.status === "WAITING_TRASH"
                          ? "1. Menunggu Sampah Masuk"
                          : activeSession.status === "TRASH_DETECTED"
                          ? "2. Sampah Terdeteksi! Ambil Foto"
                          : activeSession.status === "COMPLETED"
                          ? "3. Selesai (Saldo Cair)"
                          : activeSession.status === "NEEDS_REVIEW"
                          ? "Perlu Tinjauan Petugas"
                          : activeSession.status}
                      </span>
                    </div>
                  </div>

                  {activeSession.status === "WAITING_TRASH" && (
                    <div className="p-3 bg-amber-50 border border-amber-600/30 text-amber-950 space-y-2">
                      <p className="text-[11px] leading-relaxed">
                        Masukkan sampah ke corong stasiun sekarang. Sensor ultrasonik akan mendeteksi masuknya sampah secara otomatis.
                      </p>
                      {/* SIMULATOR SHORTCUT */}
                      <button
                        type="button"
                        onClick={handleSimulateUltrasonic}
                        className="w-full py-2 bg-white border border-amber-600/40 text-amber-900 hover:bg-amber-100 font-bold uppercase text-[10px] tracking-wider transition cursor-pointer active:scale-95"
                      >
                        Simulasikan Sampah Masuk Ultrasonic
                      </button>
                    </div>
                  )}

                  {activeSession.status === "TRASH_DETECTED" && (
                    <div className="p-3 bg-blue-50 border border-[#015186]/30 text-[#015186] space-y-2">
                      <p className="text-[11px] leading-relaxed">
                        Sensor mendeteksi objek sampah masuk! Buka kamera HP untuk memotret dan memilih kategori sampah.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDrawerMode("DEPOSIT_FLOW")}
                        className="w-full py-2.5 bg-[#015186] text-white hover:bg-[#003d66] font-bold uppercase text-[11px] tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Camera className="size-3.5" />
                        <span>Buka Formulir Foto &amp; Kategori &rarr;</span>
                      </button>
                    </div>
                  )}

                  {activeSession.status === "COMPLETED" && (
                    <div className="p-3 bg-emerald-50 border border-emerald-600/30 text-emerald-950 space-y-1.5">
                      <p className="font-bold text-xs">
                        {activeSession.isCorrected ? "Koreksi AI Selesai" : "Setoran Berhasil Disetujui!"}
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Saldo reward sebesar <strong>Rp {(activeSession.rewardAmount || 0).toLocaleString("id-ID")}</strong> telah dikreditkan ke buku kas digital Anda.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSession(null)}
                        className="mt-2 text-[10px] text-emerald-800 underline font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Tutup Sesi Ini
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[#55534c] uppercase text-[10px] font-bold">
                    Pilih Stasiun Setor Terdekat:
                  </label>
                  <select
                    value={selectedStationId}
                    onChange={(e) => setSelectedStationId(e.target.value)}
                    className="w-full h-11 border border-[#1d1c19]/30 bg-white px-3 font-mono text-sm focus:outline-hidden focus:border-[#1d1c19]"
                  >
                    {STATIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.deviceId}) - {s.lokasi}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleStartSession(selectedStationId)}
                    disabled={isCreatingSession}
                    className="w-full py-3 bg-[#1d1c19] text-[#f2f1ed] text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Camera className="size-4" />
                    <span>Mulai Sesi Setor (5 Menit)</span>
                  </button>
                </div>
              )}
            </div>

            {/* AI CHATBOT WIDGET */}
            <ChatbotWidget />
          </div>

          {/* ----- KOLOM KANAN (7/12 KATALOG VOUCHER & RIWAYAT SESI AI) ----- */}
          <div className="lg:col-span-7 space-y-6">
            {/* KATALOG PENUKARAN VOUCHER */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Ticket className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Katalog Pencairan Poin Warga
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Klaim Otomatis</span>
              </div>

              <div className="space-y-3 font-gt-mono text-xs">
                {VOUCHERS.map((v) => {
                  const canAfford = balance >= v.costPoints;
                  return (
                    <div
                      key={v.id}
                      className="border border-[#1d1c19]/15 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#1d1c19]/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-[#015186] uppercase border border-[#015186]/30 px-1.5 py-0.5">
                            {v.category}
                          </span>
                          <span className="text-[11px] text-[#84827a]">{v.issuer}</span>
                        </div>
                        <h3 className="font-bold text-[#1d1c19] text-sm">{v.title}</h3>
                        <span className="text-xs font-bold text-[#1d1c19]">
                          Rp {v.costPoints.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRedeemVoucher(v)}
                        disabled={!canAfford}
                        className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition cursor-pointer self-start sm:self-auto active:scale-95 ${
                          canAfford
                            ? "border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] hover:bg-black shadow-xs"
                            : "border-[#1d1c19]/15 bg-[#f2f1ed] text-[#84827a] cursor-not-allowed"
                        }`}
                      >
                        {canAfford ? "Tukar Saldo →" : "Saldo Kurang"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIWAYAT SESI SETOR IOT (DILENGKAPI BUKTI FOTO & HASIL AI) */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[#55534c]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Riwayat Sesi &amp; Verifikasi AI Anti-Curang ({history.length})
                  </span>
                </div>
                <button
                  onClick={loadCitizenData}
                  className="text-[10px] text-[#84827a] hover:text-[#1d1c19] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Refresh
                </button>
              </div>

              <div className="divide-y divide-[#1d1c19]/10 font-gt-mono text-xs">
                {history.map((tx) => (
                  <div key={tx.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#1d1c19] text-sm block">
                          Sesi {tx.sessionCode} &bull; {tx.userCategory || "Umum"}
                        </span>
                        <span className="text-[10px] text-[#84827a]">
                          {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-[#015186] block">
                          +Rp {tx.rewardAmount.toLocaleString("id-ID")}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 border font-semibold uppercase ${
                            tx.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-600/40"
                              : tx.status === "NEEDS_REVIEW"
                              ? "bg-amber-50 text-amber-900 border-amber-600/40"
                              : "bg-zinc-100 text-[#55534c] border-zinc-300"
                          }`}
                        >
                          {tx.status === "COMPLETED"
                            ? tx.isCorrected
                              ? "Dikoreksi AI"
                              : "Disetujui"
                            : tx.status === "NEEDS_REVIEW"
                            ? "Perlu Tinjauan Petugas"
                            : tx.status}
                        </span>
                      </div>
                    </div>

                    {/* DETAIL HASIL AI VISION SEBAGAI BUKTI RIWAYAT */}
                    {tx.aiReason && (
                      <div className="p-2.5 bg-[#fbfbfa] border border-[#1d1c19]/10 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#84827a]">
                          <span className="flex items-center gap-1">
                            <Sparkles className="size-3 text-[#015186]" />
                            Deteksi AI: <strong>{tx.aiCategory?.toUpperCase()}</strong>
                          </span>
                          {tx.aiConfidence && (
                            <span className="font-semibold text-emerald-800">
                              Akurasi: {Math.round(tx.aiConfidence * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[#55534c]">{tx.aiReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----- MODAL / DRAWER: FORMULIR FOTO & KATEGORI SETORAN IOT ----- */}
      {drawerMode === "DEPOSIT_FLOW" && (
        <div className="fixed inset-0 z-50 bg-[#1d1c19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f2f1ed] border border-[#1d1c19] w-full max-w-lg p-6 shadow-2xl space-y-4 font-gt-mono">
            <div className="flex items-center justify-between border-b border-[#1d1c19]/15 pb-3">
              <div>
                <span className="text-[10px] text-[#015186] font-bold uppercase tracking-wider block">
                  VERIFIKASI FOTO AI VISION
                </span>
                <h3 className="text-lg font-bold text-[#1d1c19]">
                  Sesi: {activeSession?.sessionCode || "Setoran Baru"}
                </h3>
              </div>
              <button
                onClick={() => setDrawerMode("NONE")}
                className="text-[#84827a] hover:text-[#1d1c19] p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* STEP 1: PILIH KATEGORI */}
              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                  1. Pilih Kategori Sampah Anda:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ORGANIK")}
                    className={`p-3.5 text-left border transition cursor-pointer active:scale-98 ${
                      selectedCategory === "ORGANIK"
                        ? "border-[#1d1c19] bg-[#1d1c19] text-white font-bold shadow-xs"
                        : "border-[#1d1c19]/20 bg-white text-[#1d1c19] hover:border-[#1d1c19]"
                    }`}
                  >
                    <span className="block text-sm">Organik</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">
                      Canang, sisa makanan, daun &bull; Rp {tariff.organicRate.toLocaleString("id-ID")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ANORGANIK")}
                    className={`p-3.5 text-left border transition cursor-pointer active:scale-98 ${
                      selectedCategory === "ANORGANIK"
                        ? "border-[#1d1c19] bg-[#1d1c19] text-white font-bold shadow-xs"
                        : "border-[#1d1c19]/20 bg-white text-[#1d1c19] hover:border-[#1d1c19]"
                    }`}
                  >
                    <span className="block text-sm">Anorganik</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">
                      Botol plastik, kardus, kaleng &bull; Rp {tariff.inorganicRate.toLocaleString("id-ID")}
                    </span>
                  </button>
                </div>
              </div>

              {/* STEP 2: AMBIL FOTO KAMERA */}
              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                  2. Ambil Foto Sampah (Kompresi Otomatis Maks 1280px):
                </label>

                {compressedResult ? (
                  <div className="space-y-2">
                    <div className="relative border border-[#1d1c19]/30 bg-black h-48 w-full flex items-center justify-center overflow-hidden">
                      <Image
                        src={compressedResult.dataUrl}
                        alt="Foto Sampah"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                      <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white p-2 text-[10px] flex justify-between">
                        <span>Ukuran: {compressedResult.compressedSizeKb} KB</span>
                        <span className="text-emerald-400 font-bold">Terkompresi ({compressedResult.compressionRatio}%)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-[#015186] underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Ambil Ulang Foto Kamera
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-[#1d1c19]/30 p-6 bg-white text-center space-y-3">
                    <div className="size-10 mx-auto border border-[#1d1c19]/20 bg-[#fbfbfa] flex items-center justify-center">
                      <Camera className="size-5 text-[#55534c]" />
                    </div>
                    <p className="text-[11px] text-[#55534c]">
                      {isCompressing
                        ? "Mengompresi foto kamera ke resolusi optimal 1280px..."
                        : "Arahkan kamera ke sampah yang baru saja Anda masukkan ke stasiun."}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                      className="py-2.5 px-4 bg-[#1d1c19] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer active:scale-95 shadow-xs"
                    >
                      {isCompressing ? "Memproses Gambar..." : "Buka Kamera Belakang HP"}
                    </button>
                  </div>
                )}
              </div>

              {/* SHORTCUT PRESET SIMULATOR 1-KLIK DESKTOP */}
              <div className="p-3 bg-[#fbfbfa] border border-[#1d1c19]/15 space-y-1.5 text-[10px]">
                <span className="text-[#84827a] font-bold uppercase block">
                  Uji Coba Cepat Preset (Tanpa Kamera):
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("ORGANIK", "/samples/sample-canang.png")}
                    className="flex-1 py-1.5 bg-white border border-[#1d1c19]/20 hover:border-[#1d1c19] font-bold cursor-pointer active:scale-95"
                  >
                    Foto Canang Organik
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("ANORGANIK", "/samples/sample-pet.png")}
                    className="flex-1 py-1.5 bg-white border border-[#1d1c19]/20 hover:border-[#1d1c19] font-bold cursor-pointer active:scale-95"
                  >
                    Foto Botol Anorganik
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmitVerification}
                  disabled={isVerifyingAi || !compressedResult}
                  className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                >
                  <Sparkles className="size-4" />
                  <span>
                    {isVerifyingAi
                      ? "Memverifikasi AI Vision Anti-Curang..."
                      : "Verifikasi AI & Klaim Saldo Flat →"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----- DRAWER: REDEEM CONFIRMATION ----- */}
      {drawerMode === "REDEEM" && selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-[#1d1c19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f2f1ed] border border-[#1d1c19] w-full max-w-md p-6 shadow-2xl space-y-4 font-gt-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1d1c19]/15 pb-3">
              <div>
                <span className="text-[10px] text-[#015186] font-bold uppercase tracking-wider block">
                  PENUKARAN SALDO BANK SAMPAH
                </span>
                <h3 className="text-base font-bold text-[#1d1c19]">
                  {selectedVoucher.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setDrawerMode("NONE");
                  setSelectedVoucher(null);
                }}
                className="text-[#84827a] hover:text-[#1d1c19] p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-white border border-[#1d1c19]/15 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#84827a]">Nominal Penukaran:</span>
                <span className="font-bold text-[#1d1c19]">
                  Rp {selectedVoucher.costPoints.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#84827a]">Sisa Saldo Kas Anda:</span>
                <span className="font-bold text-emerald-800">
                  Rp {(balance - selectedVoucher.costPoints).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1d1c19]/10">
                <span className="text-[#84827a]">Penyedia Layanan:</span>
                <span className="font-bold text-[#1d1c19]">{selectedVoucher.issuer}</span>
              </div>
            </div>

            <button
              onClick={confirmRedeem}
              className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer active:scale-95"
            >
              Ajukan Penukaran Saldo &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
