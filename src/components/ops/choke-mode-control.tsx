"use client";

import { useState } from "react";

interface ChokeModeControlProps {
  currentServoPosition: string;
  onToggleChoke: (isChoked: boolean) => void;
  isChoked: boolean;
  isWaitingSensor?: boolean;
}

export default function ChokeModeControl({
  currentServoPosition,
  onToggleChoke,
  isChoked,
  isWaitingSensor = true,
}: ChokeModeControlProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => {
      onToggleChoke(!isChoked);
      setLoading(false);
    }, 380);
  };

  return (
    <div className="border border-[#1d1c19]/15 bg-[#f2f1ed]/90 backdrop-blur-sm p-5 sm:p-6 flex flex-col justify-between shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1d1c19]/10 pb-3 mb-4 gap-2">
        <div>
          <span className="text-[11px] font-gt-mono uppercase tracking-wider text-[#015186] font-semibold block">
            Pengendali Katup Mekanik
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1d1c19] mt-0.5">
            Katup Pengaman Darurat (Choke Mode)
          </h3>
        </div>

        <span className="text-xs font-gt-mono">
          Posisi:{" "}
          <strong className={isChoked ? "text-[#b91c1c]" : "text-[#015186]"}>
            {isChoked
              ? "0° (Tertutup Rapat)"
              : isWaitingSensor
              ? "0° (Siaga)"
              : "90° (Terbuka)"}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Controls */}
        <div className="sm:col-span-7 space-y-3">
          <p className="text-xs text-[#55534c] leading-relaxed font-gt-sans">
            Katup kedap udara yang digerakkan oleh motor servo. Menutup rapat saluran dalam 380 milidetik untuk memutus pasokan oksigen saat ada indikasi api.
          </p>

          <button
            onClick={handleAction}
            disabled={loading}
            className={`w-full min-h-[48px] py-3 px-4 text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer shadow-sm active:scale-98 ${
              isChoked
                ? "border-[#015186] bg-[#015186] text-white hover:bg-[#003d66]"
                : "border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] hover:bg-[#33322d]"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="size-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Menggerakkan Katup...</span>
                </>
              ) : isChoked ? (
                <span>Buka Katup Kembali Normal (Siaga)</span>
              ) : (
                <span>Tutup Katup Darurat Sekarang (0° Kedap)</span>
              )}
            </span>
          </button>

          {isChoked ? (
            <div className="border border-[#b91c1c]/30 bg-red-50 p-3 text-xs text-[#b91c1c]">
              <span className="font-bold flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#b91c1c] animate-ping" />
                Katup Tertutup Kedap
              </span>
              <p className="text-[11px] text-red-900 mt-0.5">
                Aliran udara terputus total. Risiko api padam karena ketiadaan oksigen.
              </p>
            </div>
          ) : (
            <div className="border border-[#1d1c19]/10 bg-white/70 p-3 text-xs text-[#55534c] font-gt-sans">
              Status katup normal. Sistem otomatis menutup bila skor risiko melebihi 80.
            </div>
          )}
        </div>

        {/* Visualizer */}
        <div className="sm:col-span-5 border border-[#1d1c19]/10 bg-[#e7e5df]/40 p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-gt-mono text-[#84827a] uppercase font-semibold mb-2 block">
            Posisi Fisik Katup
          </span>

          <div className="relative size-20 sm:size-24 border border-[#1d1c19]/20 bg-white rounded-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 h-px bg-[#1d1c19]/15" />
            <div className="absolute inset-y-0 w-px bg-[#1d1c19]/15" />

            <div
              className="absolute w-14 sm:w-16 h-2 rounded transition-transform duration-500 shadow-sm"
              style={{
                backgroundColor: isChoked ? "#b91c1c" : "#015186",
                transform: `rotate(${isChoked ? 0 : 90}deg)`,
              }}
            />

            <div className="relative size-3.5 rounded-full bg-[#1d1c19] border-2 border-white z-10" />
          </div>

          <div className="mt-2 text-xs font-gt-mono">
            <span className={isChoked ? "text-[#b91c1c] font-bold" : "text-[#015186] font-bold"}>
              {isChoked ? "Mendatar (Kedap)" : "Tegak (Terbuka)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
