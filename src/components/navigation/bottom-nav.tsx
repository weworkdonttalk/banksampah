"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { playSuccessChime } from "@/lib/audio-alert";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Beranda",
    shortLabel: "Beranda",
    icon: (active) => (
      <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/ops-hazard",
    label: "Deteksi Bahaya",
    shortLabel: "Bahaya",
    icon: (active) => (
      <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: "/circular-exchange",
    label: "Bursa Poin",
    shortLabel: "Bursa Poin",
    icon: (active) => (
      <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Logistik DLH",
    shortLabel: "Logistik",
    icon: (active) => (
      <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/login",
    label: "Akun Pengguna",
    shortLabel: "Akun",
    icon: (active) => (
      <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ name: "", email: "", banjar: "" });
  const [applySubmitted, setApplySubmitted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setShowApplyModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.name || !applyForm.email) return;
    setApplySubmitted(true);
    playSuccessChime();
    setTimeout(() => {
      setApplySubmitted(false);
      setShowApplyModal(false);
      setApplyForm({ name: "", email: "", banjar: "" });
    }, 2500);
  };

  return (
    <>
      {/* UNIVERSAL TOP HEADER (Desktop full links + 4-dot menu, mobile compact brand) */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#f2f1ed]/92 backdrop-blur-md border-b border-[#1d1c19]/15 px-3 sm:px-6 lg:px-8 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Brand Logo + 4-Dot Menu + Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer pointer-events-auto p-1"
              aria-label="Beranda EcoSort"
            >
              <svg
                viewBox="0 0 305 415"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 sm:h-8 w-auto text-[#1d1c19] transition-transform duration-200 group-hover:scale-105"
              >
                <path
                  d="M153.19 22.53C168.21 23.03 182.32 28.8 193.13 38.92C202.3 47.51 208.57 58.46 211.23 70.6C220.52 112.92 237.69 155.75 262.27 197.92C273.65 217.44 279.66 239.79 279.66 262.54C279.66 296.89 266.29 329.18 242.01 353.46C217.73 377.74 185.45 391.11 151.13 391.12L149.08 391.11C80.4 390.15 23.57 333.39 22.51 264.58C22.14 240.37 28.5 216.71 40.91 196.17C63.74 158.4 80.6 116 91.02 70.15C93.73 58.21 99.95 47.41 109.01 38.92C120.33 28.33 135.27 22.5 151.08 22.5C151.79 22.5 152.49 22.51 153.19 22.53Z"
                  stroke="currentColor"
                  strokeWidth="32"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col">
                <span className="font-flecha text-sm sm:text-base font-light italic leading-none text-[#1d1c19]">
                  EcoSort AS
                </span>
                <span className="font-gt-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-[#84827a]">
                  Bali Node &middot; 08°39′S
                </span>
              </div>
            </Link>

            {/* 4-Dot Architectural Menu Button */}
            <button
              type="button"
              aria-label="Buka Menu Navigasi"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 grid grid-cols-2 gap-[2.5px] border border-[#1d1c19]/15 rounded hover:bg-[#1d1c19]/5 transition-colors cursor-pointer active:scale-95 pointer-events-auto"
              title="Buka menu navigasi"
            >
              <span className="size-1.5 bg-[#1d1c19] block" />
              <span className="size-1.5 bg-[#1d1c19] block" />
              <span className="size-1.5 bg-[#1d1c19] block" />
              <span className="size-1.5 bg-[#1d1c19] block" />
            </button>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 font-gt-mono text-xs">
            {NAV_ITEMS.filter((item) => item.href !== "/login").map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-gt-mono uppercase tracking-wider rounded transition-colors ${
                    active
                      ? "bg-[#1d1c19] text-[#f2f1ed] font-bold shadow-xs"
                      : "text-[#55534c] hover:text-[#1d1c19] hover:bg-[#1d1c19]/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <Link
              href="/login"
              className={`border rounded px-2.5 sm:px-3 py-1.5 text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                pathname === "/login"
                  ? "border-[#1d1c19] bg-[#1d1c19] text-white"
                  : "border-[#1d1c19]/25 bg-white/90 hover:bg-white text-[#1d1c19]"
              }`}
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hidden sm:inline">Masuk</span>
            </Link>
            <button
              onClick={() => setShowApplyModal(true)}
              className="bg-[#1d1c19] text-white rounded px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-[#33322d] shadow-sm active:scale-95"
            >
              <span className="hidden sm:inline">Daftar Banjar</span>
              <span className="sm:hidden">Daftar</span>
              <span className="size-4 border border-white/30 rounded grid place-items-center text-[10px]">
                →
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Chapter Menu Overlay (when 4-dot button clicked) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0a1628]/95 backdrop-blur-md flex items-center justify-center p-6 animate-crossfade"
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className="flex flex-col items-center w-full max-w-md space-y-4 font-gt-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/50 block mb-2">
              MENU UTAMA APLIKASI
            </span>

            <div className="w-full divide-y divide-white/10 border-y border-white/10">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between py-4 px-2 group transition-colors ${
                      active ? "text-white font-bold" : "text-white/70 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">{item.icon(active)}</span>
                      <span className="text-lg font-medium tracking-tight font-gt-sans">{item.label}</span>
                    </div>
                    <span className="text-xs text-white/40 group-hover:text-white">
                      Buka →
                    </span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="mt-6 text-xs uppercase text-white/60 hover:text-white border border-white/20 px-4 py-2 cursor-pointer active:scale-95"
            >
              Tutup Menu [ESC]
            </button>
          </nav>
        </div>
      )}

      {/* MOBILE BOTTOM TAB BAR (Thumb-zone priority, safe area inset, min 48px touch targets) */}
      <nav
        aria-label="Navigasi Bawah Ponsel"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#f2f1ed]/98 backdrop-blur-md border-t border-[#1d1c19]/20 px-1 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-0.5 rounded-lg transition-all active:scale-90 ${
                  active
                    ? "text-[#1d1c19] font-bold"
                    : "text-[#84827a] hover:text-[#1d1c19]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <div className={`p-1 rounded-md transition-colors ${active ? "bg-[#1d1c19]/10 text-[#1d1c19]" : ""}`}>
                  {item.icon(active)}
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 leading-none ${active ? "font-bold text-[#1d1c19]" : "font-normal"}`}>
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Pendaftaran Banjar Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-crossfade">
          <div className="bg-[#f2f1ed] text-[#1d1c19] w-full max-w-lg p-6 sm:p-8 rounded-t-2xl sm:rounded-none shadow-2xl border border-[#1d1c19]/20 relative max-h-[90dvh] overflow-y-auto">
            {/* Sheet Handle on mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-[#1d1c19]/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-gt-mono text-[#015186] font-bold uppercase tracking-wider block">
                  PROGRAM PERCONTOHAN // BALI SMART VILLAGE
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1d1c19] mt-0.5">
                  Daftarkan Banjar Anda
                </h3>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-[#84827a] hover:text-[#1d1c19] text-2xl font-bold cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Tutup formulir"
              >
                ✕
              </button>
            </div>

            {applySubmitted ? (
              <div className="border border-green-600/40 bg-green-50 p-6 text-center space-y-2">
                <span className="text-base font-bold text-green-900 block">
                  Permohonan Berhasil Dikirim
                </span>
                <p className="text-xs text-green-800 leading-relaxed font-gt-sans">
                  Tim teknis EcoSort akan menghubungi pengurus banjar dalam 1x24 jam untuk survei lokasi dan pemasangan stasiun.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4 text-xs font-gt-sans">
                <div>
                  <label className="text-xs font-semibold text-[#1d1c19] block mb-1.5">
                    Nama Lengkap Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    required
                    value={applyForm.name}
                    onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                    placeholder="Contoh: I Ketut Sudira"
                    className="w-full bg-white border border-[#1d1c19]/20 p-3 text-base text-[#1d1c19] rounded-none focus:outline-none focus:border-[#015186]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1d1c19] block mb-1.5">
                    Alamat Email Aktif
                  </label>
                  <input
                    type="email"
                    required
                    inputMode="email"
                    autoComplete="email"
                    value={applyForm.email}
                    onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                    placeholder="nama@banjar.desa.id"
                    className="w-full bg-white border border-[#1d1c19]/20 p-3 text-base text-[#1d1c19] rounded-none focus:outline-none focus:border-[#015186]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1d1c19] block mb-1.5">
                    Nama Banjar / Desa Adat
                  </label>
                  <input
                    type="text"
                    required
                    value={applyForm.banjar}
                    onChange={(e) => setApplyForm({ ...applyForm, banjar: e.target.value })}
                    placeholder="Contoh: Banjar Kayumas Kaja, Denpasar"
                    className="w-full bg-white border border-[#1d1c19]/20 p-3 text-base text-[#1d1c19] rounded-none focus:outline-none focus:border-[#015186]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#1d1c19] text-white py-3.5 px-4 text-sm font-semibold tracking-wider uppercase min-h-[48px] active:scale-98 transition shadow-sm"
                  >
                    Kirim Pendaftaran
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
