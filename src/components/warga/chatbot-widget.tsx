"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Send, Sparkles } from "lucide-react";

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Om Swastyastu! Saya asisten pintar EcoSort. Tanyakan seputar pemilahan sampah upakara, canang, atau anorganik di Banjar.",
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
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply || "Maaf, terjadi kendala respon." },
      ]);
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
    /* ----- ASISTEN EDUKASI BANJAR ----- */
    <div className="border border-[#1d1c19]/15 bg-white overflow-hidden shadow-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-[#fbfbfa] transition"
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-none border border-[#1d1c19]/20 bg-[#f2f1ed] flex items-center justify-center text-[#1d1c19]">
            <Bot className="size-4 stroke-[1.5]" />
          </div>
          <div>
            <span className="font-gt-mono uppercase font-bold text-xs text-[#1d1c19] block tracking-wider">
              Asisten Edukasi Pilah Sampah Bali
            </span>
            <span className="text-[11px] text-[#55534c]">
              Konsultasi pemilahan sampah canang, danyuh, dan daur ulang
            </span>
          </div>
        </div>
        <div className="size-7 flex items-center justify-center text-[#55534c]">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#1d1c19]/10 p-4 space-y-3 bg-[#fbfbfa]">
          <div className="h-64 overflow-y-auto space-y-2.5 pr-1 text-xs font-mono">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 max-w-[85%] leading-relaxed ${
                  m.sender === "user"
                    ? "ml-auto bg-[#1d1c19] text-[#f2f1ed]"
                    : "bg-white border border-[#1d1c19]/15 text-[#1d1c19]"
                }`}
              >
                {m.sender === "bot" && (
                  <span className="text-[10px] text-[#015186] font-bold block mb-1 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="size-3" /> EcoSort AI
                  </span>
                )}
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="p-3 bg-white border border-[#1d1c19]/15 text-[11px] text-[#84827a] animate-pulse flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#1d1c19] animate-ping" />
                Menganalisis jenis sampah...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: Canang bekas masuk kategori apa?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-10 px-3 text-xs border border-[#1d1c19]/30 bg-white font-mono focus:outline-hidden focus:border-[#1d1c19]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 h-10 bg-[#1d1c19] text-[#f2f1ed] text-xs font-bold uppercase tracking-wider hover:bg-black transition cursor-pointer flex items-center gap-1.5"
            >
              <Send className="size-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
