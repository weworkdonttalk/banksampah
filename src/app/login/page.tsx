"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("password123");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal masuk");

      if (data.user.role === "WARGA") {
        router.push("/warga");
      } else if (data.user.role === "PETUGAS") {
        router.push("/petugas");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between px-4 py-8 sm:px-6 max-w-md mx-auto">
      <div>
        <div className="font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase mb-2">
          AUTENTIKASI SISTEM // BALI SMART SOCIETY
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
          Masuk ke EcoSort AI
        </h1>
        <p className="mt-2 text-sm text-[#55534c]">
          Portal pengawasan IoT & transaksi Bank Sampah Banjar.
        </p>

        {/* Quick Demo Acccount Selector */}
        <div className="mt-6 p-3 bg-white border border-[#1d1c19]/15 space-y-2">
          <span className="text-[10px] font-gt-mono uppercase tracking-wider text-[#84827a] block">
            AKUN DEMO CEPAT (1-KLIK)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@kayumas.banjar.id")}
              className="px-2 py-1.5 border border-[#1d1c19] text-[11px] font-medium hover:bg-[#1d1c19] hover:text-white transition text-center"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("petugas@kayumas.banjar.id")}
              className="px-2 py-1.5 border border-[#1d1c19] text-[11px] font-medium hover:bg-[#1d1c19] hover:text-white transition text-center"
            >
              Petugas
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("wayan@warga.id")}
              className="px-2 py-1.5 border border-[#1d1c19] text-[11px] font-medium hover:bg-[#1d1c19] hover:text-white transition text-center"
            >
              Warga
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-500 text-red-800 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-sans">
          <div>
            <label className="block text-xs font-gt-mono uppercase tracking-wider text-[#1d1c19] mb-1">
              Email Pengguna
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@banjar.id"
              className="w-full h-11 px-3 text-base border border-[#1d1c19]/30 bg-white focus:outline-none focus:border-[#1d1c19]"
            />
          </div>

          <div>
            <label className="block text-xs font-gt-mono uppercase tracking-wider text-[#1d1c19] mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3 text-base border border-[#1d1c19]/30 bg-white focus:outline-none focus:border-[#1d1c19]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#1d1c19] text-[#f2f1ed] text-xs font-semibold uppercase tracking-wider hover:bg-black active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk Sistem →"}
          </button>
        </form>
      </div>

      <div className="pt-6 border-t border-[#1d1c19]/10 text-center text-xs text-[#55534c]">
        Belum mendaftarkan banjar Anda?{" "}
        <Link href="/daftar-banjar" className="font-bold underline text-[#1d1c19]">
          Daftar Banjar Baru
        </Link>
      </div>
    </div>
  );
}
