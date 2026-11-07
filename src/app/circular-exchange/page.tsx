"use client";

import { useState, useEffect, useRef } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import { generateDeposit, generateWallet, DepositRecord, UserWallet } from "@/lib/mock-telemetry";
import { playSuccessChime } from "@/lib/audio-alert";
import { compressImage, CompressedImageResult } from "@/lib/image-compress";
import { queueOfflineDeposit, getQueuedDeposits, QueuedDeposit } from "@/lib/offline-queue";

const MATERIAL_RATES = [
  { id: "PET", name: "Botol Plastik PET", ratePerKg: 4500, pointsPerKg: 450, co2PerKg: 1.8, category: "Anorganik" },
  { id: "HDPE", name: "Tutup & Botol Tebal", ratePerKg: 3800, pointsPerKg: 380, co2PerKg: 1.5, category: "Anorganik" },
  { id: "METAL", name: "Kaleng Minuman & Logam", ratePerKg: 9500, pointsPerKg: 950, co2PerKg: 3.2, category: "Anorganik" },
  { id: "KARDUS", name: "Kardus & Kertas Dupleks", ratePerKg: 2200, pointsPerKg: 220, co2PerKg: 0.9, category: "Anorganik" },
  { id: "ORGANIK", name: "Canang & Limbah Upakara", ratePerKg: 1200, pointsPerKg: 120, co2PerKg: 0.4, category: "Organik" },
];

const VOUCHERS = [
  { id: "V-PLN-20K", title: "Token Listrik PLN Rp 20.000", costPoints: 2000, category: "Listrik", issuer: "PLN Distribusi Bali" },
  { id: "V-PLS-10K", title: "Pulsa Telkomsel Rp 10.000", costPoints: 1000, category: "Pulsa", issuer: "Telkomsel" },
  { id: "V-SEMBAKO", title: "Voucher Beras Banjar 2.5 kg", costPoints: 3500, category: "Pangan", issuer: "Koperasi Banjar Kayumas" },
  { id: "V-PDAM", title: "Iuran Air / Banjar Adat", costPoints: 1500, category: "Iuran", issuer: "LPD Adat Kayumas" },
];

export default function CircularExchangePage() {
  const [wallet, setWallet] = useState<UserWallet>({
    userId: "WGR-DPS-8841",
    name: "I Wayan Sudiarta",
    totalPoints: 4850,
    totalCo2SavedKg: 18.4,
    totalDeposits: 32,
  });

  const [history, setHistory] = useState<DepositRecord[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<QueuedDeposit[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Bottom Sheets / Drawers State
  const [drawerMode, setDrawerMode] = useState<"NONE" | "DEPOSIT" | "CAMERA" | "REDEEM">("NONE");
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_RATES[0]);
  const [weightInput, setWeightInput] = useState<string>("1250"); // in grams
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Camera / Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedResult, setCompressedResult] = useState<CompressedImageResult | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<(typeof VOUCHERS)[0] | null>(null);

  useEffect(() => {
    setWallet(generateWallet());
    setHistory([
      generateDeposit("WGR-DPS-8841"),
      generateDeposit("WGR-DPS-8841"),
      generateDeposit("WGR-DPS-8841"),
    ]);

    // Check online status and existing offline queue
    setIsOnline(navigator.onLine);
    getQueuedDeposits().then((items) => setOfflineQueue(items));

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync offline queue
      getQueuedDeposits().then((queued) => {
        if (queued.length > 0) {
          setSuccessToast(`Menyinkronkan ${queued.length} setoran yang tersimpan di memori lokal.`);
          setTimeout(() => setSuccessToast(null), 4000);
        }
      });
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Weight stepper calculations
  const parsedWeight = Math.max(50, Number(weightInput) || 0);
  const weightKg = Number((parsedWeight / 1000).toFixed(2));
  const calcPoints = Math.round(weightKg * selectedMaterial.pointsPerKg);
  const calcRupiah = Math.round(weightKg * selectedMaterial.ratePerKg);
  const calcCo2 = Number((weightKg * selectedMaterial.co2PerKg).toFixed(2));

  const handleAdjustWeight = (deltaGrams: number) => {
    const cur = Number(weightInput) || 0;
    const next = Math.max(100, Math.min(25000, cur + deltaGrams));
    setWeightInput(String(next));
  };

  // Direct camera capture & client-side compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setDrawerMode("CAMERA");

    try {
      const result = await compressImage(file);
      setCompressedResult(result);
      // Automatically map predicted category to material rate
      const matched = MATERIAL_RATES.find((m) => m.id === result.predictedCategory);
      if (matched) setSelectedMaterial(matched);
      playSuccessChime();
    } catch (err) {
      alert("Gagal memproses gambar kamera. Harap coba lagi.");
      setDrawerMode("NONE");
    } finally {
      setIsCompressing(false);
    }
  };

  // Submit deposit (supports offline queue via IndexedDB)
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedWeight <= 0) return;

    setIsSubmitting(true);

    const newRecord: DepositRecord = {
      id: "TRX-" + Math.floor(100000 + Math.random() * 900000),
      userId: wallet.userId,
      userName: wallet.name,
      wasteType: selectedMaterial.category === "Organik" ? "ORGANIC" : "INORGANIC",
      weightGram: parsedWeight,
      pointsEarned: calcPoints,
      co2SavedKg: calcCo2,
      createdAt: new Date().toISOString(),
    };

    if (!isOnline) {
      // Save to IndexedDB offline queue
      const queuedItem: QueuedDeposit = {
        ...newRecord,
        materialName: selectedMaterial.name,
        status: "PENDING_SYNC",
      };
      await queueOfflineDeposit(queuedItem);
      const updatedQueue = await getQueuedDeposits();
      setOfflineQueue(updatedQueue);

      setSuccessToast(`Mode Offline: Setoran disimpan di memori ponsel (${updatedQueue.length} antrean).`);
    } else {
      // Direct update
      setWallet((prev) => ({
        ...prev,
        totalPoints: prev.totalPoints + calcPoints,
        totalCo2SavedKg: Number((prev.totalCo2SavedKg + calcCo2).toFixed(2)),
        totalDeposits: prev.totalDeposits + 1,
      }));
      setHistory((prev) => [newRecord, ...prev]);
      setSuccessToast(`Setoran Berhasil: +${calcPoints} poin (Rp ${calcRupiah.toLocaleString("id-ID")})`);
    }

    playSuccessChime();
    setIsSubmitting(false);
    setDrawerMode("NONE");
    setCompressedResult(null);

    setTimeout(() => setSuccessToast(null), 4500);
  };

  const handleRedeemVoucher = (voucher: (typeof VOUCHERS)[0]) => {
    if (wallet.totalPoints < voucher.costPoints) {
      alert("Saldo poin Anda belum mencukupi untuk voucher ini.");
      return;
    }
    setSelectedVoucher(voucher);
    setDrawerMode("REDEEM");
  };

  const confirmRedeem = () => {
    if (!selectedVoucher) return;
    setWallet((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints - selectedVoucher.costPoints,
    }));
    playSuccessChime();
    setDrawerMode("NONE");
    setSuccessToast(`Berhasil menukar ${selectedVoucher.title}! SMS kode voucher telah dikirim.`);
    setSelectedVoucher(null);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  return (
    <div className="relative min-h-[100dvh] bg-[#f2f1ed] text-[#1d1c19] selection:bg-[#1d1c19] selection:text-[#f2f1ed]">
      {/* 0. INTERACTIVE WEBGL FLUID SHADER */}
      <PearCanvas />

      {/* Atmospheric Video Loop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-15 mix-blend-multiply">
        <video
          src="/films/signal.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          role="status"
          className="sticky top-0 inset-x-0 z-40 bg-[#015186] text-white py-2.5 px-4 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in"
        >
          {successToast}
        </div>
      )}

      {/* Hidden File Input for direct back camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        aria-hidden="true"
      />

      {/* MAIN CONTAINER: Optimized for 360-390px, scales up gracefully */}
      <div className="relative z-10 pt-20 sm:pt-28 pb-32 px-4 sm:px-6 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-4">
        
        {/* User Card & Wallet Balance (Vertical mobile priority) */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-full bg-[#1d1c19] text-[#f2f1ed] flex items-center justify-center font-bold text-sm">
                WS
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#1d1c19] leading-tight">
                  {wallet.name}
                </h1>
                <span className="text-[10px] font-gt-mono text-[#84827a]">
                  ID: {wallet.userId} &middot; Banjar Kayumas
                </span>
              </div>
            </div>

            {/* Offline / Online Sync Indicator */}
            <div className="flex items-center gap-1.5 font-gt-mono text-[10px] bg-[#f2f1ed] px-2 py-1 border border-[#1d1c19]/10">
              <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-600" : "bg-amber-600 animate-pulse"}`} />
              <span className={isOnline ? "text-emerald-900 font-semibold" : "text-amber-900 font-semibold"}>
                {isOnline ? "Online" : "Offline"}
              </span>
              {offlineQueue.length > 0 && (
                <span className="bg-amber-600 text-white px-1.5 rounded-full text-[9px]">
                  {offlineQueue.length}
                </span>
              )}
            </div>
          </div>

          {/* Saldo Poin & Metrik Utama */}
          <div className="grid grid-cols-2 gap-2 pt-1 font-gt-mono">
            <div className="bg-[#f2f1ed]/80 border border-[#1d1c19]/10 p-3">
              <span className="text-[10px] text-[#84827a] uppercase font-semibold block">
                Saldo Poin Warga
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#015186] mt-0.5">
                {wallet.totalPoints.toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-[#55534c] block mt-0.5">
                &asymp; Rp {(wallet.totalPoints * 10).toLocaleString("id-ID")}
              </span>
            </div>

            <div className="bg-[#f2f1ed]/80 border border-[#1d1c19]/10 p-3">
              <span className="text-[10px] text-[#84827a] uppercase font-semibold block">
                Emisi Dicegah
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-0.5">
                {wallet.totalCo2SavedKg}
                <span className="text-xs font-normal text-[#84827a] ml-1">kg</span>
              </p>
              <span className="text-[10px] text-[#55534c] block mt-0.5">
                Standar IPCC 2026
              </span>
            </div>
          </div>
        </div>

        {/* PROMINENT THUMB-ZONE PRIMARY ACTIONS (48px+ touch targets) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Kamera AI Foto Sampah */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#015186] text-white p-3.5 rounded-none border border-[#015186] flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm min-h-[58px] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📷</span>
              <span className="text-xs font-bold uppercase tracking-wider font-gt-mono">
                Foto Sampah
              </span>
            </div>
            <span className="text-[10px] text-white/80 leading-none">
              Kamera &middot; Deteksi AI Cepat
            </span>
          </button>

          {/* Input Timbangan / Setoran Baru */}
          <button
            type="button"
            onClick={() => setDrawerMode("DEPOSIT")}
            className="bg-[#1d1c19] text-[#f2f1ed] p-3.5 rounded-none border border-[#1d1c19] flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm min-h-[58px] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">+</span>
              <span className="text-xs font-bold uppercase tracking-wider font-gt-mono">
                Input Setoran
              </span>
            </div>
            <span className="text-[10px] text-white/80 leading-none">
              Timbang &amp; Tambah Poin
            </span>
          </button>
        </div>

        {/* Daftar Harga Nilai Ekonomi Sampah (Vertical stacked cards) */}
        <div className="bg-white/85 border border-[#1d1c19]/15 p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <span className="text-xs font-bold font-gt-mono uppercase text-[#1d1c19]">
              Nilai Tukar Sampah Hari Ini
            </span>
            <span className="text-[10px] font-gt-mono text-[#015186]">
              Per Kilogram (Kg)
            </span>
          </div>

          <div className="space-y-1.5 font-gt-mono text-xs">
            {MATERIAL_RATES.map((mat) => (
              <div
                key={mat.id}
                onClick={() => {
                  setSelectedMaterial(mat);
                  setDrawerMode("DEPOSIT");
                }}
                className="p-2.5 border border-[#1d1c19]/10 bg-[#f2f1ed]/50 flex items-center justify-between cursor-pointer active:bg-[#e7e5df] transition"
              >
                <div>
                  <span className="font-semibold text-[#1d1c19] block text-xs">
                    {mat.name}
                  </span>
                  <span className="text-[10px] text-[#84827a]">
                    Kategori {mat.category} &middot; Mencegah {mat.co2PerKg} kg CO₂
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#015186] text-xs block">
                    +{mat.pointsPerKg} Poin
                  </span>
                  <span className="text-[10px] text-[#55534c]">
                    Rp {mat.ratePerKg.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Katalog Penukaran Poin (Vertical cards with one-tap action) */}
        <div className="bg-white/85 border border-[#1d1c19]/15 p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <span className="text-xs font-bold font-gt-mono uppercase text-[#1d1c19]">
              Tukar Voucher Hadiah
            </span>
            <span className="text-[10px] font-gt-mono text-[#84827a]">
              Instan via SMS
            </span>
          </div>

          <div className="space-y-2">
            {VOUCHERS.map((v) => {
              const canAfford = wallet.totalPoints >= v.costPoints;
              return (
                <div
                  key={v.id}
                  className="border border-[#1d1c19]/15 bg-white p-3 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-gt-mono font-semibold text-[#015186] uppercase block">
                      {v.category} &middot; {v.issuer}
                    </span>
                    <h3 className="text-xs font-bold text-[#1d1c19] mt-0.5 truncate">
                      {v.title}
                    </h3>
                    <span className="text-xs font-gt-mono font-bold text-[#1d1c19] block mt-0.5">
                      {v.costPoints.toLocaleString("id-ID")} Poin
                    </span>
                  </div>

                  <button
                    onClick={() => handleRedeemVoucher(v)}
                    disabled={!canAfford}
                    className={`px-3 py-2 text-xs font-bold tracking-wider uppercase border min-h-[44px] transition active:scale-95 shrink-0 ${
                      canAfford
                        ? "border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed]"
                        : "border-[#1d1c19]/15 bg-[#e7e5df] text-[#84827a] cursor-not-allowed"
                    }`}
                  >
                    Tukar
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Riwayat Transaksi (Vertical Cards, No Wide Table) */}
        <div className="bg-white/85 border border-[#1d1c19]/15 p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <span className="text-xs font-bold font-gt-mono uppercase text-[#1d1c19]">
              Riwayat Setoran Anda
            </span>
            <span className="text-[10px] font-gt-mono text-[#84827a]">
              {history.length} transaksi
            </span>
          </div>

          <div className="space-y-2 font-gt-mono text-xs">
            {history.map((tx) => (
              <div
                key={tx.id}
                className="p-3 border border-[#1d1c19]/10 bg-[#f2f1ed]/40 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-[#1d1c19] block text-xs">
                    {(tx.weightGram / 1000).toFixed(2)} kg {tx.wasteType === "ORGANIC" ? "Organik Canang" : "Anorganik Plastik"}
                  </span>
                  <span className="text-[10px] text-[#84827a] block mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} &middot; ID: {tx.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#015186] text-xs block">
                    +{tx.pointsEarned} Poin
                  </span>
                  <span className="text-[10px] text-emerald-800">
                    -{tx.co2SavedKg} kg CO₂
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MOBILE BOTTOM SHEET / DRAWER: CAMERA AI PREVIEW */}
      {drawerMode === "CAMERA" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-crossfade">
          <div className="bg-[#f2f1ed] text-[#1d1c19] w-full max-w-lg rounded-t-2xl p-5 shadow-2xl border-t border-[#1d1c19]/20 max-h-[92dvh] overflow-y-auto space-y-4">
            <div className="w-12 h-1 bg-[#1d1c19]/25 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
              <div>
                <span className="text-[10px] font-gt-mono text-[#015186] font-bold uppercase tracking-wider block">
                  HASIL SCAN FOTO KAMERA
                </span>
                <h3 className="text-lg font-bold text-[#1d1c19]">
                  Analisis AI &amp; Kompresi Gambar
                </h3>
              </div>
              <button
                onClick={() => {
                  setDrawerMode("NONE");
                  setCompressedResult(null);
                }}
                className="text-[#84827a] hover:text-[#1d1c19] text-xl font-bold p-2 min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            </div>

            {isCompressing ? (
              <div className="py-12 text-center space-y-3 font-gt-mono">
                <div className="size-8 border-2 border-[#015186] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#55534c]">
                  Sedang mengompresi gambar di ponsel &amp; menganalisis jenis sampah...
                </p>
              </div>
            ) : compressedResult ? (
              <div className="space-y-4">
                {/* Photo Preview & Compression Stat */}
                <div className="relative border border-[#1d1c19]/20 bg-black overflow-hidden max-h-56 flex items-center justify-center">
                  <img
                    src={compressedResult.dataUrl}
                    alt="Pratinjau Sampah"
                    className="max-h-56 w-auto object-contain"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-xs text-white p-2 text-[10px] font-gt-mono flex justify-between">
                    <span>Asli: {compressedResult.originalSizeKb} KB</span>
                    <span className="text-emerald-400 font-bold">
                      Kompresi: {compressedResult.compressedSizeKb} KB (-{compressedResult.compressionRatio}%)
                    </span>
                  </div>
                </div>

                {/* AI Classification Prediction */}
                <div className="bg-white border border-[#1d1c19]/15 p-3.5 space-y-1.5 font-gt-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-gt-mono text-[#84827a] uppercase font-semibold">
                      PREDIKSI AI TERDETEKSI:
                    </span>
                    <span className="text-[10px] font-gt-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-600/30">
                      Akurasi: {compressedResult.predictedConfidence}%
                    </span>
                  </div>
                  <p className="text-base font-bold text-[#1d1c19]">
                    {selectedMaterial.name} ({selectedMaterial.category})
                  </p>
                  <p className="text-xs text-[#55534c] leading-relaxed">
                    Sistem otomatis memilih jenis material ini untuk perhitungan nilai poin per kg.
                  </p>
                </div>

                {/* Transition to Deposit Drawer */}
                <button
                  type="button"
                  onClick={() => setDrawerMode("DEPOSIT")}
                  className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold tracking-wider uppercase min-h-[48px] active:scale-98 transition shadow-sm"
                >
                  Lanjut ke Input Timbangan →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET / DRAWER: INPUT SETORAN FORM */}
      {drawerMode === "DEPOSIT" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-crossfade">
          <div className="bg-[#f2f1ed] text-[#1d1c19] w-full max-w-lg rounded-t-2xl p-5 shadow-2xl border-t border-[#1d1c19]/20 max-h-[92dvh] overflow-y-auto space-y-4">
            <div className="w-12 h-1 bg-[#1d1c19]/25 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
              <div>
                <span className="text-[10px] font-gt-mono text-[#015186] font-bold uppercase tracking-wider block">
                  FORMULIR SETORAN SAMPAH
                </span>
                <h3 className="text-lg font-bold text-[#1d1c19]">
                  Input Timbangan &amp; Poin
                </h3>
              </div>
              <button
                onClick={() => setDrawerMode("NONE")}
                className="text-[#84827a] hover:text-[#1d1c19] text-xl font-bold p-2 min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDeposit} className="space-y-4 font-gt-sans">
              {/* Category Picker */}
              <div>
                <label className="text-xs font-bold uppercase font-gt-mono text-[#1d1c19] block mb-1.5">
                  1. Pilih Jenis Sampah:
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-gt-mono text-xs">
                  {MATERIAL_RATES.map((mat) => {
                    const isSelected = selectedMaterial.id === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat)}
                        className={`p-2.5 text-left border transition active:scale-98 min-h-[44px] ${
                          isSelected
                            ? "border-[#1d1c19] bg-[#1d1c19] text-white font-bold"
                            : "border-[#1d1c19]/15 bg-white text-[#1d1c19]"
                        }`}
                      >
                        <span className="block truncate text-xs">{mat.name}</span>
                        <span className="block text-[10px] opacity-80 font-normal">
                          +{mat.pointsPerKg} Poin/kg
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weight Input with Large Stepper +/- & Keypad Mode */}
              <div>
                <label className="text-xs font-bold uppercase font-gt-mono text-[#1d1c19] block mb-1.5">
                  2. Berat Sampah (Gram / Kg):
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(-250)}
                    className="size-12 bg-white border border-[#1d1c19]/25 text-xl font-bold text-[#1d1c19] flex items-center justify-center active:bg-[#e7e5df] shrink-0"
                    aria-label="Kurang 250 gram"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      step="50"
                      min="50"
                      max="50000"
                      required
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="w-full bg-white border border-[#1d1c19]/25 p-3 text-center text-xl font-bold font-gt-mono text-[#1d1c19] focus:outline-none focus:border-[#015186]"
                      placeholder="1000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-gt-mono text-[#84827a] pointer-events-none">
                      gram
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(250)}
                    className="size-12 bg-white border border-[#1d1c19]/25 text-xl font-bold text-[#1d1c19] flex items-center justify-center active:bg-[#e7e5df] shrink-0"
                    aria-label="Tambah 250 gram"
                  >
                    +
                  </button>
                </div>

                {/* Quick Step Pills for 1-hand thumb */}
                <div className="flex gap-1.5 mt-2 font-gt-mono text-[11px]">
                  {[500, 1000, 2000, 5000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setWeightInput(String(quick))}
                      className="flex-1 py-1.5 border border-[#1d1c19]/15 bg-white text-[#55534c] active:bg-[#1d1c19] active:text-white"
                    >
                      {quick >= 1000 ? `${quick / 1000}kg` : `${quick}g`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Calculation Summary Card */}
              <div className="bg-white border border-[#1d1c19]/15 p-3.5 font-gt-mono space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#84827a]">Total Berat Bersih:</span>
                  <span className="font-bold text-[#1d1c19]">{weightKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#84827a]">Poin Diperoleh:</span>
                  <span className="font-bold text-[#015186]">+{calcPoints} Poin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#84827a]">Nilai Rupiah Daur Ulang:</span>
                  <span className="font-bold text-[#1d1c19]">Rp {calcRupiah.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between border-t border-[#1d1c19]/10 pt-1.5">
                  <span className="text-[#84827a]">Emisi CO₂ Dicegah:</span>
                  <span className="font-bold text-emerald-800">{calcCo2} kg</span>
                </div>
              </div>

              {/* Sticky Mobile Submit Button */}
              <div className="pt-2 sticky bottom-0 bg-[#f2f1ed]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1d1c19] text-white py-4 px-4 text-xs font-bold tracking-wider uppercase min-h-[52px] active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Menyimpan Setoran...</span>
                  ) : (
                    <span>Simpan Setoran (+{calcPoints} Poin)</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET / DRAWER: REDEEM VOUCHER CONFIRMATION */}
      {drawerMode === "REDEEM" && selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-crossfade">
          <div className="bg-[#f2f1ed] text-[#1d1c19] w-full max-w-lg rounded-t-2xl p-5 shadow-2xl border-t border-[#1d1c19]/20 space-y-4">
            <div className="w-12 h-1 bg-[#1d1c19]/25 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
              <div>
                <span className="text-[10px] font-gt-mono text-[#015186] font-bold uppercase tracking-wider block">
                  KONFIRMASI PENUKARAN
                </span>
                <h3 className="text-lg font-bold text-[#1d1c19]">
                  Tukar Saldo Poin Warga
                </h3>
              </div>
              <button
                onClick={() => setDrawerMode("NONE")}
                className="text-[#84827a] hover:text-[#1d1c19] text-xl font-bold p-2 min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            </div>

            <div className="bg-white border border-[#1d1c19]/15 p-4 space-y-2">
              <span className="text-[10px] font-gt-mono uppercase text-[#015186] font-bold block">
                {selectedVoucher.category} &middot; {selectedVoucher.issuer}
              </span>
              <h4 className="text-base font-bold text-[#1d1c19]">
                {selectedVoucher.title}
              </h4>
              <div className="flex justify-between font-gt-mono text-xs pt-2 border-t border-[#1d1c19]/10">
                <span className="text-[#84827a]">Biaya Poin:</span>
                <span className="font-bold text-[#1d1c19]">{selectedVoucher.costPoints.toLocaleString("id-ID")} Poin</span>
              </div>
              <div className="flex justify-between font-gt-mono text-xs">
                <span className="text-[#84827a]">Sisa Poin Anda:</span>
                <span className="font-bold text-[#015186]">
                  {(wallet.totalPoints - selectedVoucher.costPoints).toLocaleString("id-ID")} Poin
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDrawerMode("NONE")}
                className="flex-1 py-3.5 border border-[#1d1c19]/25 bg-white text-xs font-bold uppercase min-h-[48px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmRedeem}
                className="flex-1 py-3.5 bg-[#015186] text-white text-xs font-bold uppercase min-h-[48px] active:scale-98 shadow-sm"
              >
                Konfirmasi Tukar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
