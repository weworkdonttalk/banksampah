"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import PearCanvas from "@/components/webgl/pear-canvas";
import ChatbotWidget from "@/components/warga/chatbot-widget";
import { generateDeposit, generateWallet, DepositRecord, UserWallet } from "@/lib/mock-telemetry";
import { playSuccessChime } from "@/lib/audio-alert";
import { compressImage, CompressedImageResult } from "@/lib/image-compress";
import { queueOfflineDeposit, getQueuedDeposits, QueuedDeposit } from "@/lib/offline-queue";
import {
  Camera,
  PlusCircle,
  Coins,
  Wifi,
  WifiOff,
  Ticket,
  Clock,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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

  const [drawerMode, setDrawerMode] = useState<"NONE" | "DEPOSIT" | "CAMERA" | "REDEEM">("NONE");
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_RATES[0]);
  const [materialFilter, setMaterialFilter] = useState<string>("SEMUA");
  const [historyFilter, setHistoryFilter] = useState<string>("SEMUA");
  const [weightInput, setWeightInput] = useState<string>("1250");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

    setIsOnline(navigator.onLine);
    getQueuedDeposits().then((items) => setOfflineQueue(items));

    const handleOnline = () => {
      setIsOnline(true);
      getQueuedDeposits().then((queued) => {
        if (queued.length > 0) {
          setSuccessToast(`Menyinkronkan ${queued.length} setoran tersimpan lokal.`);
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

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setDrawerMode("CAMERA");

    try {
      const result = await compressImage(file);
      setCompressedResult(result);
      const matched = MATERIAL_RATES.find((m) => m.id === result.predictedCategory);
      if (matched) setSelectedMaterial(matched);
      playSuccessChime();
    } catch {
      alert("Gagal memproses gambar kamera. Harap coba lagi.");
      setDrawerMode("NONE");
    } finally {
      setIsCompressing(false);
    }
  };

  // 1-Click Interactive Simulator for Desktop Testing without camera
  const handleSimulateVision = (catId: string) => {
    setIsCompressing(true);
    setDrawerMode("CAMERA");
    setTimeout(() => {
      const matched = MATERIAL_RATES.find((m) => m.id === catId) || MATERIAL_RATES[0];
      setSelectedMaterial(matched);
      setCompressedResult({
        dataUrl: "/samples/sample-pet.png",
        originalSizeKb: 1420,
        compressedSizeKb: 86,
        width: 800,
        height: 600,
        compressionRatio: 94,
        predictedCategory: (matched.id === "METAL" ? "LOGAM" : matched.id) as
          | "PET"
          | "ORGANIK"
          | "KARDUS"
          | "HDPE"
          | "LOGAM",
        predictedConfidence: 96,
      });
      setIsCompressing(false);
      playSuccessChime();
    }, 450);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedWeight <= 0) return;

    setIsSubmitting(true);
    const timestamp = new Date();
    const newRecord: DepositRecord = {
      id: "TRX-" + timestamp.getTime(),
      userId: wallet.userId,
      userName: wallet.name,
      wasteType: selectedMaterial.category === "Organik" ? "ORGANIC" : "INORGANIC",
      weightGram: parsedWeight,
      pointsEarned: calcPoints,
      co2SavedKg: calcCo2,
      createdAt: timestamp.toISOString(),
    };

    if (!isOnline) {
      const queuedItem: QueuedDeposit = {
        ...newRecord,
        materialName: selectedMaterial.name,
        status: "PENDING_SYNC",
      };
      await queueOfflineDeposit(queuedItem);
      const updatedQueue = await getQueuedDeposits();
      setOfflineQueue(updatedQueue);
      setSuccessToast(`Mode Offline: ${updatedQueue.length} setoran tersimpan di memori ponsel.`);
    } else {
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

  const filteredMaterials =
    materialFilter === "SEMUA"
      ? MATERIAL_RATES
      : MATERIAL_RATES.filter((m) => m.category === materialFilter);

  const filteredHistory =
    historyFilter === "SEMUA"
      ? history
      : historyFilter === "ORGANIK"
      ? history.filter((h) => h.wasteType === "ORGANIC")
      : history.filter((h) => h.wasteType === "INORGANIC");

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
          className="sticky top-0 inset-x-0 z-40 bg-[#015186] text-white py-2.5 px-4 sm:px-6 lg:px-8 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in"
        >
          {successToast}
        </aside>
      )}

      {/* HIDDEN CAMERA INPUT */}
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
              <span>DOMPET DIGITAL WARGA // BANJAR KAYUMAS KAJA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
              Bursa Poin &amp; Tabungan Sampah
            </h1>
          </div>

          <div className="flex items-center gap-3 font-gt-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1d1c19]/15 bg-[#fbfbfa]">
              {isOnline ? (
                <>
                  <Wifi className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-900 font-semibold text-[11px]">Online Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3.5 text-amber-600 animate-pulse" />
                  <span className="text-amber-900 font-semibold text-[11px]">
                    Offline ({offlineQueue.length})
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => setDrawerMode("DEPOSIT")}
              className="border border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] px-4 py-2 uppercase text-[11px] font-bold tracking-wider hover:bg-black transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <PlusCircle className="size-3.5" />
              <span>Input Setoran</span>
            </button>
          </div>
        </header>

        {/* 12-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- KOLOM KIRI (5/12 NASABAH & ASISTEN) ----- */}
          <div className="lg:col-span-5 space-y-6">
            {/* MEMBER PASS CARD */}
            <div className="bg-[#1d1c19] text-[#f2f1ed] border border-[#1d1c19] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4 font-gt-mono text-xs">
                <span className="text-[#84827a] tracking-widest uppercase text-[10px]">
                  KARTU DIGITAL NASABAH
                </span>
                <span className="flex items-center gap-1 text-emerald-400 text-[10px] tracking-wider font-bold">
                  <ShieldCheck className="size-3.5" />
                  <span>TERVERIFIKASI</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] font-gt-mono text-[#84827a] block">Nama Nasabah:</span>
                <h2 className="text-2xl font-bold tracking-tight text-[#f2f1ed]">{wallet.name}</h2>
                <span className="font-gt-mono text-xs text-[#84827a] mt-0.5 block">
                  ID: {wallet.userId} &bull; Banjar Kayumas Kaja
                </span>
              </div>

              {/* POINTS & EQUIVALENT RUPIAH */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-gt-mono border-t border-white/10">
                <div className="bg-white/5 border border-white/10 p-3.5">
                  <span className="text-[10px] text-[#84827a] uppercase block">Saldo Poin</span>
                  <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
                    {wallet.totalPoints.toLocaleString("id-ID")}
                  </p>
                  <span className="text-[10px] text-emerald-400 block mt-1">
                    &asymp; Rp {(wallet.totalPoints * 10).toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 p-3.5">
                  <span className="text-[10px] text-[#84827a] uppercase block">Reduksi Emisi</span>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-0.5">
                    {wallet.totalCo2SavedKg}
                    <span className="text-xs font-normal text-white/70 ml-1">kg</span>
                  </p>
                  <span className="text-[10px] text-[#84827a] block mt-1">Standar IPCC 2026</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-[#1d1c19] py-3 px-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Camera className="size-4" />
                  <span>Scan AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerMode("DEPOSIT")}
                  className="border border-white/30 text-white py-3 px-3 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <PlusCircle className="size-4" />
                  <span>Setor Manual</span>
                </button>
              </div>

              {/* QUICK DESKTOP AI SIMULATOR PRESETS */}
              <div className="pt-2 border-t border-white/10 font-gt-mono text-[10px] space-y-1.5">
                <span className="text-[#84827a] uppercase block font-semibold">
                  Uji Coba Deteksi AI Instan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Canang Organik", id: "ORGANIK" },
                    { label: "Botol PET", id: "PET" },
                    { label: "Kaleng Minuman", id: "METAL" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSimulateVision(p.id)}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 cursor-pointer active:scale-95 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI CHATBOT WIDGET */}
            <ChatbotWidget />
          </div>

          {/* ----- KOLOM KANAN (7/12 KATALOG & TRANSAKSI) ----- */}
          <div className="lg:col-span-7 space-y-6">
            {/* MATERIAL RATES */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Coins className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Katalog Nilai Tukar Material Hari Ini
                  </span>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 text-[10px]">
                  {["SEMUA", "Anorganik", "Organik"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMaterialFilter(cat)}
                      className={`px-2.5 py-1 uppercase border cursor-pointer transition ${
                        materialFilter === cat
                          ? "bg-[#1d1c19] text-white border-[#1d1c19] font-bold"
                          : "bg-white text-[#55534c] border-[#1d1c19]/15 hover:border-[#1d1c19]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-gt-mono text-xs">
                {filteredMaterials.map((mat) => {
                  const isSelected = selectedMaterial.id === mat.id;
                  return (
                    <div
                      key={mat.id}
                      onClick={() => {
                        setSelectedMaterial(mat);
                        setDrawerMode("DEPOSIT");
                      }}
                      className={`p-3.5 border transition cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:shadow-xs active:scale-98 ${
                        isSelected
                          ? "border-[#015186] bg-blue-50/50 ring-1 ring-[#015186]"
                          : "border-[#1d1c19]/15 bg-[#fbfbfa] hover:border-[#1d1c19]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1d1c19]">{mat.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 border border-[#1d1c19]/20 uppercase">
                            {mat.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#84827a] block mt-1">
                          Cegah {mat.co2PerKg} kg CO₂ / kg
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#1d1c19]/10">
                        <span className="font-bold text-[#015186]">+{mat.pointsPerKg} Poin</span>
                        <span className="font-semibold text-[#1d1c19]">
                          Rp {mat.ratePerKg.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VOUCHER REWARD CATALOG */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Ticket className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Tukar Poin Dengan Kebutuhan Rumah Tangga
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Klaim Instan</span>
              </div>

              <div className="space-y-3 font-gt-mono text-xs">
                {VOUCHERS.map((v) => {
                  const canAfford = wallet.totalPoints >= v.costPoints;
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
                          {v.costPoints.toLocaleString("id-ID")} Poin
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
                        {canAfford ? "Tukar Sekarang →" : "Poin Kurang"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RECENT SETORAN TRANSACTIONS */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[#55534c]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Riwayat Transaksi Setoran
                  </span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {["SEMUA", "ORGANIK", "ANORGANIK"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setHistoryFilter(t)}
                      className={`px-2 py-0.5 uppercase border cursor-pointer ${
                        historyFilter === t
                          ? "bg-[#1d1c19] text-white border-[#1d1c19]"
                          : "bg-white text-[#55534c] border-[#1d1c19]/15 hover:border-[#1d1c19]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#1d1c19]/10 font-gt-mono text-xs">
                {filteredHistory.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1d1c19] block">
                        {(tx.weightGram / 1000).toFixed(2)} kg &bull;{" "}
                        {tx.wasteType === "ORGANIC" ? "Organik Canang" : "Anorganik"}
                      </span>
                      <span className="text-[10px] text-[#84827a]">
                        {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        &bull; ID: {tx.id}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-[#015186] block">+{tx.pointsEarned} Poin</span>
                      <span className="text-[10px] text-emerald-800">-{tx.co2SavedKg} kg CO₂</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----- DRAWER: CAMERA AI PREVIEW ----- */}
      {drawerMode === "CAMERA" && (
        <div className="fixed inset-0 z-50 bg-[#1d1c19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f2f1ed] border border-[#1d1c19] w-full max-w-lg p-6 shadow-2xl space-y-4 font-gt-mono">
            <div className="flex items-center justify-between border-b border-[#1d1c19]/15 pb-3">
              <div>
                <span className="text-[10px] text-[#015186] font-bold uppercase tracking-wider block">
                  HASIL SCAN VISION AI
                </span>
                <h3 className="text-lg font-bold text-[#1d1c19]">
                  Analisis Material &amp; Optimasi Ukuran
                </h3>
              </div>
              <button
                onClick={() => {
                  setDrawerMode("NONE");
                  setCompressedResult(null);
                }}
                className="text-[#84827a] hover:text-[#1d1c19] p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {isCompressing ? (
              <div className="py-12 text-center space-y-3 font-gt-mono">
                <div className="size-8 border-2 border-[#015186] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#55534c]">
                  Mengompresi data &amp; mengidentifikasi polimer sampah...
                </p>
              </div>
            ) : compressedResult ? (
              <div className="space-y-4">
                <div className="relative border border-[#1d1c19]/20 bg-black h-56 flex items-center justify-center overflow-hidden">
                  <Image
                    src={compressedResult.dataUrl}
                    alt="Pratinjau Sampah"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white p-2 text-[10px] font-mono flex justify-between">
                    <span>Asli: {compressedResult.originalSizeKb} KB</span>
                    <span className="text-emerald-400 font-bold">
                      Kompresi: {compressedResult.compressedSizeKb} KB (-{compressedResult.compressionRatio}%)
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#1d1c19]/15 p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#84827a] uppercase font-bold flex items-center gap-1">
                      <Sparkles className="size-3 text-[#015186]" />
                      Klasifikasi Terdeteksi:
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-600/30">
                      Akurasi: {compressedResult.predictedConfidence}%
                    </span>
                  </div>
                  <p className="text-base font-bold text-[#1d1c19]">
                    {selectedMaterial.name} ({selectedMaterial.category})
                  </p>
                  <p className="text-xs text-[#55534c]">
                    Sistem otomatis mengarahkan ke tarif Rp{selectedMaterial.ratePerKg.toLocaleString("id-ID")}/kg.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerMode("DEPOSIT")}
                  className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>Lanjut ke Formulir Timbangan</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ----- DRAWER: SETORAN FORM ----- */}
      {drawerMode === "DEPOSIT" && (
        <div className="fixed inset-0 z-50 bg-[#1d1c19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f2f1ed] border border-[#1d1c19] w-full max-w-lg p-6 shadow-2xl space-y-4 font-gt-mono">
            <div className="flex items-center justify-between border-b border-[#1d1c19]/15 pb-3">
              <div>
                <span className="text-[10px] text-[#015186] font-bold uppercase tracking-wider block">
                  ENTRI SETORAN SAMPAH
                </span>
                <h3 className="text-lg font-bold text-[#1d1c19]">
                  Input Berat Timbangan &amp; Klaim Poin
                </h3>
              </div>
              <button
                onClick={() => setDrawerMode("NONE")}
                className="text-[#84827a] hover:text-[#1d1c19] p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeposit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                  1. Pilih Jenis Material:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MATERIAL_RATES.map((mat) => {
                    const isSelected = selectedMaterial.id === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat)}
                        className={`p-2.5 text-left border transition cursor-pointer active:scale-98 ${
                          isSelected
                            ? "border-[#1d1c19] bg-[#1d1c19] text-white font-bold"
                            : "border-[#1d1c19]/20 bg-white text-[#1d1c19] hover:border-[#1d1c19]/50"
                        }`}
                      >
                        <span className="block truncate text-xs">{mat.name}</span>
                        <span className="block text-[10px] opacity-75">
                          +{mat.pointsPerKg} Poin/kg
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                  2. Berat Sampah (Gram):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(-250)}
                    className="size-11 bg-white border border-[#1d1c19]/30 text-lg font-bold cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="50"
                    min="50"
                    max="50000"
                    required
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="flex-1 h-11 bg-white border border-[#1d1c19]/30 text-center text-lg font-bold font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(250)}
                    className="size-11 bg-white border border-[#1d1c19]/30 text-lg font-bold cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-2 mt-2">
                  {[500, 1000, 2000, 5000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setWeightInput(String(quick))}
                      className="flex-1 py-1.5 border border-[#1d1c19]/20 bg-white text-[10px] hover:border-[#1d1c19] cursor-pointer font-bold active:scale-95 transition"
                    >
                      {quick >= 1000 ? `${quick / 1000}kg` : `${quick}g`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#1d1c19]/15 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#84827a]">Total Berat:</span>
                  <span className="font-bold text-[#1d1c19]">{weightKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#84827a]">Perolehan Poin:</span>
                  <span className="font-bold text-[#015186]">+{calcPoints} Poin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#84827a]">Konversi Kas:</span>
                  <span className="font-bold text-emerald-800">
                    Rp {calcRupiah.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#1d1c19]/10">
                  <span className="text-[#84827a]">Pencegahan Emisi:</span>
                  <span className="font-bold text-[#1d1c19]">-{calcCo2} kg CO₂</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer active:scale-95"
                >
                  {isSubmitting ? "Menyimpan Transaksi..." : "Validasi & Simpan Setoran →"}
                </button>
              </div>
            </form>
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
                  KONFIRMASI PENUKARAN
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
                <span className="text-[#84827a]">Biaya Poin:</span>
                <span className="font-bold text-[#1d1c19]">
                  {selectedVoucher.costPoints.toLocaleString("id-ID")} Poin
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#84827a]">Sisa Poin Anda:</span>
                <span className="font-bold text-emerald-800">
                  {(wallet.totalPoints - selectedVoucher.costPoints).toLocaleString("id-ID")} Poin
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1d1c19]/10">
                <span className="text-[#84827a]">Nomor Tujuan SMS:</span>
                <span className="font-bold text-[#1d1c19]">0812-3456-7890</span>
              </div>
            </div>

            <button
              onClick={confirmRedeem}
              className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer active:scale-95"
            >
              Konfirmasi Tukar Voucher &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
