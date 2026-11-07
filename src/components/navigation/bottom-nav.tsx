"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: (active: boolean) => React.ReactNode;
}

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setRole(d.user.role);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Dynamic nav items based on role
  const navItems: NavItem[] = [
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
      href: "/dashboard",
      label: "Monitoring IoT",
      shortLabel: "IoT",
      icon: (active) => (
        <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </svg>
      ),
    },
    {
      href: "/petugas",
      label: "Input Setoran",
      shortLabel: "Setoran",
      icon: (active) => (
        <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      ),
    },
    {
      href: "/warga",
      label: "Tabungan Warga",
      shortLabel: "Warga",
      icon: (active) => (
        <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      ),
    },
    {
      href: "/admin/laporan",
      label: "Laporan Banjar",
      shortLabel: "Laporan",
      icon: (active) => (
        <svg className="size-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1d1c19] text-[#f2f1ed] border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigasi Utama"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
                isActive ? "text-emerald-400 font-bold" : "text-[#84827a] hover:text-[#f2f1ed]"
              }`}
            >
              <div className="relative">
                {item.icon(isActive)}
                {isActive && (
                  <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
              <span className="text-[10px] font-gt-mono tracking-tight mt-1 line-clamp-1">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
