"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AlertBannerProps {
  thresholdTemp?: number;
  thresholdGas?: number;
}

export default function StickyAlertBanner({
  thresholdTemp = 45,
  thresholdGas = 400,
}: AlertBannerProps) {
  const [hazardStation, setHazardStation] = useState<string | null>(null);
  const [hazardReason, setHazardReason] = useState<string>("");
  const [capacityAlert, setCapacityAlert] = useState<string | null>(null);

  useEffect(() => {
    const checkTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry?station_id=BALI-ECO-01");
        const json = await res.json();
        if (json.success && json.data) {
          const { temperature, gas_ppm, fill_percent, station_id, is_online } = json.data;

          if (is_online && (temperature > thresholdTemp || gas_ppm > thresholdGas)) {
            setHazardStation(station_id);
            setHazardReason(
              `Suhu ${temperature}°C, Gas ${gas_ppm} PPM — Potensi Bahaya Api`
            );
          } else {
            setHazardStation(null);
          }

          if (is_online && fill_percent >= 85) {
            setCapacityAlert(
              `Stasiun ${station_id} telah mencapai ${fill_percent}% kapasitas kontainer.`
            );
          } else {
            setCapacityAlert(null);
          }
        }
      } catch {
        // quiet fallback
      }
    };

    checkTelemetry();
    const timer = setInterval(checkTelemetry, 4000);
    return () => clearInterval(timer);
  }, [thresholdTemp, thresholdGas]);

  if (!hazardStation && !capacityAlert) return null;

  return (
    <div className="sticky top-0 z-50 space-y-px font-gt-mono text-xs">
      {hazardStation && (
        <div className="bg-[#b91c1c] text-white px-4 py-2 border-b border-white/20 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-white animate-ping" />
            <span className="font-bold tracking-widest text-[10px] uppercase">
              ⚠ HAZARD EMERGENCY: {hazardStation}
            </span>
            <span className="text-white/90 text-xs hidden sm:inline">&middot; {hazardReason}</span>
          </div>
          <Link
            href="/ops-hazard"
            className="underline underline-offset-4 font-bold text-[11px] hover:text-white uppercase tracking-wider"
          >
            Aktifkan Choke Mode &rarr;
          </Link>
        </div>
      )}

      {capacityAlert && (
        <div className="bg-[#1d1c19] text-[#f2f1ed] px-4 py-1.5 border-b border-white/10 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-[#84827a] tracking-wider uppercase text-[10px]">
            [ LOGISTIK OTOMATIS ] {capacityAlert}
          </span>
          <Link href="/history" className="text-[#015186] font-bold hover:underline uppercase text-[10px]">
            Pantau Truk DLH &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
