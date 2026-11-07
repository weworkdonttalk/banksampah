"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BanjarReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, []);

  const handleFetchAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/daily-analysis");
      const data = await res.json();
      setAiAnalysis(data.insight || "Analisis tidak tersedia.");
    } catch {
      setAiAnalysis("Gagal memuat analisis AI.");
    } finally {
      setLoadingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="font-gt-mono text-xs uppercase tracking-widest text-[#55534c] animate-pulse">
          MEMUAT LAPORAN BULANAN BANJAR...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24 font-sans bg-[#f2f1ed]">
      {/* Header */}
      <header className="border-b border-[#1d1c19]/15 px-4 py-4 bg-white sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase block">
              ADMINISTRASI BANJAR
            </span>
            <h1 className="text-base font-bold text-[#1d1c19]">Laporan & Agregasi Sampah</h1>
          </div>
          <a
            href="/api/reports?format=csv"
            download
            className="px-3 py-1.5 bg-[#1d1c19] text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-black transition"
          >
            Export CSV ↓
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* KPI COUNTER CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-white border border-[#1d1c19]/15">
            <span className="text-[10px] font-gt-mono text-[#84827a] uppercase block">
              TOTAL TONASE TERPILAH
            </span>
            <span className="text-2xl font-bold font-mono text-[#1d1c19]">
              {report?.totalKg || 0} kg
            </span>
          </div>

          <div className="p-4 bg-white border border-[#1d1c19]/15">
            <span className="text-[10px] font-gt-mono text-[#84827a] uppercase block">
              NILAI EKONOMI KAS WARGA
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-800">
              Rp{(report?.totalRupiah || 0).toLocaleString("id-ID")}
            </span>
          </div>

          <div className="p-4 bg-white border border-[#1d1c19]/15">
            <span className="text-[10px] font-gt-mono text-[#84827a] uppercase block">
              TOTAL TRANSAKSI SETORAN
            </span>
            <span className="text-2xl font-bold font-mono text-[#1d1c19]">
              {report?.totalTransactions || 0} Kali
            </span>
          </div>
        </div>

        {/* AI DAILY ANALYSIS SECTION */}
        <section className="bg-white border-2 border-[#1d1c19] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1d1c19]/10 pb-3">
            <div>
              <span className="font-gt-mono text-[10px] text-[#015186] font-bold uppercase tracking-widest block">
                INTELLIGENT INSIGHTS // LLM SUMMARY
              </span>
              <h2 className="text-base font-bold text-[#1d1c19]">
                Analisis Hari Ini (Sensor 24 Jam & Prediksi)
              </h2>
            </div>

            <button
              onClick={handleFetchAiAnalysis}
              disabled={loadingAi}
              className="px-3 py-1.5 border border-[#1d1c19] text-xs font-gt-mono uppercase font-bold hover:bg-[#1d1c19] hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              {loadingAi ? "Menganalisis..." : "✨ Generate Ringkasan AI"}
            </button>
          </div>

          {aiAnalysis ? (
            <div className="p-4 bg-[#fbfbfa] border text-xs leading-relaxed font-sans text-[#1d1c19] whitespace-pre-line">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-xs text-[#55534c]">
              Tekan tombol di atas untuk merangkum seluruh data suhu, asap, anomali kebakaran 24 jam dan pola setoran sampah banjar menggunakan model AI.
            </p>
          )}
        </section>

        {/* BREAKDOWN PER WASTE TYPE */}
        <section className="bg-white border border-[#1d1c19]/15 p-5 space-y-4">
          <span className="font-gt-mono text-xs font-bold uppercase tracking-wider text-[#1d1c19] block">
            Rincian Volume per Kategori Sampah
          </span>

          <div className="space-y-3">
            {report?.breakdown?.map((b: any, idx: number) => {
              const percentage = report.totalKg > 0 ? (b.kg / report.totalKg) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#1d1c19]">{b.nama}</span>
                    <span className="font-mono text-[#55534c]">
                      {b.kg.toFixed(1)} kg ({percentage.toFixed(0)}%) &middot; Rp{b.rupiah.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-[#1d1c19] transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RECENT SETORAN TABLE */}
        <section className="bg-white border border-[#1d1c19]/15 p-5 space-y-3">
          <span className="font-gt-mono text-xs font-bold uppercase tracking-wider text-[#1d1c19] block">
            20 Setoran Terakhir
          </span>

          <div className="divide-y divide-[#1d1c19]/10 text-xs">
            {report?.recentDeposits?.map((d: any) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#1d1c19] block">
                    {d.wasteType?.nama || "Sampah Terpilah"}
                  </span>
                  <span className="text-[10px] text-[#84827a] font-mono">
                    {new Date(d.createdAt).toLocaleString("id-ID")} &middot; ID Warga: {d.citizenId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold">{d.weightKg} kg</span>
                  <span className="text-[11px] font-mono text-emerald-800 block">
                    Rp{d.totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
