"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterBanjarPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    kode: "",
    namaBanjar: "",
    kecamatan: "Denpasar Selatan",
    kabupaten: "Denpasar",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register-banjar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between px-4 py-8 sm:px-6 max-w-lg mx-auto">
      <div>
        <div className="font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase mb-2">
          PROGRAM KEMITRAAN // BALI SMART SOCIETY
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1c19]">
          Daftarkan Banjar Anda
        </h1>
        <p className="mt-2 text-sm text-[#55534c]">
          Aktifkan stasiun IoT pemilah sampah terpadu & pembukuan digital untuk banjar adat.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-500 text-red-800 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-sans text-xs">
          <div className="border border-[#1d1c19]/15 p-4 bg-white space-y-3">
            <span className="font-gt-mono uppercase font-bold text-[#84827a] block text-[10px]">
              DATA BANJAR ADAT
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                  Kode Banjar
                </label>
                <input
                  type="text"
                  required
                  placeholder="BJR-DPS-01"
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                  className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent font-mono"
                />
              </div>
              <div>
                <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                  Nama Banjar
                </label>
                <input
                  type="text"
                  required
                  placeholder="Banjar Sanur Kauh"
                  value={form.namaBanjar}
                  onChange={(e) => setForm({ ...form, namaBanjar: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={form.kecamatan}
                  onChange={(e) => setForm({ ...form, kecamatan: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
                />
              </div>
              <div>
                <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                  Kabupaten/Kota
                </label>
                <input
                  type="text"
                  value={form.kabupaten}
                  onChange={(e) => setForm({ ...form, kabupaten: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border border-[#1d1c19]/15 p-4 bg-white space-y-3">
            <span className="font-gt-mono uppercase font-bold text-[#84827a] block text-[10px]">
              AKUN ADMIN BANJAR PERDANA
            </span>
            <div>
              <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                Nama Lengkap Admin / Prajuru
              </label>
              <input
                type="text"
                required
                placeholder="I Ketut Arya"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                  Email Admin
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@banjar.id"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
                />
              </div>
              <div>
                <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={form.adminPhone}
                  onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block uppercase text-[10px] font-gt-mono text-[#55534c] mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-[#1d1c19]/30 bg-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#1d1c19] text-[#f2f1ed] text-xs font-semibold uppercase tracking-wider hover:bg-black active:scale-[0.99] transition cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? "Mendaftarkan..." : "Daftarkan Banjar & Mulai Demo →"}
          </button>
        </form>
      </div>

      <div className="pt-6 border-t border-[#1d1c19]/10 text-center text-xs text-[#55534c]">
        Sudah memiliki akun?{" "}
        <Link href="/login" className="font-bold underline text-[#1d1c19]">
          Masuk di Sini
        </Link>
      </div>
    </div>
  );
}
