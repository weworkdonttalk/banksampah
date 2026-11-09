"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import PearCanvas from "@/components/webgl/pear-canvas";
import { playSuccessChime, playSirenSound } from "@/lib/audio-alert";
import {
  Scale,
  CheckCircle2,
  Scan,
  ArrowRight,
  RotateCcw,
  Radio,
  SlidersHorizontal,
  Check,
  XCircle,
  AlertTriangle,
  Flame,
} from "lucide-react";

interface ReviewSessionItem {
  id: string;
  sessionCode: string;
  userCategory: string | null;
  aiCategory: string | null;
  aiConfidence: number | null;
  aiReason: string | null;
  aiTips: string | null;
  imageUrl: string | null;
  createdAt: string;
  citizen?: {
    id: string;
    name: string;
    phone?: string;
  };
  station?: {
    id: string;
    deviceId: string;
    name: string;
  };
}

interface StationMonitor {
  id: string;
  deviceId: string;
  name: string;
  temp: number;
  smoke: number;
  fillLevel: number;
  isDanger: boolean;
  isBinFull: boolean;
}

interface PendingWithdrawalItem {
  id: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export default function PetugasPage() {
  const [reviews, setReviews] = useState<ReviewSessionItem[]>([]);
  const [stations, setStations] = useState<StationMonitor[]>([
    { id: "st_001", deviceId: "ST-001", name: "Stasiun TPST Kayumas", temp: 32.4, smoke: 135, fillLevel: 42.0, isDanger: false, isBinFull: false },
    { id: "st_002", deviceId: "ST-002", name: "Stasiun TPS Seminyak", temp: 34.1, smoke: 160, fillLevel: 84.5, isDanger: false, isBinFull: true },
  ]);
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load reviews, stations & withdrawals
  const loadDashboardData = async () => {
    try {
      const [revRes, wdRes, stRes] = await Promise.all([
        fetch("/api/sessions/reviews"),
        fetch("/api/withdrawals"),
        fetch("/api/stations"),
      ]);

      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData.reviews) {
          setReviews(revData.reviews);
          if (revData.reviews.length > 0 && !selectedReviewId) {
            setSelectedReviewId(revData.reviews[0].id);
          }
        }
      }

      if (wdRes.ok) {
        const wdData = await wdRes.json();
        if (wdData.withdrawals) setWithdrawals(wdData.withdrawals);
      }

      if (stRes.ok) {
        const stData = await stRes.json();
        if (stData.stations) {
          const mapped = stData.stations.map((s: any) => {
            const reading = s.readings?.[0] || {};
            const fill = typeof s.currentFillLevel === "number" ? s.currentFillLevel : (reading.fillLevel ?? 42.0);
            return {
              id: s.id,
              deviceId: s.deviceId,
              name: s.name,
              temp: reading.temp ?? 32.0,
              smoke: reading.smoke ?? 120,
              fillLevel: fill,
              isDanger: (reading.temp ?? 0) >= 60 || (reading.smoke ?? 0) >= 600,
              isBinFull: fill >= 80.0,
            };
          });
          setStations(mapped);
        }
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0];

  // Submit Keputusan Tinjauan Petugas
  const handleReviewDecision = async (
    decision: "APPROVE_AS_IS" | "CORRECT_CATEGORY" | "REJECT",
    finalCategory?: "ORGANIK" | "ANORGANIK"
  ) => {
    if (!activeReview) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/sessions/reviews/${activeReview.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          finalCategory,
          notes: reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses tinjauan");

      playSuccessChime();
      setSuccessMessage(
        decision === "REJECT"
          ? `Sesi ${activeReview.sessionCode} ditolak.`
          : decision === "CORRECT_CATEGORY"
          ? `Sesi ${activeReview.sessionCode} dikoreksi ke ${finalCategory}. Saldo berhasil dicairkan!`
          : `Sesi ${activeReview.sessionCode} disetujui sesuai klaim warga. Saldo berhasil dicairkan!`
      );

      setReviewNotes("");
      loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMessage(msg);
      playSirenSound();
    } finally {
      setIsProcessing(false);
    }
  };

  // Setujui Penarikan Saldo
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch(`/api/withdrawals/${withdrawalId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyetujui penarikan");

      playSuccessChime();
      setSuccessMessage("Penarikan saldo warga disetujui & tercatat di ledger.");
      loadDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f1ed] flex items-center justify-center p-8">
        <div className="font-gt-mono text-xs uppercase tracking-widest text-[#55534c] animate-pulse">
          MEMUAT PORTAL OPERATOR &amp; TINJAUAN PETUGAS...
        </div>
      </div>
    );
  }

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

      {/* ----- MAIN WORKSPACE (SEIMBANG & SYMMETRICAL) ----- */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <header className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-gt-mono text-[11px] text-[#015186] font-semibold uppercase tracking-wider mb-1">
              <span className="size-2 rounded-full bg-[#1d1c19]" />
              <span>PORTAL OPERATOR &bull; ANTREAN TINJAUAN AI &amp; STASIUN IOT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
              Pusat Verifikasi Fisik &amp; Kontrol Stasiun
            </h1>
          </div>

          <div className="flex items-center gap-3 font-gt-mono text-xs">
            <span className="text-[#84827a]">ROLE: PETUGAS</span>
            <Link
              href="/dashboard"
              className="border border-[#1d1c19] px-4 py-2 uppercase text-[11px] font-semibold tracking-wider hover:bg-[#1d1c19] hover:text-[#f2f1ed] transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              <span>Telemetri Sensor</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </header>

        {successMessage && (
          <aside className="p-4 bg-emerald-50 border border-emerald-600 text-emerald-950 font-gt-mono text-xs flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </aside>
        )}

        {errorMessage && (
          <aside className="p-4 bg-red-50 border border-red-600 text-red-950 font-gt-mono text-xs shadow-xs animate-fade-in">
            {errorMessage}
          </aside>
        )}

        {/* 12-COLUMN WORKBENCH GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- KOLOM KIRI (6/12 ANTREAN PERLU TINJAUAN PETUGAS) ----- */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Scan className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Antrean Sesi &quot;Perlu Tinjauan Petugas&quot; ({reviews.length})
                  </span>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="text-[10px] text-[#84827a] hover:text-[#1d1c19] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Refresh
                </button>
              </div>

              {/* LIST SESI MENUNGGU TINJAUAN */}
              {reviews.length === 0 ? (
                <div className="py-12 text-center font-gt-mono text-xs text-[#84827a] space-y-2">
                  <CheckCircle2 className="size-8 mx-auto text-emerald-600" />
                  <p>Tidak ada antrean setoran yang memerlukan tinjauan fisik saat ini.</p>
                  <span className="text-[10px] block opacity-75">Semua setoran otomatis terverifikasi oleh AI Vision.</span>
                </div>
              ) : (
                <div className="space-y-4 font-gt-mono text-xs">
                  {/* TABS SELECTOR */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {reviews.map((r) => {
                      const isSelected = (activeReview?.id === r.id);
                      const hasFireRisk = Boolean(
                        r.aiReason?.toLowerCase().includes("api") ||
                        r.aiReason?.toLowerCase().includes("baterai") ||
                        r.aiReason?.toLowerCase().includes("aerosol") ||
                        r.aiReason?.toLowerCase().includes("korek")
                      );
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedReviewId(r.id)}
                          className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? hasFireRisk
                                ? "border-rose-600 bg-rose-700 text-white shadow-xs"
                                : "border-[#1d1c19] bg-[#1d1c19] text-white shadow-xs"
                              : hasFireRisk
                              ? "border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-600"
                              : "border-[#1d1c19]/20 bg-white text-[#55534c] hover:border-[#1d1c19]"
                          }`}
                        >
                          {hasFireRisk && <Flame className="size-3.5 text-rose-500" aria-label="Risiko api" />}
                          <span>{r.sessionCode}</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeReview && (
                    <div className="space-y-4 pt-2">
                      {/* BUKTI FOTO DARI HP WARGA */}
                      <div className="relative h-60 w-full border border-[#1d1c19]/20 bg-black flex items-center justify-center overflow-hidden">
                        {activeReview.imageUrl ? (
                          <Image
                            src={activeReview.imageUrl}
                            alt="Foto Sampah Warga"
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        ) : (
                          <div className="text-white/60 text-xs text-center p-4">
                            Foto tidak tersedia
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white p-2 text-[10px] flex justify-between">
                          <span>Warga: {activeReview.citizen?.name || "Warga"}</span>
                          <span>Stasiun: {activeReview.station?.deviceId || "ST-001"}</span>
                        </div>
                      </div>

                      {/* DATA KLAIM WARGA VS HASIL AI */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#fbfbfa] border border-[#1d1c19]/15">
                          <span className="text-[10px] text-[#84827a] uppercase block">Klaim Pilihan Warga:</span>
                          <span className="text-sm font-bold text-[#1d1c19] block mt-0.5">
                            {activeReview.userCategory || "Tidak Ada"}
                          </span>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-600/30">
                          <span className="text-[10px] text-amber-900 uppercase block">Prediksi AI (Ragu / Buram):</span>
                          <span className="text-sm font-bold text-amber-950 block mt-0.5">
                            {activeReview.aiCategory?.toUpperCase() || "TIDAK JELAS"}{" "}
                            <span className="text-[10px] font-normal">
                              ({Math.round((activeReview.aiConfidence || 0) * 100)}%)
                            </span>
                          </span>
                        </div>
                      </div>

                      {activeReview.aiReason && (
                        <div
                          className={`p-3 border text-[11px] leading-relaxed ${
                            activeReview.aiReason.toLowerCase().includes("api") ||
                            activeReview.aiReason.toLowerCase().includes("baterai") ||
                            activeReview.aiReason.toLowerCase().includes("aerosol") ||
                            activeReview.aiReason.toLowerCase().includes("korek")
                              ? "bg-rose-50 border-rose-600/40 text-rose-950"
                              : "bg-white border-[#1d1c19]/15 text-[#55534c]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            {activeReview.aiReason.toLowerCase().includes("api") ||
                            activeReview.aiReason.toLowerCase().includes("baterai") ? (
                              <span className="text-[10px] text-rose-700 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle className="size-3.5 text-rose-600 inline" /> PERINGATAN BAHAYA: RISIKO API TERDETEKSI
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#84827a] uppercase">
                                Alasan Sistem Meminta Tinjauan Petugas:
                              </span>
                            )}
                          </div>
                          <p>{activeReview.aiReason}</p>
                          {activeReview.aiTips && (
                            <p className="mt-1.5 text-[10px] opacity-90 border-t border-rose-200/60 pt-1.5">
                              <strong>Tindakan Edukasi:</strong> {activeReview.aiTips}
                            </p>
                          )}
                        </div>
                      )}

                      {/* CATATAN TINJAUAN PETUGAS */}
                      <div>
                        <label className="block text-[#55534c] uppercase text-[10px] mb-1 font-bold">
                          Catatan Petugas (Opsional):
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Sampah dikonfirmasi botol plastik setelah pengecekan fisik"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full h-10 border border-[#1d1c19]/30 bg-white px-3 text-xs focus:outline-hidden focus:border-[#1d1c19]"
                        />
                      </div>

                      {/* TOMBOL KEPUTUSAN PETUGAS */}
                      <div className="pt-2 space-y-2">
                        <span className="text-[10px] text-[#84827a] uppercase font-bold block">
                          Tentukan Keputusan Verifikasi Fisik:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewDecision("APPROVE_AS_IS")}
                            disabled={isProcessing}
                            className="py-3 px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase text-[11px] tracking-wider transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-xs"
                          >
                            <Check className="size-3.5" />
                            <span>Setujui Klaim</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleReviewDecision(
                                "CORRECT_CATEGORY",
                                activeReview.userCategory === "ORGANIK" ? "ANORGANIK" : "ORGANIK"
                              )
                            }
                            disabled={isProcessing}
                            className="py-3 px-2 bg-[#015186] hover:bg-[#003d66] text-white font-bold uppercase text-[11px] tracking-wider transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-xs"
                          >
                            <SlidersHorizontal className="size-3.5" />
                            <span>Koreksi ({activeReview.userCategory === "ORGANIK" ? "Anorganik" : "Organik"})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviewDecision("REJECT")}
                            disabled={isProcessing}
                            className="py-3 px-2 bg-[#b91c1c] hover:bg-red-800 text-white font-bold uppercase text-[11px] tracking-wider transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-xs"
                          >
                            <XCircle className="size-3.5" />
                            <span>Tolak Sesi</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ----- KOLOM KANAN (6/12 MONITORING TONG IOT & PENARIKAN SALDO) ----- */}
          <div className="lg:col-span-6 space-y-6">
            {/* PANEL 1: STATUS KAPASITAS TONG & SENSOR IOT */}
            <section className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-emerald-600 animate-pulse" />
                  <span className="uppercase tracking-widest font-bold text-[#1d1c19]">
                    Kapasitas Tong &amp; Telemetri IoT Stasiun ({stations.length})
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Ambang Penuh: 80%</span>
              </div>

              <div className="space-y-3">
                {stations.map((st) => (
                  <div
                    key={st.id}
                    className={`p-4 border transition ${
                      st.isBinFull
                        ? "border-[#b91c1c] bg-red-50/70"
                        : "border-[#1d1c19]/15 bg-[#fbfbfa]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-sm text-[#1d1c19] block">{st.name}</span>
                        <span className="text-[10px] text-[#84827a]">Device ID: {st.deviceId}</span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 border font-bold uppercase ${
                          st.isBinFull
                            ? "border-[#b91c1c] bg-[#b91c1c] text-white animate-pulse"
                            : "border-emerald-600/30 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {st.isBinFull ? "TONG HAMPIR PENUH" : "KAPASITAS AMAN"}
                      </span>
                    </div>

                    {/* PROGRESS BAR ISI TONG */}
                    <div className="space-y-1 my-2">
                      <div className="flex justify-between text-[11px]">
                        <span>Tinggi Isi Wadah:</span>
                        <span className="font-bold">{st.fillLevel.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#1d1c19]/10">
                        <div
                          style={{ width: `${Math.min(100, st.fillLevel)}%` }}
                          className={`h-full transition-all duration-500 ${
                            st.fillLevel >= 80 ? "bg-[#b91c1c]" : "bg-emerald-700"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-[#84827a] pt-2 border-t border-[#1d1c19]/10">
                      <span>Suhu: <strong>{st.temp.toFixed(1)}°C</strong></span>
                      <span>Gas/Asap: <strong>{st.smoke} PPM</strong></span>
                      <span className="text-[#015186] font-bold">Ultrasonic Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* PANEL 2: PERSETUJUAN PENARIKAN SALDO WARGA */}
            <section className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-[#015186]" />
                  <span className="uppercase tracking-widest font-bold text-[#1d1c19]">
                    Antrean Persetujuan Penarikan Saldo ({withdrawals.length})
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Atomic Ledger</span>
              </div>

              {withdrawals.length === 0 ? (
                <div className="py-8 text-center text-[#84827a]">
                  Tidak ada permohonan penarikan saldo pending.
                </div>
              ) : (
                <div className="divide-y divide-[#1d1c19]/10">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-[#1d1c19] text-sm block">
                          Rp {w.amount.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-[#84827a] block">
                          Warga: {w.user?.name || "Warga"} &bull; {w.notes || "Pencairan"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApproveWithdrawal(w.id)}
                        className="py-1.5 px-3 bg-[#1d1c19] text-white hover:bg-black uppercase text-[10px] font-bold tracking-wider cursor-pointer active:scale-95 transition"
                      >
                        Setujui Pencairan &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
