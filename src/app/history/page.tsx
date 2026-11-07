"use client";

import { useState, useEffect } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import { playSuccessChime } from "@/lib/audio-alert";

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
  const [vehicles, setVehicles] = useState<DispatchVehicle[]>(INITIAL_VEHICLES);
  const [logs, setLogs] = useState<ComprehensiveLog[]>(INITIAL_AUDIT_LOGS);
  const [dispatchPending, setDispatchPending] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [activeDay, setActiveDay] = useState(WEEKLY_STATS[WEEKLY_STATS.length - 1]);
  const [lastUpdated, setLastUpdated] = useState("10:45 WITA");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WITA");
  }, []);

  const filteredLogs =
    filterType === "SEMUA"
      ? logs
      : logs.filter((l) => l.type === filterType);

  const handleRequestPickup = () => {
    setDispatchPending(true);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(80);
      } catch {}
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
      setDispatchPending(false);
      setDispatchSuccess(true);
      playSuccessChime();
      setTimeout(() => setDispatchSuccess(false), 5000);
    }, 600);
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

      {/* Success Notification Banner */}
      {dispatchSuccess && (
        <div
          role="status"
          className="sticky top-0 inset-x-0 z-40 bg-emerald-700 text-white py-2.5 px-4 text-xs font-gt-mono font-bold text-center shadow-md animate-fade-in"
        >
          ✓ Truk cadangan DLH berhasil dipanggil ke Stasiun Kayumas!
        </div>
      )}

      {/* MAIN CONTAINER: Optimized for 360-390px, expands on tablet/desktop */}
      <div className="relative z-10 pt-20 sm:pt-28 pb-32 px-4 sm:px-6 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-4">
        
        {/* Mobile Header Card */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2.5 mb-2.5">
            <span className="text-[10px] font-gt-mono text-[#015186] font-bold uppercase tracking-wider">
              LOGISTIK DINAS LINGKUNGAN HIDUP
            </span>
            <span className="text-[10px] font-gt-mono text-[#84827a]">
              Diperbarui: {lastUpdated}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1c19]">
            Pemantauan Armada &amp; Setoran
          </h1>
          <p className="text-xs text-[#55534c] mt-1 leading-relaxed">
            Lacak posisi armada truk penjemputan DLH dan catatan transaksi setoran sampah desa adat.
          </p>

          {/* Quick Action Button for Export */}
          <div className="mt-3 pt-3 border-t border-[#1d1c19]/10 flex gap-2">
            <button
              onClick={() => {
                const dataStr =
                  "data:text/json;charset=utf-8," +
                  encodeURIComponent(JSON.stringify(logs, null, 2));
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute(
                  "download",
                  `laporan-ecosort-${Date.now()}.json`
                );
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="flex-1 py-3 px-3 text-xs font-bold uppercase border border-[#1d1c19]/25 bg-white text-[#1d1c19] active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <span>Unduh Catatan (JSON)</span>
              <span>↓</span>
            </button>
          </div>
        </div>

        {/* 1-CLICK DISPATCH ARMADA DLH (Prominent Thumb-zone Button) */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-gt-mono text-[#1d1c19] uppercase">
              Panggilan Truk Darurat Banjar
            </span>
            <span className="text-[10px] font-gt-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-600/30 font-bold">
              SIAP JALAN
            </span>
          </div>

          <p className="text-xs text-[#55534c] leading-relaxed">
            Tekan bila ada tumpukan limbah upakara atau sisa acara adat yang membutuhkan armada penjemputan segera.
          </p>

          <button
            onClick={handleRequestPickup}
            disabled={dispatchPending}
            className="w-full bg-[#015186] hover:bg-[#003d66] text-white py-3.5 px-4 text-xs font-bold uppercase tracking-wider min-h-[52px] active:scale-98 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {dispatchPending ? (
              <span>Menghubungi Armada Truk DLH...</span>
            ) : (
              <span>Panggil Truk DLH Sekarang (1-Klik)</span>
            )}
          </button>
        </div>

        {/* AI Forecasting Card (Penuh Jam 15:30 WITA) */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-gt-mono uppercase font-bold text-[#015186]">
              PREDIKSI KECERDASAN BUATAN (AI)
            </span>
            <span className="text-[10px] px-2 py-0.5 border border-amber-600/40 bg-amber-50 text-amber-950 font-bold uppercase">
              Laju Cepat
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-[#1d1c19]">
            Wadah Diperkirakan Penuh: 15:30 WITA
          </h3>

          <p className="text-xs text-[#55534c] leading-relaxed">
            Laju rata-rata 18.4 kg/jam di Banjar Kayumas. Wadah anorganik stasiun BALI-ECO-01 diprediksi mencapai batas aman 84% dalam <strong>3 jam 20 menit</strong>.
          </p>

          <div className="pt-2 border-t border-[#1d1c19]/10 flex justify-between text-[10px] font-gt-mono text-[#84827a]">
            <span>Lokasi: Stasiun 01 (Kayumas)</span>
            <span className="text-[#015186] font-bold">Akurasi: 94.8%</span>
          </div>
        </div>

        {/* Status Armada Truk DLH (Vertical Cards for Mobile) */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <h3 className="text-xs font-bold font-gt-mono uppercase text-[#1d1c19]">
              Status Armada Pengangkut ({vehicles.length})
            </h3>
            <span className="text-[10px] font-gt-mono text-[#015186]">
              Real-Time GPS
            </span>
          </div>

          <div className="space-y-2.5 font-gt-mono">
            {vehicles.map((v, idx) => (
              <div
                key={v.id + idx}
                className="border border-[#1d1c19]/15 bg-[#f2f1ed]/40 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1d1c19]">{v.id}</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded ${
                      v.status === "MENUNJU LOKASI"
                        ? "bg-[#015186] text-white"
                        : v.status === "SEDANG MEMUAT"
                        ? "bg-amber-600 text-white"
                        : "bg-[#e7e5df] text-[#55534c]"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                <div className="text-xs space-y-0.5 text-[#55534c]">
                  <div className="flex justify-between">
                    <span className="text-[#84827a]">Sopir:</span>
                    <span className="font-semibold text-[#1d1c19]">{v.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#84827a]">Tujuan:</span>
                    <span className="font-semibold text-[#015186]">{v.stationTarget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#84827a]">Estimasi:</span>
                    <span className="font-bold text-[#1d1c19]">
                      {v.etaMinutes === 0 ? "Tiba di Lokasi" : `${v.etaMinutes} Menit`}
                    </span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="pt-1.5 border-t border-[#1d1c19]/10">
                  <div className="flex justify-between text-[10px] text-[#84827a] mb-1">
                    <span>Muatan: {v.currentLoadTon} / {v.capacityTon} Ton</span>
                    <span className="font-bold">{Math.round((v.currentLoadTon / v.capacityTon) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#e7e5df] overflow-hidden">
                    <div
                      className="h-full bg-[#015186] transition-all"
                      style={{ width: `${Math.min(100, (v.currentLoadTon / v.capacityTon) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buku Besar Transaksi (Vertical Cards on Mobile, NO WIDE TABLE) */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <div>
              <span className="text-[10px] font-gt-mono uppercase text-[#015186] font-bold block">
                AUDIT LOGS
              </span>
              <h3 className="text-xs font-bold uppercase text-[#1d1c19]">
                Catatan Transaksi &amp; Peristiwa
              </h3>
            </div>
            <span className="text-[10px] font-gt-mono text-[#84827a]">
              {filteredLogs.length} Entri
            </span>
          </div>

          {/* Touch-Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-gt-mono">
            {[
              { key: "SEMUA", label: "Semua" },
              { key: "SETORAN", label: "Setoran" },
              { key: "PENJEMPUTAN", label: "Penjemputan" },
              { key: "PERINGATAN_BAHAYA", label: "Bahaya" },
              { key: "KATUP_DARURAT", label: "Katup" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-2 text-xs font-bold uppercase whitespace-nowrap min-h-[44px] transition active:scale-95 ${
                  filterType === f.key
                    ? "bg-[#1d1c19] text-white"
                    : "bg-[#f2f1ed] text-[#55534c] border border-[#1d1c19]/15"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* MOBILE LIST: Vertical stacked cards (Never breaks 360-390px screens) */}
          <div className="space-y-2">
            {filteredLogs.map((item) => (
              <div
                key={item.id}
                className="p-3 border border-[#1d1c19]/15 bg-[#f2f1ed]/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-gt-mono font-bold text-xs text-[#1d1c19]">
                    {item.id}
                  </span>
                  <span className={`text-[9px] font-gt-mono px-2 py-0.5 font-bold uppercase border ${item.badgeColor}`}>
                    {item.type.replace("_", " ")}
                  </span>
                </div>

                <p className="text-xs text-[#33322d] font-gt-sans leading-snug">
                  {item.details}
                </p>

                <div className="flex items-center justify-between text-[10px] font-gt-mono text-[#84827a] pt-1 border-t border-[#1d1c19]/10">
                  <span>{item.actor}</span>
                  <span>{item.timestamp} &middot; {item.stationId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
