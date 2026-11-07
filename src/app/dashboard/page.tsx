"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Station {
  id: string;
  deviceId: string;
  apiKey: string;
  name: string;
  lokasi: string;
  tempWarnThreshold: number;
  tempDangerThreshold: number;
  smokeWarnThreshold: number;
  smokeDangerThreshold: number;
  isOnline: boolean;
  status: "AMAN" | "WASPADA" | "BAHAYA";
  latestReading: {
    temp: number;
    smoke: number;
    humidity?: number;
    createdAt: string;
  } | null;
  alerts: Array<{
    id: string;
    type: string;
    level: "WASPADA" | "BAHAYA";
    value: number;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [readingsHistory, setReadingsHistory] = useState<any[]>([]);
  const [historyRange, setHistoryRange] = useState<1 | 24>(24);
  const [user, setUser] = useState<any>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [thresholdModal, setThresholdModal] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    tempWarn: 45,
    tempDanger: 60,
    smokeWarn: 300,
    smokeDanger: 600,
  });

  const isTabActive = useRef(true);

  // Tab visibility detection to stop polling when tab is inactive
  useEffect(() => {
    const handleVisibility = () => {
      isTabActive.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const fetchData = async () => {
    if (!isTabActive.current) return;
    try {
      const res = await fetch("/api/stations");
      if (!res.ok) return;
      const data = await res.json();
      setStations(data.stations || []);

      if (data.stations?.length > 0 && !selectedStationId) {
        setSelectedStationId(data.stations[0].id);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (stationId: string, hours: number) => {
    try {
      const res = await fetch(`/api/stations/${stationId}?hours=${hours}`);
      if (!res.ok) return;
      const data = await res.json();
      setReadingsHistory(data.readings || []);
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) {
          router.push("/login");
        } else {
          setUser(d.user);
        }
      });
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Poll every 4 seconds
    return () => clearInterval(interval);
  }, [selectedStationId]);

  useEffect(() => {
    if (selectedStationId) {
      fetchHistory(selectedStationId, historyRange);
    }
  }, [selectedStationId, historyRange]);

  // Vibrate on danger
  useEffect(() => {
    const hasDanger = stations.some((s) => s.status === "BAHAYA");
    if (hasDanger && typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  }, [stations]);

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setResolvingId(null);
    }
  };

  const handleTriggerSim = async (mode: "normal" | "warning" | "danger") => {
    const st = stations.find((s) => s.id === selectedStationId);
    if (!st) return;
    await fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: st.deviceId, mode }),
    });
    await fetchData();
    if (selectedStationId) fetchHistory(selectedStationId, historyRange);
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStationId) return;
    await fetch(`/api/stations/${selectedStationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempWarnThreshold: thresholdForm.tempWarn,
        tempDangerThreshold: thresholdForm.tempDanger,
        smokeWarnThreshold: thresholdForm.smokeWarn,
        smokeDangerThreshold: thresholdForm.smokeDanger,
      }),
    });
    setThresholdModal(false);
    fetchData();
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const activeDanger = stations.find((s) => s.status === "BAHAYA");

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="font-gt-mono text-xs uppercase tracking-widest text-[#55534c] animate-pulse">
          MEMUAT TELEMETRI IOT KAWASAN...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24 font-sans">
      {/* FULL-WIDTH DANGER BANNER IF ANY STATION IN DANGER */}
      {activeDanger && (
        <div className="bg-red-600 text-white px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-40 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-white animate-ping" />
            <span className="font-gt-mono text-xs font-bold uppercase tracking-widest">
              BAHAYA KRITIS: {activeDanger.name} ({activeDanger.deviceId})
            </span>
          </div>
          <p className="text-xs">
            Suhu {activeDanger.latestReading?.temp}°C atau Asap {activeDanger.latestReading?.smoke} PPM melampaui batas bahaya!
          </p>
          {activeDanger.alerts?.[0] && (
            <button
              onClick={() => handleResolveAlert(activeDanger.alerts[0].id)}
              disabled={resolvingId === activeDanger.alerts[0].id}
              className="bg-white text-red-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-100 transition whitespace-nowrap"
            >
              {resolvingId === activeDanger.alerts[0].id ? "Menangani..." : "Tandai Ditangani ✓"}
            </button>
          )}
        </div>
      )}

      {/* TOP HEADER */}
      <header className="border-b border-[#1d1c19]/15 px-4 sm:px-8 py-4 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase">
              PUSAT KENDALI IOT // {user?.banjar?.nama || "BALI SMART BANJAR"}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#1d1c19]">
              Monitoring Stasiun TPST
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-gt-mono">
            <span className="hidden sm:inline text-[#84827a]">{user?.name} ({user?.role})</span>
            <Link
              href="/petugas"
              className="px-2.5 py-1 border border-[#1d1c19] text-[11px] font-medium hover:bg-[#1d1c19] hover:text-white transition"
            >
              Input Setoran →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* STATIONS SELECTOR & STATUS CARDS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="font-gt-mono text-[10px] uppercase text-[#84827a] tracking-wider">
              DAFTAR STASIUN AKTIF ({stations.length})
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-gt-mono">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE REFRESH 4S</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stations.map((st) => {
              const isSelected = st.id === selectedStationId;
              const isOnline = st.isOnline;
              const statusColor =
                st.status === "BAHAYA"
                  ? "border-red-600 bg-red-50 text-red-950"
                  : st.status === "WASPADA"
                  ? "border-amber-500 bg-amber-50 text-amber-950"
                  : "border-[#1d1c19]/20 bg-white text-[#1d1c19]";

              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStationId(st.id)}
                  className={`p-4 border-2 transition cursor-pointer relative ${statusColor} ${
                    isSelected ? "ring-2 ring-[#1d1c19]" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-gt-mono text-xs font-bold tracking-wider uppercase">
                      {st.deviceId} &middot; {st.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`size-2 rounded-full ${
                          isOnline ? "bg-emerald-500" : "bg-zinc-400"
                        }`}
                      />
                      <span className="font-gt-mono text-[10px] font-bold">
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#55534c] line-clamp-1 mb-3">{st.lokasi}</p>

                  <div className="grid grid-cols-3 gap-2 border-t border-current/15 pt-2 text-center">
                    <div>
                      <span className="text-[10px] font-gt-mono uppercase block text-[#84827a]">
                        Suhu
                      </span>
                      <span className="text-base font-bold font-mono">
                        {st.latestReading ? `${st.latestReading.temp.toFixed(1)}°C` : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-gt-mono uppercase block text-[#84827a]">
                        Asap/Gas
                      </span>
                      <span className="text-base font-bold font-mono">
                        {st.latestReading ? `${st.latestReading.smoke} PPM` : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-gt-mono uppercase block text-[#84827a]">
                        Status
                      </span>
                      <span
                        className={`text-xs font-bold font-gt-mono uppercase px-1.5 py-0.5 inline-block mt-0.5 ${
                          st.status === "BAHAYA"
                            ? "bg-red-600 text-white"
                            : st.status === "WASPADA"
                            ? "bg-amber-500 text-black"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SELECTED STATION TELEMETRY DETAIL & CONTROLS */}
        {selectedStation && (
          <section className="bg-white border border-[#1d1c19]/15 p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1d1c19]/10 pb-4">
              <div>
                <span className="font-gt-mono text-[10px] uppercase text-[#84827a] tracking-wider block">
                  TELEMETRI DETAIL // {selectedStation.deviceId}
                </span>
                <h2 className="text-lg font-bold text-[#1d1c19]">{selectedStation.name}</h2>
                <p className="text-xs text-[#55534c] font-mono mt-0.5">
                  x-api-key: {selectedStation.apiKey}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setThresholdForm({
                      tempWarn: selectedStation.tempWarnThreshold,
                      tempDanger: selectedStation.tempDangerThreshold,
                      smokeWarn: selectedStation.smokeWarnThreshold,
                      smokeDanger: selectedStation.smokeDangerThreshold,
                    });
                    setThresholdModal(true);
                  }}
                  className="px-3 py-1.5 border border-[#1d1c19] text-xs font-medium hover:bg-[#1d1c19] hover:text-white transition"
                >
                  ⚙ Atur Ambang Batas
                </button>
              </div>
            </div>

            {/* QUICK HARDWARE SIMULATOR BAR */}
            <div className="bg-[#f2f1ed] p-3 border border-[#1d1c19]/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-gt-mono text-[10px] uppercase font-bold text-[#55534c]">
                  SIMULATOR INGEST IOT (DEMO JURI TANPA HARDWARE)
                </span>
                <span className="text-[10px] font-mono text-[#84827a]">
                  POST /api/ingest
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleTriggerSim("normal")}
                  className="py-1.5 bg-white border border-emerald-600 text-emerald-800 text-xs font-semibold hover:bg-emerald-50 active:scale-95 transition"
                >
                  🟢 Kirim Normal (31°C)
                </button>
                <button
                  onClick={() => handleTriggerSim("warning")}
                  className="py-1.5 bg-white border border-amber-600 text-amber-800 text-xs font-semibold hover:bg-amber-50 active:scale-95 transition"
                >
                  🟡 Kirim Waspada (48°C)
                </button>
                <button
                  onClick={() => handleTriggerSim("danger")}
                  className="py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:scale-95 transition"
                >
                  🔴 Kirim Bahaya (64°C)
                </button>
              </div>
            </div>

            {/* CHART 1 HOUR / 24 HOURS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-gt-mono text-xs font-bold uppercase tracking-wider text-[#1d1c19]">
                  Grafik Riwayat Sensor ({readingsHistory.length} data poin)
                </span>
                <div className="flex border border-[#1d1c19]/20 font-gt-mono text-xs">
                  <button
                    onClick={() => setHistoryRange(1)}
                    className={`px-3 py-1 ${
                      historyRange === 1 ? "bg-[#1d1c19] text-white" : "hover:bg-zinc-100"
                    }`}
                  >
                    1 Jam
                  </button>
                  <button
                    onClick={() => setHistoryRange(24)}
                    className={`px-3 py-1 ${
                      historyRange === 24 ? "bg-[#1d1c19] text-white" : "hover:bg-zinc-100"
                    }`}
                  >
                    24 Jam
                  </button>
                </div>
              </div>

              {/* Minimalist SVG Sparkline / Bar Graph */}
              <div className="h-44 border border-[#1d1c19]/15 bg-[#fbfbfa] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#84827a]">
                  <span>Suhu Termal (°C) & Asap (PPM)</span>
                  <span>Batas Bahaya: {selectedStation.tempDangerThreshold}°C</span>
                </div>

                <div className="h-28 flex items-end gap-1 overflow-x-auto pt-4">
                  {readingsHistory.map((r, idx) => {
                    const heightPercent = Math.min(100, Math.max(10, (r.temp / 70) * 100));
                    const isDanger = r.temp >= selectedStation.tempDangerThreshold;
                    const isWarn = r.temp >= selectedStation.tempWarnThreshold;
                    const barColor = isDanger
                      ? "bg-red-600"
                      : isWarn
                      ? "bg-amber-500"
                      : "bg-[#1d1c19]";

                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[6px] group relative flex flex-col items-center"
                      >
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-sm transition-all ${barColor}`}
                        />
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-1 z-20 bg-black text-white text-[9px] p-1 whitespace-nowrap font-mono">
                          {r.temp}°C | {r.smoke} PPM
                          <br />
                          {new Date(r.createdAt).toLocaleTimeString("id-ID")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#84827a] pt-1 border-t border-[#1d1c19]/10">
                  <span>
                    Mulai:{" "}
                    {readingsHistory[0]
                      ? new Date(readingsHistory[0].createdAt).toLocaleTimeString("id-ID")
                      : "-"}
                  </span>
                  <span>
                    Terkini:{" "}
                    {selectedStation.latestReading
                      ? new Date(selectedStation.latestReading.createdAt).toLocaleTimeString("id-ID")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTIVE ALERTS TABLE */}
            <div>
              <span className="font-gt-mono text-xs font-bold uppercase tracking-wider text-[#1d1c19] block mb-2">
                Daftar Peringatan Aktif ({selectedStation.alerts?.length || 0})
              </span>

              {selectedStation.alerts && selectedStation.alerts.length > 0 ? (
                <div className="space-y-2">
                  {selectedStation.alerts.map((alt) => (
                    <div
                      key={alt.id}
                      className={`p-3 border flex items-center justify-between gap-3 text-xs ${
                        alt.level === "BAHAYA"
                          ? "border-red-500 bg-red-50 text-red-900"
                          : "border-amber-500 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <div>
                        <span className="font-bold uppercase font-gt-mono">
                          [{alt.level}] {alt.type} ANOMALI
                        </span>
                        <p className="text-[11px] mt-0.5">
                          Nilai terbaca: {alt.value} &middot; Terdeteksi:{" "}
                          {new Date(alt.createdAt).toLocaleTimeString("id-ID")}
                        </p>
                      </div>

                      <button
                        onClick={() => handleResolveAlert(alt.id)}
                        disabled={resolvingId === alt.id}
                        className="px-3 py-1.5 bg-[#1d1c19] text-white text-[11px] font-semibold hover:bg-black transition whitespace-nowrap cursor-pointer"
                      >
                        {resolvingId === alt.id ? "Memproses..." : "Tandai Selesai ✓"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-[#1d1c19]/15 text-center text-xs text-[#55534c] bg-[#fbfbfa]">
                  Tidak ada anomali atau bahaya aktif pada stasiun ini. Kondisi wadah terpantau AMAN.
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* MODAL CONFIG THRESHOLD */}
      {thresholdModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#1d1c19] p-6 max-w-sm w-full font-sans space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm uppercase font-gt-mono">Atur Ambang Batas Sensor</h3>
              <button onClick={() => setThresholdModal(false)} className="text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#55534c] mb-1">Suhu Waspada (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholdForm.tempWarn}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, tempWarn: Number(e.target.value) })}
                  className="w-full h-9 px-2 border border-[#1d1c19]"
                />
              </div>

              <div>
                <label className="block text-[#55534c] mb-1">Suhu Bahaya (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholdForm.tempDanger}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, tempDanger: Number(e.target.value) })}
                  className="w-full h-9 px-2 border border-[#1d1c19]"
                />
              </div>

              <div>
                <label className="block text-[#55534c] mb-1">Asap/Gas Waspada (PPM)</label>
                <input
                  type="number"
                  value={thresholdForm.smokeWarn}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, smokeWarn: Number(e.target.value) })}
                  className="w-full h-9 px-2 border border-[#1d1c19]"
                />
              </div>

              <div>
                <label className="block text-[#55534c] mb-1">Asap/Gas Bahaya (PPM)</label>
                <input
                  type="number"
                  value={thresholdForm.smokeDanger}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, smokeDanger: Number(e.target.value) })}
                  className="w-full h-9 px-2 border border-[#1d1c19]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1d1c19] text-white uppercase font-bold tracking-wider hover:bg-black transition mt-2"
              >
                Simpan Konfigurasi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
