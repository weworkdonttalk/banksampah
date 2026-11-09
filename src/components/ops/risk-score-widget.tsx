"use client";

import { RiskLevel } from "@/lib/mock-telemetry";

interface RiskScoreWidgetProps {
  score: number;
  level: RiskLevel;
  temperature: number;
  gasPpm: number;
  isWaitingSensor?: boolean;
  explanation?: {
    ringkasan_analisis?: string;
    potensi_penyebab?: string[];
    tindakan_petugas?: string[];
    urgensi?: string;
  } | null;
}

export default function RiskScoreWidget({
  score,
  level,
  temperature,
  gasPpm,
  isWaitingSensor = true,
  explanation,
}: RiskScoreWidgetProps) {
  const isHazard = !isWaitingSensor && level === "HAZARD";
  const isWarning = !isWaitingSensor && level === "WARNING";

  // Radius for circular gauge
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isWaitingSensor
    ? circumference
    : circumference - (circumference * Math.min(100, Math.max(0, score))) / 100;

  return (
    <div
      className={`border transition-all duration-300 backdrop-blur-sm p-5 sm:p-7 ${
        isWaitingSensor
          ? "border-[#1d1c19]/15 bg-[#f2f1ed]/90 shadow-sm"
          : isHazard
          ? "border-[#b91c1c] bg-red-50/80 shadow-md ring-1 ring-[#b91c1c]/30"
          : isWarning
          ? "border-amber-600/40 bg-amber-50/60 shadow-sm"
          : "border-[#1d1c19]/15 bg-[#f2f1ed]/90 shadow-sm"
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d1c19]/10 pb-4 mb-5">
        <div>
          <span className="text-[11px] font-gt-mono uppercase tracking-wider text-[#015186] font-semibold block">
            Analisis Kecerdasan Buatan (AI)
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1d1c19] mt-0.5">
            Tingkat Risiko Kebakaran Sampah
          </h2>
        </div>

        <div className="flex items-center">
          <span
            className={`px-3 py-1.5 text-xs font-semibold uppercase border transition-colors ${
              isWaitingSensor
                ? "border-amber-600/30 bg-amber-50 text-amber-900"
                : isHazard
                ? "border-[#b91c1c] bg-[#b91c1c] text-white animate-pulse"
                : isWarning
                ? "border-amber-600 bg-amber-100 text-amber-950"
                : "border-[#015186]/30 bg-[#015186]/10 text-[#015186]"
            }`}
          >
            {isWaitingSensor
              ? "⚡ Status: Menunggu Alat Terhubung"
              : isHazard
              ? "⚠ Bahaya: Suhu & Gas Sangat Tinggi"
              : isWarning
              ? "⚡ Waspada: Terdeteksi Kenaikan Gas"
              : "✓ Status: Normal & Aman"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Visual Arc Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-5 border border-[#1d1c19]/10 bg-[#e7e5df]/40 relative">
          <div className="relative size-32 sm:size-36 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-[#1d1c19]/10"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className={`transition-all duration-700 ease-out ${
                  isHazard
                    ? "stroke-[#b91c1c]"
                    : isWarning
                    ? "stroke-amber-600"
                    : "stroke-[#015186]"
                }`}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center font-gt-mono">
              <span
                className={`text-4xl font-bold tracking-tight ${
                  isWaitingSensor
                    ? "text-[#84827a]"
                    : isHazard
                    ? "text-[#b91c1c]"
                    : isWarning
                    ? "text-amber-800"
                    : "text-[#1d1c19]"
                }`}
              >
                {isWaitingSensor ? "--" : score}
              </span>
              <span className="text-[10px] text-[#55534c] uppercase font-semibold">
                Skor / 100
              </span>
            </div>
          </div>

          <span className="text-[11px] font-gt-mono text-[#55534c] text-center mt-3">
            {isWaitingSensor
              ? "Mikrokontroler belum aktif"
              : isHazard
              ? "Peluang titik api: Sangat Tinggi"
              : "Kondisi kompartemen: Stabil"}
          </span>
        </div>

        {/* Narrative & Metrics */}
        <div className="md:col-span-7 space-y-4">
          <p className="text-xs sm:text-sm text-[#33322d] leading-relaxed">
            {isWaitingSensor
              ? "Sistem siap menerima data. Nyalakan perangkat IoT (ESP32-S3) pada wadah sampah agar suhu dan kadar gas metana terpantau secara langsung."
              : explanation?.ringkasan_analisis
              ? explanation.ringkasan_analisis
              : isHazard
              ? "PERINGATAN DARURAT: Suhu wadah melebihi 45°C bersamaan dengan gas metana di atas 400 PPM. Katup pengaman otomatis ditutup rapat untuk menghentikan pasokan oksigen ke dalam wadah."
              : isWarning
              ? "PERHATIAN: Ada sedikit lonjakan gas di atas batas wajar. Sistem meningkatkan kecepatan pemantauan data."
              : "Semua sensor berada dalam batas aman. Tidak ada indikasi panas berlebih maupun kebocoran gas berbahaya."}
          </p>

          {!isWaitingSensor && explanation?.tindakan_petugas && explanation.tindakan_petugas.length > 0 && (
            <div className="p-2.5 bg-white/80 border border-[#1d1c19]/10 text-[11px] font-gt-mono space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#015186] block">
                Rekomendasi Tindakan Petugas:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-[#55534c]">
                {explanation.tindakan_petugas.slice(0, 3).map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1d1c19]/10 font-gt-mono text-xs">
            <div className="border border-[#1d1c19]/10 bg-white/70 p-3">
              <span className="text-[#84827a] text-[10px] block uppercase font-semibold">
                Suhu Wadah
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-xl font-bold ${
                    isWaitingSensor
                      ? "text-[#84827a]"
                      : temperature > 45
                      ? "text-[#b91c1c]"
                      : "text-[#1d1c19]"
                  }`}
                >
                  {isWaitingSensor ? "--" : `${temperature}°C`}
                </span>
                <span className="text-[10px] text-[#84827a]">(Batas: 45°C)</span>
              </div>
            </div>

            <div className="border border-[#1d1c19]/10 bg-white/70 p-3">
              <span className="text-[#84827a] text-[10px] block uppercase font-semibold">
                Gas Metana
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-xl font-bold ${
                    isWaitingSensor
                      ? "text-[#84827a]"
                      : gasPpm > 400
                      ? "text-[#b91c1c]"
                      : "text-[#1d1c19]"
                  }`}
                >
                  {isWaitingSensor ? "--" : `${gasPpm} PPM`}
                </span>
                <span className="text-[10px] text-[#84827a]">(Batas: 400)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
