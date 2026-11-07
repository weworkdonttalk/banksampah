import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const systemPrompt = `Kamu adalah Asisten Pintar Pemilahan Sampah Banjar EcoSort Bali.
Tugas utamamu HANYA mengedukasi warga tentang:
1. Pemilahan sampah di Bali (organik, anorganik plastik, kertas, logam, canang sari/upakara, residu).
2. Cara mengolah canang bekas (pisahkan bunga & janur untuk kompos organik; buang jepitan staples/bambu ke residu).
3. Jadwal dan aturan Bank Sampah Banjar.
4. Menolak dengan sopan segala topik di luar pengelolaan sampah, lingkungan, dan banjar adat Bali.

Gunakan salam Bali seperti "Om Swastyastu" dan bahasa Indonesia yang ramah, sopan, dan jelas.`;

    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${systemPrompt}\n\nPertanyaan Warga: ${message}` }],
              },
            ],
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return NextResponse.json({ reply: text });
        }
      } catch (e) {
        console.warn("Chatbot LLM call failed:", e);
      }
    }

    // Heuristic contextual fallback
    const lower = message.toLowerCase();
    if (lower.includes("canang") || lower.includes("bunga") || lower.includes("upakara")) {
      return NextResponse.json({
        reply:
          "Om Swastyastu! Untuk sampah upakara atau canang: pisahkan bunga dan janur (masuk kategori Kompos Organik Banjar), sedangkan staples, lilin, dan dupa buang ke wadah residu. Dengan memisahkan ini, tumpukan sampah tidak cepat membusuk dan memicu gas berbahaya!",
      });
    }

    if (lower.includes("botol") || lower.includes("plastik") || lower.includes("kresek")) {
      return NextResponse.json({
        reply:
          "Om Swastyastu! Botol plastik PET (seperti botol air mineral bening) memiliki nilai ekonomi tinggi Rp3.500/kg. Lepaskan tutup dan labelnya, lalu remas hingga pipih sebelum dibawa ke stasiun penimbangan Banjar.",
      });
    }

    if (lower.includes("uang") || lower.includes("tarik") || lower.includes("saldo")) {
      return NextResponse.json({
        reply:
          "Saldo Anda dari setoran sampah terakumulasi di buku kas digital. Anda dapat mengajukan pencairan tunai atau menukarkannya dengan voucher di kasir Banjar melalui tombol 'Ajukan Penarikan' di halaman Tabungan Warga.",
      });
    }

    return NextResponse.json({
      reply:
        "Om Swastyastu! Saya siap membantu seputar tata cara memilah sampah rumah tangga, upakara canang, dan penyetoran ke Bank Sampah Banjar. Ada yang ingin ditanyakan seputar jenis sampah?",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
