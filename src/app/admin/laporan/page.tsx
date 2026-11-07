"use client";

import { useState, useEffect } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import { playSuccessChime } from "@/lib/audio-alert";
import {
  Truck,
  Download,
  Sparkles,
  Radio,
  FileText,
  BarChart3,
  Clock,
  Send,
  CheckCircle2,
  Search,
} from "lucide-react";

interface DispatchVehicle {
  id: string;
  driverName: string;
  stationTarget: string;
  zone: string;
  status: "MENUNJU LOKASI" | "SEDANG MEMUAT" | "SELESAI" | "SIAGA";
  etaMinutes: number;
  capacityTon: number;
  currentLoadTon: number;
  coords: { x: number; y: number };
}

interface ComprehensiveLog {
  id: string;
  timestamp: string;
  stationId: string;
  actor: string;
  type: "SETORAN" | "PENJEMPUTAN" | "PERINGATAN_BAHAYA" | "KATUP_DARURAT";
  details: string;
  badgeColor: string;
}

const INITIAL_VEHICLES: DispatchVehicle[] = [
  {
    id: "TRUK-DLH-01",
    driverName: "I Made Sukadana",
    stationTarget: "Stasiun Kayumas (01)",
    zone: "Denpasar Timur",
    status: "MENUNJU LOKASI",
    etaMinutes: 12,
    capacityTon: 2.5,
    currentLoadTon: 1.8,
    coords: { x: 42, y: 38 },
  },
  {
    id: "TRUK-DLH-02",
    driverName: "I Nyoman Wira",
    stationTarget: "Stasiun Sanur (02)",
    zone: "Denpasar Selatan",
    status: "SEDANG MEMUAT",
    etaMinutes: 0,
    capacityTon: 3.0,
    currentLoadTon: 2.6,
    coords: { x: 74, y: 55 },
  },
  {
    id: "TRUK-DLH-03",
    driverName: "I Ketut Ariawan",
    stationTarget: "Stasiun Seminyak (03)",
    zone: "Kuta / Badung",
    status: "SIAGA",
    etaMinutes: 45,
    capacityTon: 2.0,
    currentLoadTon: 0.0,
    coords: { x: 22, y: 68 },
  },
];

const WEEKLY_STATS = [
  { day: "Senin", organicKg: 42, inorganicKg: 85 },
  { day: "Selasa", organicKg: 50, inorganicKg: 78 },
  { day: "Rabu", organicKg: 38, inorganicKg: 95 },
  { day: "Kamis", organicKg: 62, inorganicKg: 110 },
  { day: "Jumat", organicKg: 75, inorganicKg: 130 },
  { day: "Sabtu", organicKg: 95, inorganicKg: 165 },
  { day: "Minggu", organicKg: 120, inorganicKg: 180 },
];

const INITIAL_AUDIT_LOGS: ComprehensiveLog[] = [
  {
    id: "LOG-9021",
    timestamp: "10:42:15",
    stationId: "BALI-ECO-01",
    actor: "I Wayan Sudiarta (Warga)",
    type: "SETORAN",
    details: "Setoran 1.4 kg botol plastik PET anorganik. Poin bertambah +168.",
    badgeColor: "border-[#015186]/40 bg-[#015186]/10 text-[#015186]",
  },
  {
    id: "LOG-8812",
    timestamp: "10:35:00",
    stationId: "BALI-ECO-01",
    actor: "Sistem Logistik Otomatis",
    type: "PENJEMPUTAN",
    details: "Wadah mencapai 84%. Penjemputan TRUK-DLH-01 dipanggil otomatis.",
    badgeColor: "border-[#015186]/40 bg-[#015186]/10 text-[#015186]",
  },
  {
    id: "LOG-3301",
    timestamp: "09:58:22",
    stationId: "BALI-ECO-02",
    actor: "Sensor Pintar AI",
    type: "PERINGATAN_BAHAYA",
    details: "Kadar gas metana naik menjadi 380 PPM. Status siaga kuning.",
    badgeColor: "border-amber-600/40 bg-amber-50 text-amber-900",
  },
  {
    id: "LOG-0019",
    timestamp: "09:12:04",
    stationId: "BALI-ECO-03",
    actor: "Petugas Banjar",
    type: "KATUP_DARURAT",
    details: "Uji rutin katup pemutus oksigen berhasil. Respon aktuasi 380 milidetik.",
    badgeColor: "border-[#1d1c19]/30 bg-[#e7e5df] text-[#1d1c19]",
  },
  {
    id: "LOG-9020",
    timestamp: "08:45:11",
    stationId: "BALI-ECO-02",
    actor: "Ni Luh Putu Rai (Warga)",
    type: "SETORAN",
    details: "Setoran 3.2 kg sisa canang organik untuk kompos. Poin bertambah +160.",
    badgeColor: "border-green-600/40 bg-green-50 text-green-800",
  },
];

export default function HistoryLogisticsPage() {
  const [filterType, setFilterType] = useState<string>("SEMUA");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vehicles, setVehicles] = useState<DispatchVehicle[]>(INITIAL_VEHICLES);
  const [logs, setLogs] = useState<ComprehensiveLog[]>(INITIAL_AUDIT_LOGS);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [dispatchPending, setDispatchPending] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("10:45 WITA");

  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WITA"
    );
  }, []);

  const filteredLogs = logs
    .filter((l) => (filterType === "SEMUA" ? true : l.type === filterType))
    .filter(
      (l) =>
        !searchQuery.trim() ||
        l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.stationId.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleRequestPickup = () => {
    setDispatchPending(true);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(80);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      const newVehicle: DispatchVehicle = {
        id: "TRUK-DLH-CADANGAN",
        driverName: "Regu Cadangan DLH",
        stationTarget: "Stasiun Kayumas (01)",
        zone: "Denpasar Timur",
        status: "MENUNJU LOKASI",
        etaMinutes: 18,
        capacityTon: 4.0,
        currentLoadTon: 0.2,
        coords: { x: 50, y: 25 },
      };

      const newLog: ComprehensiveLog = {
        id: "REQ-" + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toLocaleTimeString(),
        stationId: "BALI-ECO-01",
        actor: "Pengurus Banjar (1-Klik)",
        type: "PENJEMPUTAN",
        details: "Permintaan penjemputan manual disetujui DLH Bali. Truk cadangan dikerahkan.",
        badgeColor: "border-[#015186]/40 bg-[#015186]/10 text-[#015186]",
      };

      setVehicles((prev) => [newVehicle, ...prev]);
      setLogs((prev) => [newLog, ...prev]);
      setSelectedTruckId(newVehicle.id);
      setDispatchPending(false);
      setDispatchSuccess(true);
      playSuccessChime();
      setTimeout(() => setDispatchSuccess(false), 5000);
    }, 600);
  };

  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `laporan-ecosort-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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

      {/* ----- TOAST NOTIFICATION (SYMMETRICAL) ----- */}
      {dispatchSuccess && (
        <aside
          role="status"
          className="sticky top-0 inset-x-0 z-40 bg-emerald-700 text-white py-2.5 px-4 sm:px-6 lg:px-8 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="size-4" />
          <span>Truk cadangan DLH berhasil dipanggil ke Stasiun Kayumas!</span>
        </aside>
      )}

      {/* ----- MAIN WORKSPACE (SEIMBANG & SYMMETRICAL) ----- */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <header className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-gt-mono text-[11px] text-[#015186] font-semibold uppercase tracking-wider mb-1">
              <span className="size-2 rounded-full bg-[#1d1c19]" />
              <span>DISPATCH LOGISTIK &bull; DINAS LINGKUNGAN HIDUP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
              Pemantauan Armada &amp; Setoran Sampah
            </h1>
          </div>

          <div className="flex items-center gap-3 font-gt-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1d1c19]/15 bg-[#fbfbfa]">
              <Radio className="size-3.5 text-emerald-600 animate-pulse" />
              <span className="text-[11px] text-[#55534c]">Pembaruan: {lastUpdated}</span>
            </div>

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
          {/* ----- KOLOM KIRI (6/12 ARMADA & PREDIKSI) ----- */}
          <div className="lg:col-span-6 space-y-6">
            {/* 1-CLICK DISPATCH CARD */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-3 font-gt-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-[#015186]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1d1c19]">
                    Panggilan Armada Truk DLH Darurat
                  </span>
                </div>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-600/30 font-bold uppercase">
                  Siaga 1-Klik
                </span>
              </div>

              <p className="text-xs text-[#55534c] leading-relaxed">
                Panggil armada penjemputan tambahan saat lonjakan sampah canang upakara atau pasca upacara adat di banjar.
              </p>

              <button
                onClick={handleRequestPickup}
                disabled={dispatchPending}
                className="w-full bg-[#015186] hover:bg-[#003d66] text-white py-3.5 px-4 text-xs font-bold uppercase tracking-wider min-h-[48px] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Send className="size-4" />
                <span>
                  {dispatchPending ? "Menghubungi Pool Armada DLH..." : "Panggil Truk DLH Sekarang"}
                </span>
              </button>
            </div>

            {/* AI FORECASTING CARD */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-3 font-gt-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#015186]" />
                  <span className="text-[10px] font-bold uppercase text-[#015186] tracking-wider">
                    Prediksi Laju Kapasitas (Vision &amp; Sensor)
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 border border-amber-600/40 bg-amber-50 text-amber-950 font-bold uppercase">
                  Laju Cepat
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#1d1c19] tracking-tight">
                Wadah Diperkirakan Penuh: 15:30 WITA
              </h3>

              <p className="text-xs text-[#55534c] leading-relaxed">
                Akumulasi rata-rata 18.4 kg/jam di Stasiun Kayumas. Kompartemen anorganik diproyeksikan melampaui batas aman 84% dalam <strong>3 jam 20 menit</strong>.
              </p>

              <div className="pt-2 border-t border-[#1d1c19]/10 flex justify-between text-[10px] text-[#84827a]">
                <span>Lokasi: TPST Banjar Kayumas</span>
                <span className="text-[#015186] font-bold">Akurasi Model: 94.8%</span>
              </div>
            </div>

            {/* STATUS FLEET TRUCKS */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-[#1d1c19]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1d1c19]">
                    Status Armada Truk Beroperasi ({vehicles.length})
                  </span>
                </div>
                <span className="text-[10px] text-[#84827a]">Klik untuk Detail</span>
              </div>

              <div className="space-y-3">
                {vehicles.map((v, idx) => {
                  const loadPercent = Math.round((v.currentLoadTon / v.capacityTon) * 100);
                  const isSelected = selectedTruckId === v.id;
                  return (
                    <div
                      key={v.id + idx}
                      onClick={() => setSelectedTruckId(isSelected ? null : v.id)}
                      className={`border p-4 space-y-3 cursor-pointer transition shadow-2xs active:scale-98 ${
                        isSelected
                          ? "border-[#015186] bg-blue-50/50 ring-1 ring-[#015186]"
                          : "border-[#1d1c19]/15 bg-[#fbfbfa] hover:border-[#1d1c19]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-[#1d1c19] block">{v.id}</span>
                          <span className="text-[10px] text-[#84827a]">
                            Sopir: {v.driverName} &bull; {v.zone}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 font-bold uppercase border ${
                            v.status === "MENUNJU LOKASI"
                              ? "border-[#015186] bg-[#015186] text-white"
                              : v.status === "SEDANG MEMUAT"
                              ? "border-amber-600 bg-amber-600 text-white"
                              : "border-[#1d1c19]/20 bg-[#e7e5df] text-[#55534c]"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[#55534c]">
                          <span>Beban Muatan:</span>
                          <span className="font-bold">
                            {v.currentLoadTon} / {v.capacityTon} Ton ({loadPercent}%)\
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#1d1c19]/10">
                          <div
                            style={{ width: `${loadPercent}%` }}
                            className="h-full bg-[#1d1c19] transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] text-[#84827a] pt-1 border-t border-[#1d1c19]/10">
                        <span>Tujuan: {v.stationTarget}</span>
                        <span className="font-bold text-[#1d1c19]">
                          ETA: {v.etaMinutes > 0 ? `${v.etaMinutes} menit` : "Tiba di Lokasi"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ----- KOLOM KANAN (6/12 GRAFIK & AUDIT LOGS) ----- */}
          <div className="lg:col-span-6 space-y-6">
            {/* WEEKLY RECYCLING VOLUME GRAPH (INTERACTIVE) */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono">
              <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#015186]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Volume Pemilahan Mingguan (Kg)
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
                  const orgHeight = Math.min(100, Math.max(12, (stat.organicKg / 200) * 100));
                  const inorgHeight = Math.min(100, Math.max(12, (stat.inorganicKg / 200) * 100));
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
                          title={`Organik: ${stat.organicKg} kg`}
                        />
                        <div
                          style={{ height: `${inorgHeight}%` }}
                          className="flex-1 bg-[#1d1c19] group-hover:bg-[#015186]"
                          title={`Anorganik: ${stat.inorganicKg} kg`}
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
                    Hari {WEEKLY_STATS[selectedDayIdx].day}: Organik <strong>{WEEKLY_STATS[selectedDayIdx].organicKg} kg</strong> &bull; Anorganik <strong>{WEEKLY_STATS[selectedDayIdx].inorganicKg} kg</strong>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold">
                    Total: {WEEKLY_STATS[selectedDayIdx].organicKg + WEEKLY_STATS[selectedDayIdx].inorganicKg} kg
                  </span>
                </div>
              )}
            </div>

            {/* AUDIT LOG TRAIL STREAM WITH SEARCH */}
            <div className="bg-white/90 border border-[#1d1c19]/15 p-6 backdrop-blur-sm shadow-xs space-y-4 font-gt-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1d1c19]/10 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#55534c]" />
                  <span className="font-bold uppercase tracking-wider text-[#1d1c19]">
                    Buku Audit Transaksi ({filteredLogs.length})
                  </span>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 text-[10px]">
                  {["SEMUA", "SETORAN", "PENJEMPUTAN", "PERINGATAN_BAHAYA"].map((cat) => (
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

              {/* SEARCH FILTER INPUT */}
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
