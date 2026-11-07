"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import PearCanvas from "@/components/webgl/pear-canvas";
import { playSuccessChime } from "@/lib/audio-alert";
import {
  Camera,
  Scale,
  Sparkles,
  CheckCircle2,
  Scan,
  ArrowRight,
  UserCheck,
  RotateCcw,
} from "lucide-react";

interface WasteType {
  id: string;
  nama: string;
  category?: string;
  kategori?: string;
  pricePerKg?: number;
  hargaPerKg?: number;
  unit?: string;
  satuan?: string;
}

interface Citizen {
  id: string;
  name: string;
  nik?: string;
  phone?: string;
  email?: string;
  saldoRupiah?: number;
}

export default function PetugasPage() {
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCitizenId, setSelectedCitizenId] = useState("");
  const [selectedWasteTypeId, setSelectedWasteTypeId] = useState("");
  const [weight, setWeight] = useState<number>(1.0);
  const [notes, setNotes] = useState("");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: string;
    confidence: number;
    explanation: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initData() {
      try {
        const [wtRes, citRes] = await Promise.all([
          fetch("/api/waste-types"),
          fetch("/api/citizens"),
        ]);
        const wtData = await wtRes.json();
        const citData = await citRes.json();

        if (wtData.wasteTypes) setWasteTypes(wtData.wasteTypes);
        if (citData.citizens) {
          setCitizens(citData.citizens);
          if (citData.citizens.length > 0) {
            setSelectedCitizenId(citData.citizens[0].id);
          }
        }
        if (wtData.wasteTypes && wtData.wasteTypes.length > 0) {
          setSelectedWasteTypeId(wtData.wasteTypes[0].id);
        }
      } catch {
        // offline fallback
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const currentWaste = wasteTypes.find((w) => w.id === selectedWasteTypeId);
  const currentPrice = currentWaste?.pricePerKg ?? currentWaste?.hargaPerKg ?? 0;
  const estimatedRupiah = Math.round(weight * currentPrice);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImagePreview(b64);
      runAiClassification(b64);
    };
    reader.readAsDataURL(file);
  };

  const runAiClassification = async (base64Img: string) => {
    setAnalyzingImage(true);
    setAiSuggestion(null);

    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Img }),
      });
      const data = await res.json();
      if (data.classification) {
        setAiSuggestion(data.classification);

        const matched = wasteTypes.find(
          (wt) =>
            wt.nama.toLowerCase().includes(data.classification.category.toLowerCase()) ||
            data.classification.category.toLowerCase().includes((wt.category || wt.kategori || "").toLowerCase())
        );
        if (matched) {
          setSelectedWasteTypeId(matched.id);
        }
      }
    } catch {
      // ignore
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Quick preset test for Vision AI without webcam
  const handleQuickVisionSample = (categoryName: string, explanation: string, matchedKeyword: string) => {
    setAnalyzingImage(true);
    setImagePreview("/samples/sample-pet.png");
    setAiSuggestion(null);

    setTimeout(() => {
      setAnalyzingImage(false);
      setAiSuggestion({
        category: categoryName,
        confidence: 0.94,
        explanation,
      });

      const matched = wasteTypes.find(
        (wt) =>
          wt.nama.toLowerCase().includes(matchedKeyword.toLowerCase()) ||
          (wt.category || wt.kategori || "").toLowerCase().includes(matchedKeyword.toLowerCase())
      );
      if (matched) {
        setSelectedWasteTypeId(matched.id);
      }
      playSuccessChime();
    }, 400);
  };

  const handleAdjustWeight = (delta: number) => {
    setWeight((prev) => Math.max(0.1, Number((prev + delta).toFixed(1))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCitizenId || !selectedWasteTypeId || weight <= 0) {
      setErrorMessage("Data input belum lengkap atau berat timbangan nol.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCitizenId,
          wasteTypeId: selectedWasteTypeId,
          weightKg: Number(weight),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat transaksi.");

      playSuccessChime();
      setSuccessMessage(
        `Berhasil mencatat setoran. Saldo kas warga bertambah Rp${(data.deposit?.totalRupiah ?? estimatedRupiah).toLocaleString("id-ID")}`
      );

      setWeight(1.0);
      setImagePreview(null);
      setAiSuggestion(null);
      setNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f1ed] flex items-center justify-center p-8">
        <div className="font-gt-mono text-xs uppercase tracking-widest text-[#55534c] animate-pulse">
          MEMUAT DATABASE TIMBANGAN...
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
              <span>POS TIMBANGAN FISIK &bull; OPERATOR TPST BANJAR</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
              Verifikasi Timbangan &amp; AI Vision
            </h1>
          </div>

          <div className="flex items-center gap-3 font-gt-mono text-xs">
            <span className="text-[#84827a]">ROLE: PETUGAS</span>
            <Link
              href="/dashboard"
              className="border border-[#1d1c19] px-4 py-2 uppercase text-[11px] font-semibold tracking-wider hover:bg-[#1d1c19] hover:text-[#f2f1ed] transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              <span>Telemetri IoT</span>
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- KOLOM KIRI (5/12 KAMERA AI VISION) ----- */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 font-gt-mono text-xs">
                <div className="flex items-center gap-2">
                  <Scan className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Kamera Vision AI (Deteksi Polimer)
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Live HUD</span>
              </div>

              <div className="border border-dashed border-[#1d1c19]/30 p-6 bg-[#fbfbfa] text-center flex flex-col items-center justify-center min-h-[260px]">
                {imagePreview ? (
                  <div className="space-y-4 w-full">
                    <div className="relative h-56 w-full mx-auto border border-[#1d1c19]/20 bg-black">
                      <Image
                        src={imagePreview}
                        alt="Pratinjau Sampah"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setAiSuggestion(null);
                      }}
                      className="font-gt-mono text-xs text-red-700 underline uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1 mx-auto"
                    >
                      <RotateCcw className="size-3" />
                      <span>Ambil Ulang Foto</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 font-gt-mono">
                    <div className="size-12 mx-auto border border-[#1d1c19]/30 bg-white flex items-center justify-center text-[#1d1c19]">
                      <Camera className="size-5" />
                    </div>
                    <p className="text-xs text-[#55534c] max-w-xs mx-auto">
                      Arahkan lensa ke karung atau tumpukan material sampah untuk klasifikasi otomatis.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-[#1d1c19] px-5 py-2.5 bg-[#1d1c19] text-[#f2f1ed] text-xs uppercase tracking-wider font-semibold hover:bg-black transition cursor-pointer flex items-center gap-2 mx-auto active:scale-95 shadow-xs"
                    >
                      <Camera className="size-4" />
                      <span>Buka Kamera / Unggah</span>
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                />
              </div>

              {/* QUICK SIMULATOR BUTTONS */}
              <div className="font-gt-mono text-[10px] space-y-1.5 pt-2 border-t border-[#1d1c19]/10">
                <span className="text-[#84827a] uppercase font-bold block">
                  Uji Coba Deteksi AI Otomatis (1-Klik):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickVisionSample(
                        "Plastik Botol PET Bersih",
                        "Polimer terephthalate transparan teridentifikasi, tingkat kontaminasi rendah.",
                        "PET"
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#fbfbfa] border border-[#1d1c19]/20 hover:border-[#1d1c19] text-[#1d1c19] font-medium active:scale-95 cursor-pointer transition"
                  >
                    Botol PET
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickVisionSample(
                        "Sampah Organik Canang",
                        "Daun janur & sisa sesajen organik, cocok untuk pengolahan kompos LPD.",
                        "ORGANIK"
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#fbfbfa] border border-[#1d1c19]/20 hover:border-[#1d1c19] text-[#1d1c19] font-medium active:scale-95 cursor-pointer transition"
                  >
                    Canang Bali
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickVisionSample(
                        "Kardus & Kertas Dupleks",
                        "Serat selulosa kering terdeteksi dengan massa jenis standar karton gelombang.",
                        "KARDUS"
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#fbfbfa] border border-[#1d1c19]/20 hover:border-[#1d1c19] text-[#1d1c19] font-medium active:scale-95 cursor-pointer transition"
                  >
                    Kardus Box
                  </button>
                </div>
              </div>

              {analyzingImage && (
                <div className="p-3 border border-[#1d1c19]/20 bg-[#fbfbfa] text-center font-gt-mono text-xs text-[#55534c] animate-pulse flex items-center justify-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#1d1c19] animate-ping" />
                  <span>MODEL VISION SEDANG MENGIDENTIFIKASI MATERIAL...</span>
                </div>
              )}

              {aiSuggestion && (
                <div className="p-4 border border-[#1d1c19] bg-[#fbfbfa] font-gt-mono space-y-1.5 text-xs animate-fade-in shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-[#1d1c19] flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-[#015186]" />
                      <span>Prediksi: {aiSuggestion.category}</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-600/30 font-bold">
                      Akurasi: {Math.round(aiSuggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-[#55534c] leading-relaxed pt-1">
                    {aiSuggestion.explanation}
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* ----- KOLOM KANAN (7/12 FORMULIR TIMBANGAN & SALDO) ----- */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-5 font-gt-mono text-xs">
              <div className="border-b border-[#1d1c19]/10 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-[#015186]" />
                  <span className="uppercase tracking-widest font-bold text-[#1d1c19] text-xs">
                    Entri Buku Kas &amp; Timbangan
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Verifikasi Fisik</span>
              </div>

              {/* Nasabah */}
              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold flex items-center gap-1.5">
                  <UserCheck className="size-3.5 text-[#1d1c19]" />
                  <span>1. Pilih Nasabah Warga</span>
                </label>
                <select
                  value={selectedCitizenId}
                  onChange={(e) => setSelectedCitizenId(e.target.value)}
                  className="w-full h-11 border border-[#1d1c19]/30 bg-white px-3 font-mono text-sm focus:outline-hidden focus:border-[#1d1c19]"
                >
                  {citizens.map((c) => {
                    const identifier = c.nik || c.phone || c.email || c.id;
                    const saldo = (c.saldoRupiah ?? 0).toLocaleString("id-ID");
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} &bull; {identifier} (Saldo Kas: Rp{saldo})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Kategori Sampah */}
              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                  2. Kategori Material Sampah
                </label>
                <select
                  value={selectedWasteTypeId}
                  onChange={(e) => setSelectedWasteTypeId(e.target.value)}
                  className="w-full h-11 border border-[#1d1c19]/30 bg-white px-3 font-mono text-sm focus:outline-hidden focus:border-[#1d1c19]"
                >
                  {wasteTypes.map((w) => {
                    const price = (w.pricePerKg ?? w.hargaPerKg ?? 0).toLocaleString("id-ID");
                    const cat = w.category ?? w.kategori ?? "UMUM";
                    const u = w.unit ?? w.satuan ?? "kg";
                    return (
                      <option key={w.id} value={w.id}>
                        {w.nama} &bull; {cat} &bull; Rp{price}/{u}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Berat Timbangan & Estimasi Nilai Rupiah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                    Berat Timbangan (Kg)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full h-11 border border-[#1d1c19]/30 bg-white px-3 font-mono text-lg font-bold focus:outline-hidden focus:border-[#1d1c19]"
                    />
                  </div>
                  {/* Quick weight adjust chips */}
                  <div className="flex gap-1.5 mt-2">
                    {[
                      { label: "+0.5kg", val: 0.5 },
                      { label: "+1kg", val: 1.0 },
                      { label: "+5kg", val: 5.0 },
                      { label: "+10kg", val: 10.0 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleAdjustWeight(chip.val)}
                        className="flex-1 py-1 bg-white border border-[#1d1c19]/20 hover:border-[#1d1c19] text-[10px] font-bold cursor-pointer active:scale-95 transition"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                    Kredit Kas Warga (Otomatis)
                  </label>
                  <div className="w-full h-11 border border-[#1d1c19]/20 bg-[#fbfbfa] px-3 flex items-center font-mono text-lg font-bold text-emerald-800">
                    Rp{estimatedRupiah.toLocaleString("id-ID")}
                  </div>
                  <span className="text-[10px] text-[#84827a] block mt-2">
                    Tarif aktif: Rp{currentPrice.toLocaleString("id-ID")}/kg
                  </span>
                </div>
              </div>

              {/* Catatan Transaksi */}
              <div>
                <label className="block text-[#55534c] uppercase text-[10px] mb-2 font-bold">
                  Label Karung // Catatan Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Karung B2 - Botol Minyak Bersih"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 border border-[#1d1c19]/30 bg-white px-3 text-xs focus:outline-hidden focus:border-[#1d1c19]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 border border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] uppercase text-xs tracking-widest font-bold hover:bg-black transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                  <Scale className="size-4" />
                  <span>
                    {submitting ? "Memproses Data..." : "Validasi & Simpan Transaksi Setoran"}
                  </span>
                </button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
