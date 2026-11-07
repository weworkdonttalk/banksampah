"use client";

interface CylinderGaugeProps {
  fillPercent: number;
  distanceCm: number;
  isWaitingSensor?: boolean;
}

export default function CylinderGauge({
  fillPercent,
  distanceCm,
  isWaitingSensor = true,
}: CylinderGaugeProps) {
  const isFull = !isWaitingSensor && fillPercent >= 85;
  const isWarning = !isWaitingSensor && fillPercent >= 70 && fillPercent < 85;

  return (
    <div className="border border-[#1d1c19]/15 bg-[#f2f1ed]/90 backdrop-blur-sm p-5 sm:p-6 flex flex-col justify-between shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 mb-4">
        <div>
          <span className="text-[11px] font-gt-mono uppercase tracking-wider text-[#015186] font-semibold block">
            Sensor Jarak Ultrasonik
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1d1c19] mt-0.5">
            Kapasitas Isi Wadah
          </h3>
        </div>

        <span
          className={`px-2.5 py-1 text-xs font-semibold uppercase border transition-colors ${
            isWaitingSensor
              ? "border-amber-600/30 bg-amber-50 text-amber-900"
              : isFull
              ? "border-[#b91c1c] bg-red-100 text-[#b91c1c] font-bold animate-pulse"
              : isWarning
              ? "border-amber-600 bg-amber-50 text-amber-900 font-bold"
              : "border-[#1d1c19]/20 bg-white text-[#1d1c19]"
          }`}
        >
          {isWaitingSensor
            ? "Menunggu Alat"
            : isFull
            ? "Wadah Penuh"
            : isWarning
            ? "Siaga (70%)"
            : "Kapasitas Aman"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Vertical Fill Column Graphic */}
        <div className="sm:col-span-5 h-44 border border-[#1d1c19]/20 bg-[#e7e5df]/60 p-1 flex flex-col justify-end relative overflow-hidden">
          {/* Tick lines */}
          <div className="absolute inset-y-0 right-2 flex flex-col justify-between text-[9px] font-gt-mono text-[#84827a] select-none py-1 pointer-events-none z-10">
            <span>100% —</span>
            <span>75% —</span>
            <span>50% —</span>
            <span>25% —</span>
            <span>0% —</span>
          </div>

          {isWaitingSensor ? (
            <div className="h-full w-full border border-dashed border-[#1d1c19]/25 flex flex-col items-center justify-center p-3 text-center">
              <span className="size-2 rounded-full bg-amber-600 animate-pulse mb-2" />
              <span className="text-[11px] font-gt-sans text-[#55534c] leading-snug">
                Menunggu pembacaan jarak dari alat...
              </span>
            </div>
          ) : (
            <div
              className="relative w-full overflow-hidden transition-all duration-700 ease-out"
              style={{ height: `${Math.min(100, Math.max(0, fillPercent))}%` }}
            >
              <div
                className={`w-full h-full transition-colors ${
                  isFull ? "bg-[#b91c1c]" : isWarning ? "bg-amber-600" : "bg-[#015186]"
                }`}
              />
              <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
            </div>
          )}
        </div>

        {/* Readout metrics */}
        <div className="sm:col-span-7 space-y-3 font-gt-mono">
          <div className="border border-[#1d1c19]/10 bg-white/70 p-3">
            <span className="text-[10px] text-[#84827a] uppercase font-semibold block">
              Volume Sampah Terisi
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-bold text-[#1d1c19]">
                {isWaitingSensor ? "-- %" : `${fillPercent}%`}
              </span>
              <span className="text-[11px] text-[#55534c] font-gt-sans">dari total volume</span>
            </div>
          </div>

          <div className="border border-[#1d1c19]/10 bg-white/70 p-3">
            <span className="text-[10px] text-[#84827a] uppercase font-semibold block">
              Jarak Sampah ke Sensor
            </span>
            <span className="text-xl font-bold text-[#015186] block mt-0.5">
              {isWaitingSensor ? "Belum terbaca" : `${distanceCm} cm`}
            </span>
          </div>

          <p className="text-[11px] text-[#55534c] font-gt-sans leading-relaxed">
            *Truk penjemputan DLH otomatis dijadwalkan saat volume mencapai <strong>84%</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
