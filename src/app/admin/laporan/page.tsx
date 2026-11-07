"use client";

import { useState, useEffect } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import { playSuccessChime } from "@/lib/audio-alert";
import {
  Download,
  Sparkles,
  FileText,
  BarChart3,
  Clock,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

interface StationTariffState {
  organicRate: number;
  inorganicRate: number;
}

interface ComprehensiveLog {
  id: string;
  timestamp: string;
  stationId: string;
  actor: string;
  type: "SETORAN" | "KOREKSI_AI" | "PERINGATAN_BAHAYA" | "TONG_PENUH";
  details: string;
  badgeColor: string;
}

const WEEKLY_STATS = [
  { day: "Senin", organicCount: 14, inorganicCount: 28 },
  { day: "Selasa", organicCount: 18, inorganicCount: 24 },
  { day: "Rabu", organicCount: 12, inorganicCount: 31 },
  { day: "Kamis", organicCount: 22, inorganicCount: 35 },
  { day: "Jumat", organicCount: 26, inorganicCount: 42 },
  { day: "Sabtu", organicCount: 34, inorganicCount: 52 },
  { day: "Minggu", organicCount: 40, inorganicCount: 58 },
];

const INITIAL_AUDIT_LOGS: ComprehensiveLog[] = [
  {
    id: "LOG-9021",
    timestamp: "10:42:15",
    stationId: "ST-001",
    actor: "I Wayan Sudiarta (Warga)",
    type: "SETORAN",
    details: "Sesi SES-882191 terverifikasi Organik (Canang Bali). Saldo +Rp 2.000 dikreditkan.",
    badgeColor: "border-green-600/40 bg-green-50 text-green-800",
  },
  {
    id: "LOG-8812",
    timestamp: "10:35:00",
    stationId: "ST-001",
    actor: "Sistem AI Vision",
    type: "KOREKSI_AI",
    details: "Sesi SES-882192: Pilihan warga Organik dikoreksi otomatis ke Plastik Anorganik. Saldo +Rp 3.000.",
    badgeColor: "border-[#015186]/40 bg-[#015186]/10 text-[#015186]",
  },
  {
    id: "LOG-3301",
    timestamp: "09:58:22",
    stationId: "ST-002",
    actor: "Sensor Pintar Ultrasonik",
    type: "TONG_PENUH",
    details: "Kapasitas isi stasiun mencapai 84.5%. Alert 'Tong Hampir Penuh' terpicu.",
    badgeColor: "border-amber-600/40 bg-amber-50 text-amber-900",
  },
  {
    id: "LOG-0019",
    timestamp: "09:12:04",
    stationId: "ST-001",
    actor: "Sensor Gas & Suhu",
    type: "PERINGATAN_BAHAYA",
    details: "Uji rutin sensor thermal 32.4°C dan gas 135 PPM (Status Normal).",
    badgeColor: "border-[#1d1c19]/30 bg-[#e7e5df] text-[#1d1c19]",
  },
];

export default function AdminLaporanPage() {
  const [filterType, setFilterType] = useState<string>("SEMUA");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [logs, setLogs] = useState<ComprehensiveLog[]>(INITIAL_AUDIT_LOGS);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  // Tarif Banjar
  const [tariff, setTariff] = useState<StationTariffState>({
    organicRate: 2000,
    inorganicRate: 3000,
  });
  const [savingTariff, setSavingTariff] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Simulator Stasiun IoT
  const [simStation, setSimStation] = useState("ST-001");
  const [simDistance, setSimDistance] = useState<number>(14.5);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load Tarif Terkini
  useEffect(() => {
    fetch("/api/tariffs")
      .then((res) => res.json())
      .then((data) => {
        if (data.tariff) {
          setTariff({
            organicRate: data.tariff.organicRate,
            inorganicRate: data.tariff.inorganicRate,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Simpan Perubahan Tarif Flat
  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTariff(true);
    try {
      const res = await fetch("/api/tariffs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tariff),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan tarif");

      playSuccessChime();
      setActionSuccess("Tarif flat setoran berhasil diperbarui di seluruh stasiun!");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSavingTariff(false);
    }
  };

  // Trigger Simulator IoT Hardware
  const handleTriggerSimulator = async (action: "waste_in" | "bin_full" | "sensor_telemetry") => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: simStation,
          action,
          distanceCm: simDistance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memicu simulator");

      playSuccessChime();
      setActionSuccess(data.message || `Simulasi ${action} berhasil dikirim ke server!`);

      // Tambahkan ke log audit stream
      const newLog: ComprehensiveLog = {
        id: "SIM-" + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toLocaleTimeString(),
        stationId: simStation,
        actor: "Simulator IoT Admin",
        type: action === "bin_full" ? "TONG_PENUH" : "SETORAN",
        details: data.message || `Aksi simulasi ${action} pada stasiun ${simStation}.`,
        badgeColor: action === "bin_full" ? "border-amber-600/40 bg-amber-50 text-amber-900" : "border-[#015186]/40 bg-[#015186]/10 text-[#015186]",
      };
      setLogs((prev) => [newLog, ...prev]);
      setTimeout(() => setActionSuccess(null), 4500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memicu simulator");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `laporan-audit-ecosort-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs
    .filter((l) => (filterType === "SEMUA" ? true : l.type === filterType))
    .filter(
      (l) =>
        !searchQuery.trim() ||
        l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.stationId.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

      {/* ----- TOAST NOTIFICATION (SYMMETRICAL) ----- */}
      {actionSuccess && (
        <aside
          role="status"
          className="sticky top-0 inset-x-0 z-40 bg-emerald-700 text-white py-2.5 px-4 sm:px-6 lg:px-8 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="size-4" />
          <span>{actionSuccess}</span>
        </aside>
      )}

      {/* ----- MAIN WORKSPACE (SEIMBANG & SYMMETRICAL) ----- */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <header className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-gt-mono text-[11px] text-[#015186] font-semibold uppercase tracking-wider mb-1">
              <span className="size-2 rounded-full bg-[#1d1c19]" />
              <span>ADMINISTRASI DESA ADAT &bull; PENGATURAN TARIF &amp; AUDIT IOT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
              Laporan Sesi, Tarif Flat &amp; Simulator IoT
            </h1>
          </div>

          <div className="flex items-center gap-3 font-gt-mono text-xs">
            <button
              onClick={handleExportJSON}
              className="border border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] px-4 py-2 uppercase text-[11px] font-bold tracking-wider hover:bg-black transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              <Download className="size-3.5" />
              <span>Ekspor JSON</span>
            </button>
          </div>
        </header>

        {/* 12-COLUMN DISPATCH GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- KOLOM KIRI (6/12 TARIF FLAT & SIMULATOR HARDWARE) ----- */}
          <div className="lg:col-span-6 space-y-6">
            {/* PANEL 1: PENGATURAN TARIF FLAT DESA ADAT */}
            <form onSubmit={handleSaveTariff} className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Pengaturan Tarif Flat per Sesi Setoran
                  </span>
                </div>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-600/30 font-bold uppercase">
                  Konfigurasi Aktif
                </span>
              </div>

              <p className="text-[#55534c] leading-relaxed text-[11px]">
                Reward saldo diberikan flat per sesi setoran sesuai kategori yang disetujui atau dikoreksi oleh AI Vision.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#55534c] uppercase text-[10px] mb-1.5 font-bold">
                    Tarif Sampah Organik (Rp)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    value={tariff.organicRate}
                    onChange={(e) => setTariff({ ...tariff, organicRate: Number(e.target.value) })}
                    className="w-full h-11 border border-[#1d1c19]/30 bg-white px-3 font-mono text-lg font-bold text-emerald-800 focus:outline-hidden focus:border-[#1d1c19]"
                  />
                  <span className="text-[10px] text-[#84827a] block mt-1">Canang, janur, daun, sisa makanan</span>
                </div>

                <div>
                  <label className="block text-[#55534c] uppercase text-[10px] mb-1.5 font-bold">
                    Tarif Sampah Anorganik (Rp)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    value={tariff.inorganicRate}
                    onChange={(e) => setTariff({ ...tariff, inorganicRate: Number(e.target.value) })}
                    className="w-full h-11 border border-[#1d1c19]/30 bg-white px-3 font-mono text-lg font-bold text-[#015186] focus:outline-hidden focus:border-[#1d1c19]"
                  />
                  <span className="text-[10px] text-[#84827a] block mt-1">Botol PET, kardus, kaleng logam</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingTariff}
                className="w-full bg-[#1d1c19] text-[#f2f1ed] py-3.5 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer active:scale-95 shadow-xs"
              >
                {savingTariff ? "Menyimpan Tarif..." : "Simpan Pembaruan Tarif →"}
              </button>
            </form>

            {/* PANEL 2: SIMULATOR IOT HARDWARE (ESP32 WEMOS) */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-600" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Simulator Hardware ESP32 (Uji Demo Tanpa Alat)
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Test Rig</span>
              </div>

              <p className="text-[#55534c] leading-relaxed text-[11px]">
                Gunakan simulator ini untuk memicu event ultrasonik sampah masuk atau lonjakan sensor tanpa perlu perangkat keras fisik.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#84827a] uppercase text-[10px] mb-1 font-bold">Target Stasiun:</label>
                  <select
                    value={simStation}
                    onChange={(e) => setSimStation(e.target.value)}
                    className="w-full h-10 border border-[#1d1c19]/30 bg-white px-2 font-mono text-xs"
                  >
                    <option value="ST-001">ST-001 (TPST Kayumas)</option>
                    <option value="ST-002">ST-002 (TPS Seminyak)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#84827a] uppercase text-[10px] mb-1 font-bold">Jarak Pantul Sensor (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={simDistance}
                    onChange={(e) => setSimDistance(Number(e.target.value))}
                    className="w-full h-10 border border-[#1d1c19]/30 bg-white px-2 font-mono text-xs"
                  />
                </div>
              </div>

              {/* ACTION TRIGGER BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTriggerSimulator("waste_in")}
                  disabled={isSimulating}
                  className="py-3 px-2 bg-[#015186] text-white hover:bg-[#003d66] font-bold uppercase text-[10px] tracking-wider transition cursor-pointer active:scale-95 shadow-xs"
                >
                  Picu Sampah Masuk (Ultrasonic)
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerSimulator("bin_full")}
                  disabled={isSimulating}
                  className="py-3 px-2 bg-amber-600 text-white hover:bg-amber-700 font-bold uppercase text-[10px] tracking-wider transition cursor-pointer active:scale-95 shadow-xs"
                >
                  Picu Tong Penuh (88%)
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerSimulator("sensor_telemetry")}
                  disabled={isSimulating}
                  className="py-3 px-2 bg-[#1d1c19] text-white hover:bg-black font-bold uppercase text-[10px] tracking-wider transition cursor-pointer active:scale-95 shadow-xs"
                >
                  Kirim Telemetri Suhu
                </button>
              </div>
            </div>

            {/* PANEL 3: METRIK KOREKSI AI VISION */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-3 font-gt-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#015186]" />
                  <span className="text-[10px] font-bold uppercase text-[#015186] tracking-wider">
                    Tingkat Akurasi &amp; Koreksi AI Vision
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 border border-emerald-600/40 bg-emerald-50 text-emerald-950 font-bold uppercase">
                  Akurasi 94.6%
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#1d1c19] tracking-tight">
                92% Setoran Tervalidasi Otomatis
              </h3>

              <p className="text-xs text-[#55534c] leading-relaxed">
                Dari 142 total sesi setor minggu ini: <strong>8% dikoreksi AI</strong> dari pilihan warga yang keliru, dan <strong>3%</strong> diarahkan ke tinjauan fisik petugas karena foto kurang jelas.
              </p>
            </div>
          </div>

          {/* ----- KOLOM KANAN (6/12 GRAFIK VOLUME SESI & LOG AUDIT) ----- */}
          <div className="lg:col-span-6 space-y-6">
            {/* GRAFIK PERBANDINGAN ORGANIK VS ANORGANIK */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Jumlah Sesi Setoran Mingguan
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-emerald-700" /> Organik
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-[#1d1c19]" /> Anorganik
                  </span>
                </div>
              </div>

              <div className="h-44 flex items-end gap-2 pt-4 px-1">
                {WEEKLY_STATS.map((stat, idx) => {
                  const orgHeight = Math.min(100, Math.max(12, (stat.organicCount / 60) * 100));
                  const inorgHeight = Math.min(100, Math.max(12, (stat.inorganicCount / 60) * 100));
                  const isSelected = selectedDayIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDayIdx(isSelected ? null : idx)}
                      className={`flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer group p-1 transition ${
                        isSelected ? "bg-[#f2f1ed]" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="w-full flex items-end gap-1 h-32">
                        <div
                          style={{ height: `${orgHeight}%` }}
                          className="flex-1 bg-emerald-700 group-hover:opacity-90"
                          title={`Organik: ${stat.organicCount} sesi`}
                        />
                        <div
                          style={{ height: `${inorgHeight}%` }}
                          className="flex-1 bg-[#1d1c19] group-hover:bg-[#015186]"
                          title={`Anorganik: ${stat.inorganicCount} sesi`}
                        />
                      </div>
                      <span className={`text-[10px] mt-1 ${isSelected ? "font-bold text-[#015186]" : "text-[#84827a]"}`}>
                        {stat.day.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedDayIdx !== null && (
                <div className="p-3 bg-[#fbfbfa] border border-[#1d1c19]/15 text-xs font-gt-mono flex justify-between items-center animate-fade-in">
                  <span>
                    Hari {WEEKLY_STATS[selectedDayIdx].day}: Organik <strong>{WEEKLY_STATS[selectedDayIdx].organicCount} sesi</strong> &bull; Anorganik <strong>{WEEKLY_STATS[selectedDayIdx].inorganicCount} sesi</strong>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold">
                    Total: {WEEKLY_STATS[selectedDayIdx].organicCount + WEEKLY_STATS[selectedDayIdx].inorganicCount} Sesi
                  </span>
                </div>
              )}
            </div>

            {/* AUDIT LOG TRAIL STREAM */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1d1c19]/10 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#55534c]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Log Audit Transaksi &amp; Sensor ({filteredLogs.length})
                  </span>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 text-[10px]">
                  {["SEMUA", "SETORAN", "KOREKSI_AI", "TONG_PENUH", "PERINGATAN_BAHAYA"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterType(cat)}
                      className={`px-2 py-1 uppercase border cursor-pointer ${
                        filterType === cat
                          ? "bg-[#1d1c19] text-white border-[#1d1c19]"
                          : "bg-white text-[#55534c] border-[#1d1c19]/15 hover:border-[#1d1c19]"
                      }`}
                    >
                      {cat.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#84827a]" />
                <input
                  type="text"
                  placeholder="Cari aktor, nomor log, atau stasiun..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs border border-[#1d1c19]/20 bg-white font-mono focus:outline-hidden focus:border-[#1d1c19]"
                />
              </div>

              <div className="h-72 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-[#fbfbfa] border border-[#1d1c19]/10 space-y-1 hover:border-[#1d1c19]/30 transition shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1d1c19] text-[11px]">{log.actor}</span>
                      <span className="text-[10px] text-[#84827a] flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#55534c] leading-relaxed">{log.details}</p>
                    <div className="flex justify-between items-center pt-1 text-[9px] text-[#84827a]">
                      <span>Stasiun: {log.stationId}</span>
                      <span className="font-mono">{log.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
