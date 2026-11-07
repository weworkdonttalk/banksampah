"use client";

import { useState, useEffect, useRef } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import RiskScoreWidget from "@/components/ops/risk-score-widget";
import CylinderGauge from "@/components/ops/cylinder-gauge";
import ChokeModeControl from "@/components/ops/choke-mode-control";
import { playSuccessChime, playSirenSound } from "@/lib/audio-alert";

const STATIONS = [
  { id: "BALI-ECO-01", name: "Banjar Kayumas", zone: "Denpasar Timur" },
  { id: "BALI-ECO-02", name: "Banjar Sanur", zone: "Denpasar Selatan" },
  { id: "BALI-ECO-03", name: "Banjar Seminyak", zone: "Badung" },
];

export default function OpsHazardPage() {
  const [activeStation, setActiveStation] = useState(STATIONS[0].id);
  const [isChoked, setIsChoked] = useState(false);
  const [isWaitingSensor, setIsWaitingSensor] = useState(false);
  const [isSimulatedFire, setIsSimulatedFire] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("Baru saja");
  const [tempData, setTempData] = useState([28.4, 29.1, 29.8, 30.2, 31.2]);
  const [gasData, setGasData] = useState([85, 92, 104, 110, 120]);

  const [logs, setLogs] = useState<string[]>([
    "Transmisi telemetri IoT online via 4G/LTE.",
    "Katup Choke Mode siaga di sudut 90° (normal).",
    "Sensor suhu inframerah membaca 31.2°C di dalam kompartemen.",
  ]);

  // Tab visibility detection to halt polling when inactive (save battery & mobile quota)
  useEffect(() => {
    const handleVisibility = () => {
      const active = !document.hidden;
      setIsTabActive(active);
      if (!active) {
        console.log("[PowerSave] Tab tidak aktif: Polling sensor dijeda.");
      } else {
        setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Update timestamp regularly when tab is active
  useEffect(() => {
    if (!isTabActive) return;
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 12000);
    return () => clearInterval(interval);
  }, [isTabActive]);

  // Haptic feedback & siren alert when fire is detected
  useEffect(() => {
    if (isSimulatedFire) {
      playSirenSound();
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 400]);
        } catch {}
      }
    }
  }, [isSimulatedFire]);

  const toggleFireSimulation = () => {
    const nextState = !isSimulatedFire;
    setIsSimulatedFire(nextState);
    if (nextState) {
      setTempData([32.0, 38.5, 46.2, 53.0, 58.4]);
      setGasData([140, 210, 320, 410, 485]);
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ⚠ ANCAMAN API: Suhu 58.4°C dan gas 485 PPM terdeteksi!`,
        ...prev.slice(0, 15),
      ]);
    } else {
      playSuccessChime();
      setTempData([28.4, 29.1, 29.8, 30.2, 31.2]);
      setGasData([85, 92, 104, 110, 120]);
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Simulasi bahaya dihentikan. Status kembali aman.`,
        ...prev.slice(0, 15),
      ]);
    }
  };

  const handleToggleChoke = (chokeState: boolean) => {
    setIsChoked(chokeState);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(120);
      } catch {}
    }
    if (chokeState) {
      playSuccessChime();
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Katup darurat Choke ditutup rapat (0° kedap udara).`,
        ...prev.slice(0, 15),
      ]);
    } else {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Kunci katup dibuka kembali ke posisi siaga 90°.`,
        ...prev.slice(0, 15),
      ]);
    }
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

      {/* 1. FULL-WIDTH EMERGENCY HAZARD BANNER (Mobile Top Priority) */}
      {isSimulatedFire && (
        <div
          role="alert"
          className="sticky top-0 inset-x-0 z-40 bg-[#b91c1c] text-white px-4 py-3 shadow-xl animate-pulse"
        >
          <div className="max-w-md md:max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔥</span>
              <div>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider font-gt-mono">
                  BAHAYA TINGGI: ANOMALI SUHU &amp; GAS!
                </p>
                <p className="text-[11px] text-white/90 leading-tight">
                  Suhu 58.4°C &middot; Segera aktifkan Choke Mode pemutus oksigen.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggleChoke(true)}
              className="bg-white text-[#b91c1c] text-xs font-bold uppercase px-3.5 py-2 rounded shadow-sm hover:bg-neutral-100 active:scale-95 whitespace-nowrap min-h-[44px]"
            >
              Tutup Katup
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER: Default 360-390px mobile, scales cleanly to tablet/desktop */}
      <div className="relative z-10 pt-20 sm:pt-28 pb-32 px-4 sm:px-6 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-5">
        
        {/* Mobile Header Card */}
        <div className="bg-white/85 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-[#1d1c19]/10 pb-3 mb-3">
            <div className="flex items-center gap-2 font-gt-mono text-xs text-[#015186] font-semibold">
              <span
                className={`size-2.5 rounded-full ${
                  isSimulatedFire
                    ? "bg-[#b91c1c] animate-ping"
                    : "bg-emerald-600 animate-pulse"
                }`}
              />
              <span className="tracking-wider uppercase text-[11px]">
                {isSimulatedFire ? "STATUS: BAHAYA" : "STATUS: AMAN"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-gt-mono text-[#84827a]">
              <span>Diperbarui:</span>
              <span className="text-[#1d1c19] font-medium">{lastUpdated}</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1c19]">
            Pusat Kendali Bahaya Kebakaran
          </h1>
          <p className="text-xs text-[#55534c] mt-1 leading-relaxed">
            Deteksi dini gas metana dan suhu wadah sampah untuk memutus risiko kebakaran di Banjar.
          </p>

          {/* Quick Simulation Thumb Controls */}
          <div className="mt-4 pt-3 border-t border-[#1d1c19]/10 flex gap-2">
            <button
              onClick={toggleFireSimulation}
              className={`flex-1 py-3 px-3 text-xs font-bold tracking-wider uppercase border transition-all active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5 ${
                isSimulatedFire
                  ? "border-[#b91c1c] bg-[#b91c1c] text-white"
                  : "border-[#1d1c19]/25 bg-[#f2f1ed] text-[#1d1c19] hover:border-[#b91c1c]"
              }`}
            >
              <span>{isSimulatedFire ? "Matikan Alarm" : "Uji Alarm Bahaya"}</span>
              <span>{isSimulatedFire ? "✕" : "⚠"}</span>
            </button>
            <button
              onClick={() => {
                setIsWaitingSensor(!isWaitingSensor);
                setLogs((prev) => [
                  `[${new Date().toLocaleTimeString()}] Mode sensor diubah ke ${!isWaitingSensor ? "siaga alat fisik" : "simulasi aktif"}.`,
                  ...prev,
                ]);
              }}
              className="py-3 px-3 text-xs font-gt-mono border border-[#1d1c19]/20 bg-white text-[#55534c] min-h-[44px] active:scale-95"
            >
              {isWaitingSensor ? "Data Uji" : "Sensor Asli"}
            </button>
          </div>
        </div>

        {/* Station Selector — Horizontal Thumb-friendly Segmented List */}
        <div className="bg-white/85 border border-[#1d1c19]/15 p-2 shadow-xs">
          <span className="block text-[10px] font-gt-mono font-semibold text-[#84827a] uppercase px-2 py-1">
            PILIH LOKASI STASIUN BANJAR:
          </span>
          <div className="grid grid-cols-3 gap-1.5 font-gt-mono text-xs">
            {STATIONS.map((st) => {
              const isSelected = activeStation === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setActiveStation(st.id);
                    setIsChoked(false);
                    setIsSimulatedFire(false);
                    setLogs((prev) => [
                      `[${new Date().toLocaleTimeString()}] Beralih ke stasiun ${st.name}.`,
                      ...prev,
                    ]);
                  }}
                  className={`py-2.5 px-1.5 text-center border transition-all active:scale-95 min-h-[44px] flex flex-col justify-center ${
                    isSelected
                      ? "border-[#1d1c19] bg-[#1d1c19] text-white font-bold"
                      : "border-transparent bg-[#e7e5df]/50 text-[#55534c]"
                  }`}
                >
                  <span className="text-[10px] opacity-75">{st.id}</span>
                  <span className="font-semibold truncate text-[11px]">{st.name.replace("Banjar ", "")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. PRIMARY STATUS CARD: COLOR + ICON + TEXT (Never color only!) */}
        <div
          className={`border p-4 sm:p-5 transition-all shadow-xs ${
            isSimulatedFire
              ? "border-[#b91c1c] bg-red-50 text-red-950"
              : "border-emerald-700/30 bg-emerald-50/70 text-emerald-950"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`size-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                isSimulatedFire ? "bg-[#b91c1c] text-white" : "bg-emerald-700 text-white"
              }`}
            >
              {isSimulatedFire ? "🔥" : "🛡️"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-gt-mono uppercase font-bold tracking-wider opacity-70 block">
                ANALISIS RISIKO RESMI
              </span>
              <h2 className="text-base sm:text-lg font-bold leading-tight truncate">
                {isSimulatedFire
                  ? "BAHAYA: Lonjakan Panas & Gas"
                  : "AMAN: Kondisi Wadah Terkendali"}
              </h2>
              <p className="text-xs opacity-85 mt-0.5 leading-snug">
                {isSimulatedFire
                  ? "Risiko kebakaran 88%. Katup servo wajib ditutup."
                  : "Risiko kebakaran 12%. Sirkulasi udara normal."}
              </p>
            </div>
          </div>
        </div>

        {/* 3. BIG NUMBERS FIRST (Vertical stacked mobile cards, charts below) */}
        <div className="grid grid-cols-2 gap-3 font-gt-mono">
          {/* Suhu */}
          <div className="bg-white/90 border border-[#1d1c19]/15 p-3.5 shadow-xs">
            <span className="text-[10px] text-[#84827a] uppercase font-semibold block">Suhu Sensor</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1d1c19] mt-0.5">
              <span className={isSimulatedFire ? "text-[#b91c1c]" : "text-[#1d1c19]"}>
                {isSimulatedFire ? "58.4°C" : "31.2°C"}
              </span>
            </div>
            <span className="text-[10px] text-[#84827a] block mt-1">Batas bahaya: &gt;45°C</span>
            {/* Lightweight Sparkline */}
            <div className="h-4 flex items-end gap-1 mt-2">
              {tempData.map((val, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-xs transition-all ${
                    isSimulatedFire ? "bg-[#b91c1c]" : "bg-[#015186]"
                  }`}
                  style={{ height: `${Math.min(100, Math.max(15, (val / 60) * 100))}%` }}
                />
              ))}
            </div>
          </div>

          {/* Gas Metana */}
          <div className="bg-white/90 border border-[#1d1c19]/15 p-3.5 shadow-xs">
            <span className="text-[10px] text-[#84827a] uppercase font-semibold block">Gas Metana</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1d1c19] mt-0.5">
              <span className={isSimulatedFire ? "text-[#b91c1c]" : "text-[#1d1c19]"}>
                {isSimulatedFire ? "485" : "120"}
              </span>
              <span className="text-xs font-normal text-[#84827a] ml-1">PPM</span>
            </div>
            <span className="text-[10px] text-[#84827a] block mt-1">Batas bahaya: &gt;400 PPM</span>
            {/* Lightweight Sparkline */}
            <div className="h-4 flex items-end gap-1 mt-2">
              {gasData.map((val, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-xs transition-all ${
                    isSimulatedFire ? "bg-[#b91c1c]" : "bg-[#015186]"
                  }`}
                  style={{ height: `${Math.min(100, Math.max(15, (val / 500) * 100))}%` }}
                />
              ))}
            </div>
          </div>

          {/* Katup Choke */}
          <div className="bg-white/90 border border-[#1d1c19]/15 p-3.5 shadow-xs">
            <span className="text-[10px] text-[#84827a] uppercase font-semibold block">Katup Choke</span>
            <div className={`text-base font-bold mt-1 uppercase ${isChoked ? "text-[#b91c1c]" : "text-[#015186]"}`}>
              {isChoked ? "0° Tertutup" : "90° Siaga"}
            </div>
            <span className="text-[10px] text-[#84827a] block mt-1">
              {isChoked ? "Oksigen terputus total" : "Saluran udara normal"}
            </span>
          </div>

          {/* Kapasitas Tong */}
          <div className="bg-white/90 border border-[#1d1c19]/15 p-3.5 shadow-xs">
            <span className="text-[10px] text-[#84827a] uppercase font-semibold block">Isi Wadah</span>
            <div className="text-xl font-bold text-[#1d1c19] mt-1">
              35% <span className="text-xs font-normal text-[#84827a]">(26 cm)</span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-1">Belum butuh truk</span>
          </div>
        </div>

        {/* 4. EMERGENCY CHOKE MODE ACTION (Thumb-reach button) */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1d1c19] uppercase font-gt-mono">
              Kendali Darurat Choke Mode
            </span>
            <span className={`text-xs font-gt-mono font-bold ${isChoked ? "text-[#b91c1c]" : "text-[#015186]"}`}>
              {isChoked ? "TERKUNCI 0°" : "TERBUKA 90°"}
            </span>
          </div>

          <p className="text-xs text-[#55534c] leading-relaxed">
            Katup servo kedap udara menutup rapat dalam 380 milidetik saat terjadi kebakaran sampah.
          </p>

          <button
            onClick={() => handleToggleChoke(!isChoked)}
            className={`w-full min-h-[52px] py-3.5 px-4 text-xs font-bold tracking-wider uppercase border transition-all active:scale-98 flex items-center justify-center gap-2 shadow-sm ${
              isChoked
                ? "border-[#015186] bg-[#015186] text-white hover:bg-[#003d66]"
                : "border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] hover:bg-[#33322d]"
            }`}
          >
            <span>{isChoked ? "Buka Kembali Katup (90° Normal)" : "Kunci Katup Darurat Sekarang (0° Choke)"}</span>
            <span className="text-sm">→</span>
          </button>
        </div>

        {/* 5. INSTRUMENTS (Cylinder Gauge & Risk Gauge) */}
        <div className="space-y-4">
          <CylinderGauge
            fillPercent={35}
            distanceCm={26}
            isWaitingSensor={false}
          />
          <RiskScoreWidget
            score={isSimulatedFire ? 88 : 12}
            level={isSimulatedFire ? "HAZARD" : "NORMAL"}
            temperature={isSimulatedFire ? 58.4 : 31.2}
            gasPpm={isSimulatedFire ? 485 : 120}
            isWaitingSensor={false}
          />
        </div>

        {/* 6. LOG CATATAN AKTIVITAS (Card Stream, No Wide Table) */}
        <div className="bg-white/85 border border-[#1d1c19]/15 p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <span className="text-xs font-bold font-gt-mono text-[#1d1c19] uppercase">
              Catatan Aktivitas Lapangan
            </span>
            <span className="text-[10px] font-gt-mono text-[#84827a]">
              {logs.length} entri
            </span>
          </div>

          <div className="space-y-2 font-gt-mono text-xs max-h-48 overflow-y-auto pr-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className="p-2 border border-[#1d1c19]/10 bg-[#f2f1ed]/50 rounded-none flex items-start gap-2"
              >
                <span className="text-[#84827a] text-[10px] select-none mt-0.5">&gt;</span>
                <span className="leading-snug text-[#33322d]">{log}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
