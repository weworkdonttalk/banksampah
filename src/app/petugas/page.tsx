"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image-compress";

export default function PetugasInputPage() {
  const router = useRouter();
  const [citizens, setCitizens] = useState<any[]>([]);
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [selectedCitizenId, setSelectedCitizenId] = useState("");
  const [selectedWasteTypeId, setSelectedWasteTypeId] = useState("");
  const [weightKg, setWeightKg] = useState<number | string>(1.0);
  const [notes, setNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiPredicting, setAiPredicting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) router.push("/login");
      });

    fetch("/api/citizens")
      .then((r) => r.json())
      .then((d) => {
        setCitizens(d.citizens || []);
        if (d.citizens?.length > 0) setSelectedCitizenId(d.citizens[0].id);
      });

    fetch("/api/waste-types")
      .then((r) => r.json())
      .then((d) => {
        setWasteTypes(d.wasteTypes || []);
        if (d.wasteTypes?.length > 0) setSelectedWasteTypeId(d.wasteTypes[0].id);
      });
  }, [router]);

  const selectedWasteType = wasteTypes.find((w) => w.id === selectedWasteTypeId);
  const currentPrice = selectedWasteType?.pricePerKg || 0;
  const numWeight = typeof weightKg === "number" ? weightKg : parseFloat(weightKg) || 0;
  const calculatedTotal = Math.round(numWeight * currentPrice);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed.dataUrl);

      // Trigger server-side AI Vision classification
      setAiPredicting(true);
      setAiSuggestion(null);
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressed.dataUrl }),
      });
      const data = await res.json();
      if (data.classification) {
        setAiSuggestion(data.classification);
        // Find matching waste type
        const match = wasteTypes.find(
          (w) =>
            w.nama.toLowerCase().includes(data.classification.jenis.toLowerCase()) ||
            w.category.toLowerCase().includes(data.classification.category?.toLowerCase() || "")
        );
        if (match) setSelectedWasteTypeId(match.id);
      }
    } catch (err: any) {
      console.error("AI classify error:", err);
    } finally {
      setAiPredicting(false);
    }
  };

  const handleAdjustWeight = (delta: number) => {
    const nextVal = Math.max(0.1, Number((numWeight + delta).toFixed(1)));
    setWeightKg(nextVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCitizenId || !selectedWasteTypeId || numWeight <= 0) {
      setErrorMessage("Data setoran belum lengkap.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenId: selectedCitizenId,
          wasteTypeId: selectedWasteTypeId,
          weightKg: numWeight,
          imageUrl: imagePreview,
          aiPredicted: Boolean(aiSuggestion),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat setoran");

      setSuccessMessage(
        `Berhasil! Saldo Rp${data.deposit.totalAmount.toLocaleString("id-ID")} dikreditkan ke buku besar warga.`
      );
      setWeightKg(1.0);
      setImagePreview(null);
      setAiSuggestion(null);
      setNotes("");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-24 font-sans bg-[#f2f1ed]">
      {/* Top Bar */}
      <header className="border-b border-[#1d1c19]/15 px-4 py-3 bg-white sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <span className="font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase block">
              POS PETUGAS LAPANGAN
            </span>
            <h1 className="text-base font-bold text-[#1d1c19]">Timbangan Setoran Sampah</h1>
          </div>
          <span className="text-[10px] font-gt-mono bg-[#1d1c19] text-white px-2 py-0.5">
            VERIFIKATOR
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {successMessage && (
          <div className="p-3 bg-emerald-100 border border-emerald-600 text-emerald-950 text-xs font-mono">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-100 border border-red-600 text-red-950 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* CAMERA / SCAN PHOTO AI */}
          <div className="border border-[#1d1c19]/20 p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-gt-mono uppercase font-bold text-[10px] text-[#55534c]">
                FOTO OBJEK SAMPAH (AI DETEKSI)
              </span>
              <span className="text-[9px] font-mono text-[#015186] font-bold">
                VISION MODEL
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#1d1c19]/30 p-4 bg-[#fbfbfa] text-center relative overflow-hidden">
              {imagePreview ? (
                <div className="space-y-2 w-full">
                  <img
                    src={imagePreview}
                    alt="Preview Sampah"
                    className="max-h-48 w-full object-contain mx-auto border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setAiSuggestion(null);
                    }}
                    className="text-[10px] text-red-600 underline font-mono cursor-pointer"
                  >
                    Hapus / Ambil Ulang Foto
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full py-4">
                  <svg className="size-8 text-[#55534c] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="font-bold text-xs text-[#1d1c19]">Buka Kamera Belakang</span>
                  <span className="text-[10px] text-[#84827a] mt-0.5">
                    Otomatis kompresi client-side (maks 1280px)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {aiPredicting && (
              <div className="p-2 bg-sky-50 border border-sky-300 text-sky-900 text-[11px] font-mono animate-pulse">
                🔍 AI sedang menganalisis material & estimasi jenis sampah...
              </div>
            )}

            {aiSuggestion && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-500 text-emerald-950 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Klasifikasi AI: {aiSuggestion.jenis}</span>
                  <span className="text-[10px] bg-emerald-200 px-1.5 py-0.2">
                    Confidence: {aiSuggestion.confidence}%
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800">{aiSuggestion.saran_pemilahan}</p>
                <div className="text-[9px] text-emerald-700 italic">
                  *Form otomatis terisi. Petugas tetap berhak mengoreksi manual di bawah.
                </div>
              </div>
            )}
          </div>

          {/* CITIZEN & WASTE TYPE SELECT */}
          <div className="border border-[#1d1c19]/20 p-4 bg-white space-y-3">
            <div>
              <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                PILIH WARGA / NASABAH BANJAR
              </label>
              <select
                value={selectedCitizenId}
                onChange={(e) => setSelectedCitizenId(e.target.value)}
                className="w-full h-11 px-3 border border-[#1d1c19]/30 bg-transparent text-sm font-medium"
              >
                {citizens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                JENIS SAMPAH & HARGA SATUAN
              </label>
              <select
                value={selectedWasteTypeId}
                onChange={(e) => setSelectedWasteTypeId(e.target.value)}
                className="w-full h-11 px-3 border border-[#1d1c19]/30 bg-transparent text-sm font-medium"
              >
                {wasteTypes.map((w) => (
                  <option key={w.id} value={w.id}>
                    [{w.kode}] {w.nama} &middot; Rp{w.pricePerKg.toLocaleString("id-ID")}/{w.unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* WEIGHT STEPPER (THUMB-FRIENDLY) */}
          <div className="border border-[#1d1c19]/20 p-4 bg-white space-y-2">
            <span className="block uppercase text-[10px] font-gt-mono text-[#55534c]">
              BERAT TIMBANGAN (KG)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustWeight(-1)}
                className="size-12 border-2 border-[#1d1c19] text-xl font-bold bg-[#f2f1ed] active:bg-zinc-300 transition flex items-center justify-center cursor-pointer"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => handleAdjustWeight(-0.1)}
                className="size-12 border-2 border-[#1d1c19] text-sm font-bold bg-[#f2f1ed] active:bg-zinc-300 transition flex items-center justify-center cursor-pointer"
              >
                -0.1
              </button>

              <div className="flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full h-12 text-center text-2xl font-bold font-mono border-2 border-[#1d1c19] bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAdjustWeight(0.1)}
                className="size-12 border-2 border-[#1d1c19] text-sm font-bold bg-[#f2f1ed] active:bg-zinc-300 transition flex items-center justify-center cursor-pointer"
              >
                +0.1
              </button>
              <button
                type="button"
                onClick={() => handleAdjustWeight(1)}
                className="size-12 border-2 border-[#1d1c19] text-xl font-bold bg-[#f2f1ed] active:bg-zinc-300 transition flex items-center justify-center cursor-pointer"
              >
                +1
              </button>
            </div>

            {/* TOTAL CALCULATION DISPLAY */}
            <div className="mt-3 p-3 bg-[#1d1c19] text-[#f2f1ed] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-gt-mono text-[#84827a] block uppercase">
                  TOTAL SALDO DIBERIKAN
                </span>
                <span className="text-xl font-bold font-mono">
                  Rp{calculatedTotal.toLocaleString("id-ID")}
                </span>
              </div>
              <span className="text-[10px] font-gt-mono text-emerald-400">
                {numWeight} kg × Rp{currentPrice.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div>
            <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kondisi kering dan bersih disortir"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 border border-[#1d1c19]/30 bg-white"
            />
          </div>

          {/* STICKY SUBMIT BUTTON */}
          <div className="pt-2 sticky bottom-20 z-30">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[52px] bg-[#1d1c19] text-[#f2f1ed] text-sm font-bold uppercase tracking-wider hover:bg-black active:scale-[0.99] transition shadow-xl cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Menyimpan ke Buku Besar..." : "Simpan Setoran Warga ✓"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
