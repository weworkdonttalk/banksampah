"use client";

import { useState, useEffect } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import RiskScoreWidget from "@/components/ops/risk-score-widget";
import CylinderGauge from "@/components/ops/cylinder-gauge";
import ChokeModeControl from "@/components/ops/choke-mode-control";
import { playSuccessChime, playSirenSound } from "@/lib/audio-alert";
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Activity,
  Terminal,
  Radio,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";

const STATIONS = [
  { id: "BALI-ECO-01", name: "Banjar Kayumas", zone: "Denpasar Timur", baseTemp: 31.2, baseGas: 120, fill: 35, dist: 26 },
  { id: "BALI-ECO-02", name: "Banjar Sanur", zone: "Denpasar Selatan", baseTemp: 29.8, baseGas: 95, fill: 68, dist: 14 },
  { id: "BALI-ECO-03", name: "Banjar Seminyak", zone: "Badung", baseTemp: 33.5, baseGas: 165, fill: 82, dist: 8 },
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
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const [logs, setLogs] = useState<string[]>([
    "Transmisi telemetri IoT online via 4G/LTE.",
    "Katup Choke Mode siaga di sudut 90° (normal).",
    "Sensor suhu inframerah membaca 31.2°C di dalam kompartemen.",
  ]);

  const currentStationInfo = STATIONS.find((s) => s.id === activeStation) || STATIONS[0];

  useEffect(() => {
    const handleVisibility = () => {
      const active = !document.hidden;
      setIsTabActive(active);
      if (active) {
        setLastUpdated(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Live telemetry pulse: subtle realistic fluctuations
  useEffect(() => {
    if (!isTabActive || isSimulatedFire) return;
    const interval = setInterval(() => {
      const jitterTemp = Number((Math.random() * 0.4 - 0.2).toFixed(1));
      const jitterGas = Math.floor(Math.random() * 6 - 3);

      setTempData((prev) => {
        const last = prev[prev.length - 1];
        const next = Number(Math.max(26, Math.min(38, last + jitterTemp)).toFixed(1));
        return [...prev.slice(1), next];
      });

      setGasData((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(60, Math.min(220, last + jitterGas));
        return [...prev.slice(1), next];
      });

      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 3500);
    return () => clearInterval(interval);
  }, [isTabActive, isSimulatedFire]);

  useEffect(() => {
    if (isSimulatedFire) {
      playSirenSound();
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 400]);
        } catch {
          // ignore
        }
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
        `[${new Date().toLocaleTimeString()}] BAHAYA: Anomali panas 58.4°C dan gas 485 PPM terdeteksi di ${currentStationInfo.name}!`,
        ...prev.slice(0, 15),
      ]);
    } else {
      playSuccessChime();
      setTempData([
        currentStationInfo.baseTemp - 1.5,
        currentStationInfo.baseTemp - 1.0,
        currentStationInfo.baseTemp - 0.5,
        currentStationInfo.baseTemp - 0.2,
        currentStationInfo.baseTemp,
      ]);
      setGasData([
        currentStationInfo.baseGas - 25,
        currentStationInfo.baseGas - 18,
        currentStationInfo.baseGas - 10,
        currentStationInfo.baseGas - 5,
        currentStationInfo.baseGas,
      ]);
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Simulasi bahaya dihentikan. Status kembali normal.`,
        ...prev.slice(0, 15),
      ]);
    }
  };

  const handleToggleChoke = (chokeState: boolean) => {
    setIsChoked(chokeState);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(120);
      } catch {
        // ignore
      }
    }
    if (chokeState) {
      playSuccessChime();
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Katup darurat ditutup rapat (0° posisi kedap udara).`,
        ...prev.slice(0, 15),
      ]);
    } else {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Kunci katup dibuka kembali ke posisi siaga 90°.`,
        ...prev.slice(0, 15),
      ]);
    }
  };

  const handleSelectStation = (st: typeof STATIONS[0]) => {
    setActiveStation(st.id);
    setIsChoked(false);
    setIsSimulatedFire(false);
    setTempData([
      st.baseTemp - 1.5,
      st.baseTemp - 1.0,
      st.baseTemp - 0.5,
      st.baseTemp - 0.2,
      st.baseTemp,
    ]);
    setGasData([
      st.baseGas - 25,
      st.baseGas - 18,
      st.baseGas - 10,
      st.baseGas - 5,
      st.baseGas,
    ]);
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Beralih telemetri aktif ke ${st.name} (${st.zone}).`,
      ...prev.slice(0, 15),
    ]);
  };

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

      {/* ----- ALERT BANNER (SYMMETRICAL) ----- */}
      {isSimulatedFire && (
        <aside
          role="alert"
          className="sticky top-0 inset-x-0 z-40 bg-[#b91c1c] text-white px-4 sm:px-6 lg:px-8 py-3 shadow-xl animate-pulse"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-gt-mono">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Flame className="size-4 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                  BAHAYA TINGGI: ANOMALI SUHU &amp; GAS DI {currentStationInfo.name}!
                </p>
                <p className="text-[11px] text-white/90 leading-tight">
                  Suhu 58.4°C &bull; Gas 485 PPM. Segera aktifkan Choke Mode pemutus suplai oksigen.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggleChoke(true)}
              className="bg-white text-[#b91c1c] text-xs font-bold uppercase px-4 py-2 hover:bg-neutral-100 transition whitespace-nowrap min-h-[40px] cursor-pointer shadow-xs active:scale-95"
            >
              Kunci Katup Sekarang
            </button>
          </div>
        </aside>
      )}

      {/* ----- MAIN WORKSPACE (SEIMBANG & SYMMETRICAL) ----- */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <header className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1d1c19]/10 pb-4">
            <div>
              <div className="flex items-center gap-2 font-gt-mono text-[11px] text-[#015186] font-semibold uppercase tracking-wider mb-1">
                <span
                  className={`size-2 rounded-full ${
                    isSimulatedFire ? "bg-[#b91c1c] animate-ping" : "bg-emerald-600 animate-pulse"
                  }`}
                />
                <span>STASIUN SENSOR AKTIF // {currentStationInfo.zone}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
                Pusat Kendali Telemetri &amp; Mitigasi Kebakaran
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-gt-mono text-xs">
              <button
                onClick={toggleFireSimulation}
                className={`py-2 px-3.5 text-xs font-bold tracking-wider uppercase border transition cursor-pointer flex items-center gap-2 active:scale-95 ${
                  isSimulatedFire
                    ? "border-[#b91c1c] bg-[#b91c1c] text-white hover:bg-red-700 shadow-sm"
                    : "border-[#1d1c19]/30 bg-[#f2f1ed] text-[#1d1c19] hover:border-[#b91c1c] hover:text-[#b91c1c]"
                }`}
              >
                <Flame className="size-3.5" />
                <span>{isSimulatedFire ? "Hentikan Simulasi" : "Uji Lonjakan Bahaya"}</span>
              </button>

              <button
                onClick={() => {
                  setIsWaitingSensor(!isWaitingSensor);
                  setLogs((prev) => [
                    `[${new Date().toLocaleTimeString()}] Mode pembacaan dialihkan ke ${
                      !isWaitingSensor ? "siaga alat fisik" : "simulasi aktif"
                    }.`,
                    ...prev.slice(0, 15),
                  ]);
                }}
                className={`py-2 px-3 text-xs border transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isWaitingSensor
                    ? "border-[#015186] bg-[#015186] text-white font-bold"
                    : "border-[#1d1c19]/25 bg-white text-[#55534c] hover:border-[#1d1c19]"
                }`}
              >
                <SlidersHorizontal className="size-3.5" />
                <span>{isWaitingSensor ? "Mode Alat Fisik" : "Mode Simulasi"}</span>
              </button>
            </div>
          </div>

          {/* STATION SELECTOR */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-gt-mono text-xs overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[10px] text-[#84827a] uppercase font-bold tracking-wider shrink-0">
                Pilih Stasiun:
              </span>
              {STATIONS.map((st) => {
                const isSelected = activeStation === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStation(st)}
                    className={`py-1.5 px-3 text-xs uppercase tracking-wider border transition cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 ${
                      isSelected
                        ? "border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] font-bold shadow-xs"
                        : "border-[#1d1c19]/15 bg-white text-[#55534c] hover:border-[#1d1c19]/50"
                    }`}
                  >
                    <span>{st.name}</span>
                    <span className="text-[10px] opacity-60">({st.id.slice(-2)})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 font-gt-mono text-[10px] text-[#84827a] shrink-0">
              <Radio className="size-3 text-emerald-600 animate-pulse" />
              <span>Sinkronisasi:</span>
              <span className="font-semibold text-[#1d1c19]">{lastUpdated}</span>
            </div>
          </div>
        </header>

        {/* 12-COLUMN COMMAND CENTER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- KOLOM KIRI (7 KEBUTUHAN UTAMA) ----- */}
          <div className="lg:col-span-7 space-y-6">
            {/* PRIMARY STATUS CARD */}
            <div
              className={`border p-6 transition-all shadow-xs ${
                isSimulatedFire
                  ? "border-[#b91c1c] bg-red-50 text-red-950"
                  : "border-emerald-700/30 bg-emerald-50/70 text-emerald-950"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`size-12 flex items-center justify-center shrink-0 border ${
                    isSimulatedFire
                      ? "border-[#b91c1c] bg-[#b91c1c] text-white"
                      : "border-emerald-700 bg-emerald-700 text-white"
                  }`}
                >
                  {isSimulatedFire ? (
                    <AlertTriangle className="size-6 stroke-[2]" />
                  ) : (
                    <ShieldCheck className="size-6 stroke-[2]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 font-gt-mono">
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-75">
                      ANALISIS SISTEM OTOMASI
                    </span>
                    <span className="text-[11px] font-bold uppercase">
                      {isSimulatedFire ? "SIAGA 1 (KRITIS)" : "KONDISI NORMAL"}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5">
                    {isSimulatedFire
                      ? "Bahaya: Lonjakan Suhu & Akumulasi Gas Metana"
                      : "Aman: Kondisi Kompartemen Sampah Terkendali"}
                  </h2>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    {isSimulatedFire
                      ? "Suhu melampaui ambang batas 50°C. Segera tutup katup isolasi oksigen untuk memadamkan potensi nyala api."
                      : "Sirkulasi udara stabil. Parameter thermal dan sensor gas organik berada dalam toleransi aman."}
                  </p>
                </div>
              </div>
            </div>

            {/* TELEMETRY METRICS 4-STAT GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-gt-mono">
              <div className="border border-[#1d1c19]/15 bg-white p-4 shadow-xs hover:border-[#1d1c19]/40 transition">
                <div className="flex items-center justify-between text-[#84827a] mb-1">
                  <span className="text-[10px] uppercase tracking-wider">Suhu Sensor</span>
                  <Activity className="size-3" />
                </div>
                <p className="text-2xl font-bold text-[#1d1c19]">
                  {tempData[tempData.length - 1]}°C
                </p>
                <span className="text-[10px] text-[#84827a] block mt-0.5">
                  Batas Aman: &lt;45°C
                </span>
              </div>

              <div className="border border-[#1d1c19]/15 bg-white p-4 shadow-xs hover:border-[#1d1c19]/40 transition">
                <div className="flex items-center justify-between text-[#84827a] mb-1">
                  <span className="text-[10px] uppercase tracking-wider">Gas Metana</span>
                  <Activity className="size-3" />
                </div>
                <p className="text-2xl font-bold text-[#1d1c19]">
                  {gasData[gasData.length - 1]} <span className="text-xs font-normal">PPM</span>
                </p>
                <span className="text-[10px] text-[#84827a] block mt-0.5">
                  Batas Aman: &lt;350 PPM
                </span>
              </div>

              <div className="border border-[#1d1c19]/15 bg-white p-4 shadow-xs hover:border-[#1d1c19]/40 transition">
                <div className="flex items-center justify-between text-[#84827a] mb-1">
                  <span className="text-[10px] uppercase tracking-wider">Posisi Servo</span>
                  <SlidersHorizontal className="size-3" />
                </div>
                <p className="text-2xl font-bold text-[#1d1c19]">
                  {isChoked ? "0°" : "90°"}
                </p>
                <span className="text-[10px] text-[#84827a] block mt-0.5">
                  {isChoked ? "Kedap Udara" : "Sirkulasi Terbuka"}
                </span>
              </div>

              <div className="border border-[#1d1c19]/15 bg-white p-4 shadow-xs hover:border-[#1d1c19]/40 transition">
                <div className="flex items-center justify-between text-[#84827a] mb-1">
                  <span className="text-[10px] uppercase tracking-wider">Koneksi IoT</span>
                  <CheckCircle2 className="size-3 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-800">LTE</p>
                <span className="text-[10px] text-[#84827a] block mt-0.5">
                  Ping 3.5s Aktif
                </span>
              </div>
            </div>

            {/* INTERACTIVE SPARKLINE THERMAL CHART */}
            <div className="border border-[#1d1c19]/15 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between font-gt-mono text-xs border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#1d1c19]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Tren Pengukuran Suhu (Klik Batang untuk Inspeksi)
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">5 Sampel Terakhir</span>
              </div>

              <div className="h-32 flex items-end gap-3 pt-4 px-2 font-gt-mono">
                {tempData.map((val, idx) => {
                  const heightPercent = Math.min(100, Math.max(15, (val / 65) * 100));
                  const isHigh = val >= 45;
                  const isSelected = selectedBarIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedBarIdx(isSelected ? null : idx)}
                      className={`flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer group p-1 transition ${
                        isSelected ? "bg-[#f2f1ed]" : "hover:bg-zinc-50"
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${isSelected ? "text-[#015186]" : "text-[#55534c]"}`}>
                        {val}°
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full transition-all duration-300 ${
                          isHigh ? "bg-[#b91c1c]" : isSelected ? "bg-[#015186]" : "bg-[#1d1c19] group-hover:bg-[#015186]"
                        }`}
                      />
                      <span className="text-[9px] text-[#84827a]">T-{5 - idx}</span>
                    </div>
                  );
                })}
              </div>

              {selectedBarIdx !== null && (
                <div className="p-3 bg-[#fbfbfa] border border-[#1d1c19]/15 text-xs font-gt-mono flex justify-between items-center animate-fade-in">
                  <span>
                    Sampel T-{5 - selectedBarIdx}: <strong>{tempData[selectedBarIdx]}°C</strong> &bull; Gas: <strong>{gasData[selectedBarIdx]} PPM</strong>
                  </span>
                  <span className="text-[10px] text-[#015186] font-semibold">Toleransi Normal</span>
                </div>
              )}
            </div>

            {/* TERMINAL AUDIT LOG */}
            <div className="border border-[#1d1c19]/15 bg-white p-6 shadow-xs space-y-3 font-gt-mono">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="size-3.5 text-[#55534c]\" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Log Aktivitas Sensor ({logs.length})
                  </span>
                </div>
                <button
                  onClick={() => setLogs([`[${new Date().toLocaleTimeString()}] Log di-refresh.`])}
                  className="text-[10px] text-[#84827a] hover:text-[#1d1c19] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Bersihkan
                </button>
              </div>

              <div className="h-44 overflow-y-auto space-y-2 pr-1 text-xs">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="p-2.5 bg-[#fbfbfa] border border-[#1d1c19]/10 text-[11px] leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-[#84827a] select-none">&rsaquo;</span>
                    <span className="text-[#1d1c19]">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ----- KOLOM KANAN (5 INSTRUMEN HARDWARE) ----- */}
          <div className="lg:col-span-5 space-y-6">
            {/* HARDWARE INSTRUMENT: CYLINDER GAUGE */}
            <CylinderGauge
              fillPercent={currentStationInfo.fill}
              distanceCm={currentStationInfo.dist}
              isWaitingSensor={isWaitingSensor}
            />

            {/* HARDWARE INSTRUMENT: RISK SCORE GAUGE */}
            <RiskScoreWidget
              score={isSimulatedFire ? 88 : currentStationInfo.fill > 80 ? 45 : 12}
              level={isSimulatedFire ? "HAZARD" : currentStationInfo.fill > 80 ? "WARNING" : "NORMAL"}
              temperature={isSimulatedFire ? 58.4 : tempData[tempData.length - 1]}
              gasPpm={isSimulatedFire ? 485 : gasData[gasData.length - 1]}
              isWaitingSensor={isWaitingSensor}
            />

            {/* HARDWARE ACTUATOR: CHOKE MODE VALVE CONTROL */}
            <ChokeModeControl
              currentServoPosition={isChoked ? "0° Kedap Udara" : "90° Siaga Sirkulasi"}
              onToggleChoke={handleToggleChoke}
              isChoked={isChoked}
              isWaitingSensor={isWaitingSensor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
