"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatbotWidget from "@/components/warga/chatbot-widget";

export default function WargaPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("10000");
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [submittingWdr, setSubmittingWdr] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push("/login");
        return;
      }
      setUser(meData.user);

      const res = await fetch("/api/withdrawals");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setLedger(data.ledger || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWdr(true);
    setMsg(null);

    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          notes: "Penarikan tunai lewat kasir Banjar",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan penarikan");

      setMsg({ text: "Pengajuan penarikan berhasil dikirim. Menunggu verifikasi petugas banjar." });
      setWithdrawModal(false);
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.message, error: true });
    } finally {
      setSubmittingWdr(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="font-gt-mono text-xs uppercase tracking-widest text-[#55534c] animate-pulse">
          MEMUAT BUKU BESAR SALDO WARGA...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24 font-sans bg-[#f2f1ed]">
      {/* Header */}
      <header className="border-b border-[#1d1c19]/15 px-4 py-4 bg-white sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <span className="font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase block">
              PORTAL NASABAH BANJAR
            </span>
            <h1 className="text-base font-bold text-[#1d1c19]">{user?.name}</h1>
          </div>
          <span className="text-[10px] font-gt-mono border border-[#1d1c19] px-2 py-0.5">
            WARGA
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {msg && (
          <div
            className={`p-3 text-xs font-mono border ${
              msg.error
                ? "bg-red-50 border-red-500 text-red-900"
                : "bg-emerald-50 border-emerald-500 text-emerald-900"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* SALDO CARD (THUMB-FRIENDLY ACTION) */}
        <div className="bg-[#1d1c19] text-[#f2f1ed] p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-gt-mono text-xs text-[#84827a] tracking-wider uppercase">
              SALDO BANK SAMPAH AKTIF
            </span>
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>

          <div>
            <span className="text-3xl font-bold font-mono tracking-tight">
              Rp{balance.toLocaleString("id-ID")}
            </span>
            <p className="text-xs text-[#84827a] mt-1 font-mono">
              Terhubung ke buku kas Banjar Kayumas Kaja
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setWithdrawModal(true)}
              className="w-full min-h-[44px] bg-[#f2f1ed] text-[#1d1c19] font-bold text-xs uppercase tracking-wider hover:bg-white active:scale-95 transition cursor-pointer"
            >
              Ajukan Penarikan / Tukar Saldo →
            </button>
          </div>
        </div>

        {/* LEDGER TRANSACTIONS HISTORY */}
        <section className="bg-white border border-[#1d1c19]/15 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1d1c19]/10 pb-2">
            <span className="font-gt-mono text-xs font-bold uppercase text-[#1d1c19]">
              Riwayat Buku Kas & Setoran
            </span>
            <span className="text-[10px] font-mono text-[#84827a]">
              {ledger.length} Transaksi
            </span>
          </div>

          {ledger.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#55534c]">
              Belum ada riwayat setoran sampah. Bawa sampah terpilah ke stasiun terdekat!
            </div>
          ) : (
            <div className="divide-y divide-[#1d1c19]/10">
              {ledger.map((item) => {
                const isDeposit = item.type === "DEPOSIT";
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-[#1d1c19] block">
                        {item.description}
                      </span>
                      <span className="text-[10px] text-[#84827a] font-mono">
                        {new Date(item.createdAt).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-bold font-mono text-sm block ${
                          isDeposit ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {isDeposit ? "+" : ""}
                        Rp{item.amount.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[9px] font-mono uppercase bg-zinc-100 px-1 py-0.5">
                        {item.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AI WASTE EDUCATION CHATBOT WIDGET */}
        <ChatbotWidget />
      </main>

      {/* WITHDRAWAL MODAL */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#1d1c19] p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm uppercase font-gt-mono">Tukar / Cairkan Saldo</h3>
              <button onClick={() => setWithdrawModal(false)} className="text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleRequestWithdrawal} className="space-y-3 text-xs">
              <p className="text-[#55534c]">
                Saldo saat ini: <strong>Rp{balance.toLocaleString("id-ID")}</strong>
              </p>

              <div>
                <label className="block text-[#55534c] mb-1 font-mono uppercase text-[10px]">
                  Nominal Penarikan (Rp)
                </label>
                <input
                  type="number"
                  step="5000"
                  min="5000"
                  max={balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full h-10 px-3 border border-[#1d1c19] text-base font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => setWithdrawAmount("10000")}
                  className="py-1 border border-zinc-400 hover:border-black"
                >
                  10.000
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount("25000")}
                  className="py-1 border border-zinc-400 hover:border-black"
                >
                  25.000
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(balance))}
                  className="py-1 border border-zinc-400 hover:border-black"
                >
                  Semua
                </button>
              </div>

              <button
                type="submit"
                disabled={submittingWdr || Number(withdrawAmount) > balance}
                className="w-full min-h-[44px] bg-[#1d1c19] text-white uppercase font-bold tracking-wider hover:bg-black transition cursor-pointer disabled:opacity-50 mt-3"
              >
                {submittingWdr ? "Mengajukan..." : "Kirim Pengajuan ✓"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
