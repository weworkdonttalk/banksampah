"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterBanjarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f2f1ed] text-[#1d1c19] font-gt-mono text-xs">
      <div className="border border-[#1d1c19]/20 bg-white p-6 max-w-md w-full text-center space-y-3">
        <span className="text-[10px] uppercase font-bold text-[#015186]">Portal Terpadu EcoSort</span>
        <h1 className="text-lg font-bold text-[#1d1c19]">Mengalihkan ke Portal Masuk...</h1>
        <p className="text-[#55534c] text-[11px]">
          Pendaftaran banjar dan akses akun kini terintegrasi pada portal multi-peran.
        </p>
        <Link
          href="/login"
          className="inline-block mt-2 px-4 py-2 bg-[#1d1c19] text-white uppercase text-[10px] font-bold tracking-wider"
        >
          Buka Halaman Login &rarr;
        </Link>
      </div>
    </div>
  );
}
