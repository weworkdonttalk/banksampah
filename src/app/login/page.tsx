"use client";

import Link from "next/link";
import { useState } from "react";
import PearCanvas from "@/components/webgl/pear-canvas";
import { playSuccessChime } from "@/lib/audio-alert";

type UserRole = "WARGA" | "PETUGAS" | "PRAJURU";

interface RoleConfig {
  id: UserRole;
  label: string;
  badge: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  pinLabel: string;
  defaultId: string;
  defaultName: string;
  defaultPin: string;
  targetUrl: string;
  targetLabel: string;
  description: string;
  inputMode: "tel" | "text";
}

const ROLES: Record<UserRole, RoleConfig> = {
  WARGA: {
    id: "WARGA",
    label: "Warga Banjar",
    badge: "NASABAH POIN",
    identifierLabel: "Nomor HP / NIK / ID Warga",
    identifierPlaceholder: "08123456789 atau WGR-DPS-8841",
    pinLabel: "PIN Keamanan (6 Angka)",
    defaultId: "WGR-DPS-8841",
    defaultName: "I Wayan Sudiarta",
    defaultPin: "123456",
    targetUrl: "/circular-exchange",
    targetLabel: "Buka Bursa Poin & Reward",
    description: "Cek saldo poin daur ulang, riwayat timbangan, dan tukar voucher listrik atau beras.",
    inputMode: "tel",
  },
  PETUGAS: {
    id: "PETUGAS",
    label: "Petugas Lapangan & DLH",
    badge: "OPERATOR SISTEM",
    identifierLabel: "Nomor Induk Petugas (NIP / ID Operator)",
    identifierPlaceholder: "Contoh: OP-DLH-01",
    pinLabel: "Kata Sandi Akun Petugas",
    defaultId: "OP-DLH-01",
    defaultName: "I Made Sukadana",
    defaultPin: "petugas2026",
    targetUrl: "/ops-hazard",
    targetLabel: "Buka Pusat Kendali Bahaya",
    description: "Pantau suhu wadah, konsentrasi gas metana, dan kendalikan katup pemutus oksigen (Choke Mode).",
    inputMode: "text",
  },
  PRAJURU: {
    id: "PRAJURU",
    label: "Prajuru Desa Adat",
    badge: "PENGURUS BANJAR",
    identifierLabel: "Kode Banjar Adat / Desa",
    identifierPlaceholder: "Contoh: BJR-KYM-01 (Banjar Kayumas)",
    pinLabel: "Kunci Akses Desa Adat",
    defaultId: "BJR-KYM-01",
    defaultName: "Prajuru Banjar Kayumas",
    defaultPin: "kayumas2026",
    targetUrl: "/history",
    targetLabel: "Buka Logistik Armada DLH",
    description: "Lihat ringkasan tonase sampah banjar, kas bagi hasil LPD, dan panggilan truk DLH 1-klik.",
    inputMode: "text",
  },
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("WARGA");
  const [identifier, setIdentifier] = useState(ROLES.WARGA.defaultId);
  const [password, setPassword] = useState(ROLES.WARGA.defaultPin);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{
    name: string;
    id: string;
    role: UserRole;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const activeConfig = ROLES[selectedRole];

  // Quick switch role and prefill demo credentials
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setIdentifier(ROLES[role].defaultId);
    setPassword(ROLES[role].defaultPin);
    setErrorMessage("");
    setLoggedInUser(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Harap masukkan nomor identitas dan kata sandi Anda.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setLoggedInUser({
        name: activeConfig.defaultName,
        id: identifier.trim(),
        role: selectedRole,
      });
      playSuccessChime();
    }, 380);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setErrorMessage("");
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

      {/* MAIN CONTAINER: Optimized for 360-390px, expands on tablet/desktop */}
      <div className="relative z-10 pt-20 sm:pt-28 pb-32 px-4 sm:px-6 max-w-md md:max-w-xl mx-auto space-y-4">
        
        {/* Header Breadcrumb Card */}
        <div className="bg-white/90 border border-[#1d1c19]/15 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5 font-gt-mono text-[10px] text-[#015186] font-semibold">
            <span className="size-2 rounded-full bg-[#015186] animate-pulse" />
            <span>PORTAL KEAMANAN &middot; SISTEM RESMI BALI</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1c19]">
            Masuk ke Layanan EcoSort
          </h1>
          <p className="text-xs text-[#55534c] mt-1 leading-relaxed">
            Portal masuk warga banjar, pengurus adat, dan petugas operasional kebersihan.
          </p>
        </div>

        {/* Main Login Card */}
        <div className="border border-[#1d1c19]/15 bg-white/95 backdrop-blur-md p-5 sm:p-7 shadow-xs">
          {loggedInUser ? (
            /* Logged-In Active State */
            <div className="space-y-4 animate-crossfade">
              <div className="border border-green-600/30 bg-green-50 p-4 text-center space-y-1">
                <span className="text-[10px] font-gt-mono text-green-800 font-bold uppercase tracking-wider block">
                  SESI TERVERIFIKASI // BERHASIL MASUK
                </span>
                <h2 className="text-lg font-bold text-green-950">
                  Selamat Datang, {loggedInUser.name}
                </h2>
                <p className="text-xs text-green-900 font-gt-mono">
                  ID: <strong>{loggedInUser.id}</strong> &middot; Peran: {ROLES[loggedInUser.role].label}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[#1d1c19] block uppercase font-gt-mono">
                  Menu Utama Peran Anda:
                </span>

                <Link
                  href={ROLES[loggedInUser.role].targetUrl}
                  className="w-full min-h-[52px] bg-[#015186] hover:bg-[#003d66] text-white py-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-sm active:scale-98"
                >
                  <span>{ROLES[loggedInUser.role].targetLabel}</span>
                  <span className="text-sm">&rarr;</span>
                </Link>

                <div className="grid grid-cols-2 gap-2 pt-1 font-gt-mono text-xs">
                  <Link
                    href="/ops-hazard"
                    className="border border-[#1d1c19]/20 bg-white hover:bg-[#f2f1ed] p-3 text-center font-semibold text-[#1d1c19] min-h-[46px] flex items-center justify-center"
                  >
                    Deteksi Bahaya
                  </Link>
                  <Link
                    href="/circular-exchange"
                    className="border border-[#1d1c19]/20 bg-white hover:bg-[#f2f1ed] p-3 text-center font-semibold text-[#1d1c19] min-h-[46px] flex items-center justify-center"
                  >
                    Bursa Poin
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1d1c19]/10 flex items-center justify-between text-xs">
                <span className="text-[#84827a] font-gt-mono text-[10px]">
                  Terhubung aman ke Node Bali
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[#b91c1c] font-bold hover:underline cursor-pointer min-h-[44px] flex items-center"
                >
                  Keluar dari Sesi
                </button>
              </div>
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Role Segmented Selector */}
              <div>
                <label className="text-xs font-bold uppercase font-gt-mono text-[#1d1c19] block mb-2">
                  Pilih Peran Pengguna:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#e7e5df]/60 border border-[#1d1c19]/15">
                  {(Object.keys(ROLES) as UserRole[]).map((r) => {
                    const isSelected = selectedRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleSelect(r)}
                        className={`py-2 px-1 text-center border transition-all cursor-pointer min-h-[46px] ${
                          isSelected
                            ? "border-[#1d1c19] bg-[#1d1c19] text-white font-bold shadow-xs"
                            : "border-transparent bg-transparent text-[#55534c]"
                        }`}
                      >
                        <span className="block text-[9px] font-gt-mono uppercase opacity-75">
                          {ROLES[r].badge}
                        </span>
                        <span className="block text-xs font-semibold truncate">
                          {ROLES[r].label.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#55534c] mt-2 leading-relaxed font-gt-sans">
                  {activeConfig.description}
                </p>
              </div>

              {/* Quick Fill Demo Shortcut (Touch >= 44px) */}
              <div className="border border-dashed border-[#1d1c19]/20 bg-[#f2f1ed]/80 p-2.5 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#55534c] font-gt-mono">
                  Uji Cepat: <strong>{activeConfig.defaultName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier(activeConfig.defaultId);
                    setPassword(activeConfig.defaultPin);
                  }}
                  className="px-3 py-2 text-xs font-bold uppercase bg-white border border-[#1d1c19]/25 hover:bg-[#1d1c19] hover:text-white transition cursor-pointer active:scale-95 min-h-[44px] flex items-center"
                >
                  Isi Otomatis
                </button>
              </div>

              {/* Inline Error Message */}
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-400 text-red-900 text-xs font-gt-mono font-bold"
                >
                  {errorMessage}
                </div>
              )}

              {/* Input: Identifier (Font size >= 16px to prevent iOS auto-zoom) */}
              <div>
                <label className="text-xs font-semibold text-[#1d1c19] block mb-1">
                  {activeConfig.identifierLabel}
                </label>
                <input
                  type="text"
                  inputMode={activeConfig.inputMode}
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={activeConfig.identifierPlaceholder}
                  className="w-full bg-white border border-[#1d1c19]/20 px-3.5 py-3 text-base text-[#1d1c19] font-gt-mono focus:outline-none focus:border-[#015186] min-h-[48px] rounded-none"
                />
              </div>

              {/* Input: Password / PIN (Font size >= 16px to prevent iOS auto-zoom) */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-semibold text-[#1d1c19]">
                    {activeConfig.pinLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#015186] font-semibold hover:underline cursor-pointer p-1 min-h-[44px] flex items-center"
                  >
                    {showPassword ? "Sembunyikan" : "Perlihatkan"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan sandi atau PIN"
                  className="w-full bg-white border border-[#1d1c19]/20 px-3.5 py-3 text-base text-[#1d1c19] font-gt-mono focus:outline-none focus:border-[#015186] min-h-[48px] rounded-none"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#55534c] min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-[#1d1c19]/30 text-[#015186]"
                  />
                  <span>Ingat sesi masuk di perangkat ini</span>
                </label>
              </div>

              {/* Submit Button (Thumb-friendly height >= 52px) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[52px] bg-[#1d1c19] text-[#f2f1ed] hover:bg-[#33322d] py-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Memverifikasi Identitas...</span>
                  ) : (
                    <span>Masuk Sebagai {activeConfig.label} &rarr;</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
