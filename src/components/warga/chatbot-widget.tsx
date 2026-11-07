"use client";

import { useState } from "react";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Om Swastyastu! Saya asisten pintar pemilahan sampah Banjar EcoSort. Tanyakan cara memilah canang, botol plastik, atau jadwal buang sampah!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply || "Maaf, terjadi kendala respon." }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Koneksi terganggu. Silakan tanyakan kembali sesaat lagi." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-[#1d1c19]/15 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <span className="font-gt-mono uppercase font-bold text-xs text-[#1d1c19] block">
              Tanya Asisten Pilah Sampah Bali
            </span>
            <span className="text-[10px] text-[#55534c]">
              Edukasi canang, sampah upakara & daur ulang
            </span>
          </div>
        </div>
        <span className="font-mono text-xs font-bold">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-[#1d1c19]/10 p-4 space-y-3 bg-[#fbfbfa]">
          <div className="h-60 overflow-y-auto space-y-2 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-sm max-w-[85%] ${
                  m.sender === "user"
                    ? "ml-auto bg-[#1d1c19] text-white"
                    : "bg-white border border-[#1d1c19]/15 text-[#1d1c19]"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="p-2 bg-white border text-[11px] text-[#84827a] animate-pulse">
                EcoSort AI sedang mengetik...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: Canang bekas masuk jenis apa?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-10 px-3 text-xs border border-[#1d1c19]/30 bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 h-10 bg-[#1d1c19] text-white text-xs font-bold uppercase hover:bg-black transition cursor-pointer"
            >
              Kirim
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
