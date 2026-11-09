import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";
import { getGeminiClient, getGeminiModel, checkRateLimit, logAiError } from "@/lib/ai/gemini";
import { calculateFireRisk } from "@/lib/risk";

// Function Declarations untuk Gemini Function Calling
const TOOLS_CONFIG = [
  {
    functionDeclarations: [
      {
        name: "getStatusStasiun",
        description:
          "Mendapatkan status operasional stasiun sampah di wilayah banjar pengguna (suhu, gas, tingkat keterisian tong, dan status online).",
        parameters: {
          type: "OBJECT",
          properties: {
            stationId: {
              type: "STRING",
              description: "ID stasiun spesifik (opsional, jika tidak diisi akan menampilkan semua stasiun di banjar ini)",
            },
          },
        },
      },
      {
        name: "getRisikoStasiun",
        description:
          "Mendapatkan skor risiko kebakaran (0-100), level (AMAN/WASPADA/BAHAYA), dan tindakan mitigasi stasiun di banjar.",
        parameters: {
          type: "OBJECT",
          properties: {
            stationId: {
              type: "STRING",
              description: "ID stasiun (opsional)",
            },
          },
        },
      },
      {
        name: "getRekapSetoran",
        description:
          "Mendapatkan statistik rekapitulasi setoran sampah warga di banjar (total sesi, organik vs anorganik, saldo reward yang telah disalurkan).",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "getTongHampirPenuh",
        description:
          "Mendapatkan daftar stasiun tong sampah yang keterisiannya hampir penuh (>= 80%) dan butuh pengosongan oleh petugas banjar.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `Kamu adalah Asisten Pintar Stasiun & Bank Sampah Banjar EcoSort AI Bali.
Karakter: Ramah, profesional, bernuansa budaya Bali (gunakan salam "Om Swastyastu", sebut konsep Tri Hita Karana jika relevan).
Tugas utamamu:
1. Membantu warga dan petugas memilah sampah (organik, anorganik plastik/kertas/logam, residu, canang sari Bali).
2. Memberikan informasi data stasiun IoT, risiko kebakaran, dan rekap banjar melalui function calling yang tersedia.
3. MENOLAK DENGAN SOPAN segala pertanyaan di luar pengelolaan sampah, lingkungan, dan stasiun banjar Bali (misal: pemrograman, politik, resep kuliner umum, tugas sekolah umum).
Format jawaban: Jelas, padat, gunakan bahasa Indonesia santun dengan salam pembuka Bali.`;

// Tool Executors - Scoped strictly to banjarId
async function executeTool(name: string, args: Record<string, unknown>, banjarId: string) {
  if (name === "getStatusStasiun") {
    const stations = await dbService.getStationsByBanjar(banjarId);
    return stations.map((st) => {
      const latestReading = st.readings?.[0];
      const isOnline = latestReading
        ? Date.now() - new Date(latestReading.createdAt).getTime() < 15 * 60 * 1000
        : true;
      return {
        id: st.id,
        deviceId: st.deviceId,
        name: st.name,
        lokasi: st.lokasi,
        isOnline,
        suhu: latestReading ? `${latestReading.temp}°C` : "31.2°C",
        gas: latestReading ? `${latestReading.smoke} PPM` : "120 PPM",
        keterisian: `${latestReading?.fillLevel ?? st.currentFillLevel ?? 40}%`,
      };
    });
  }

  if (name === "getRisikoStasiun") {
    const stations = await dbService.getStationsByBanjar(banjarId);
    const target = stations[0];
    if (!target) {
      return { error: "Stasiun di banjar ini belum terdaftar." };
    }
    const reading = target.readings?.[0];
    const temp = reading?.temp ?? 31.5;
    const gas = reading?.smoke ?? 120;
    const risk = calculateFireRisk({ temperature: temp, gasPpm: gas, deltaTimeSeconds: 60 });
    return {
      stasiun: target.name,
      deviceId: target.deviceId,
      skorRisiko: risk.score,
      levelRisiko: risk.level,
      faktor: risk.factors,
      ringkasan: risk.summary,
      rekomendasiSOP: risk.recommendedAction,
    };
  }

  if (name === "getRekapSetoran") {
    const sessions = await dbService.getBanjarReport(banjarId);
    const completed = sessions.filter((s) => s.status === "COMPLETED");
    const organik = sessions.filter(
      (s) => s.aiCategory === "organik" || s.userCategory === "ORGANIK"
    );
    const anorganik = sessions.filter(
      (s) => s.aiCategory === "anorganik" || s.userCategory === "ANORGANIK"
    );
    const totalPoin = completed.reduce((sum, s) => sum + (s.rewardAmount || 0), 0);
    const perluTinjauan = sessions.filter((s) => s.status === "NEEDS_REVIEW").length;

    return {
      wilayahBanjar: banjarId,
      totalSesi: sessions.length,
      setoranSelesai: completed.length,
      sampahOrganikCount: organik.length,
      sampahAnorganikCount: anorganik.length,
      totalPoinRewardDicairkan: `Rp ${totalPoin.toLocaleString("id-ID")}`,
      antreanPerluTinjauanPetugas: perluTinjauan,
    };
  }

  if (name === "getTongHampirPenuh") {
    const stations = await dbService.getStationsByBanjar(banjarId);
    const hampirPenuh = stations
      .filter((st) => {
        const fill = st.readings?.[0]?.fillLevel ?? 0;
        return fill >= 80;
      })
      .map((st) => ({
        deviceId: st.deviceId,
        nama: st.name,
        keterisian: `${st.readings?.[0]?.fillLevel}%`,
        peringatan: "Segera lakukan pengosongan kompartemen oleh petugas TPST banjar.",
      }));

    return {
      totalHampirPenuh: hampirPenuh.length,
      daftarStasiun: hampirPenuh.length > 0 ? hampirPenuh : "Semua tong masih memiliki kapasitas cukup (<80%).",
    };
  }

  return { error: `Tool ${name} tidak dikenali` };
}

// Heuristic fallback for offline/mock demo
async function getOfflineMockReply(message: string, banjarId: string): Promise<string> {
  const lower = message.toLowerCase();

  // 1. Off-topic reject guardrail
  if (
    lower.includes("javascript") ||
    lower.includes("python") ||
    lower.includes("coding") ||
    lower.includes("pemrograman") ||
    lower.includes("puisi") ||
    lower.includes("politik") ||
    lower.includes("presiden") ||
    lower.includes("crypto") ||
    lower.includes("bitcoin")
  ) {
    return "Om Swastyastu. Mohon maaf, sebagai Asisten Banjar EcoSort AI, titiang hanya dapat melayani konsultasi seputar pemilahan sampah, pengelolaan lingkungan Bali, serta pemantauan stasiun bank sampah banjar.";
  }

  // 2. Status stasiun
  if (lower.includes("status") || lower.includes("stasiun") || lower.includes("alat")) {
    const data = await executeTool("getStatusStasiun", {}, banjarId);
    return `Om Swastyastu! Berikut status stasiun aktif di banjar Anda:\n${JSON.stringify(
      data,
      null,
      2
    )}\nSemua sensor IoT terhubung normal dalam batas operasional aman.`;
  }

  // 3. Risiko kebakaran
  if (lower.includes("risiko") || lower.includes("kebakaran") || lower.includes("api") || lower.includes("panas")) {
    const data = (await executeTool("getRisikoStasiun", {}, banjarId)) as any;
    return `Om Swastyastu! Laporan Risiko Kebakaran Kompartemen:\nStasiun: ${data.stasiun} (${data.deviceId})\nSkor Risiko: ${data.skorRisiko}/100 [Level: ${data.levelRisiko}]\n${data.ringkasan}\n${data.rekomendasiSOP}`;
  }

  // 4. Rekap setoran
  if (lower.includes("rekap") || lower.includes("total") || lower.includes("laporan") || lower.includes("poin")) {
    const data = (await executeTool("getRekapSetoran", {}, banjarId)) as any;
    return `Om Swastyastu! Rekapitulasi Penyetoran Sampah Banjar:\n- Total Penyetoran: ${data.totalSesi} sesi\n- Setoran Sukses: ${data.setoranSelesai} sesi\n- Organik: ${data.sampahOrganikCount} | Anorganik: ${data.sampahAnorganikCount}\n- Total Reward Dicairkan: ${data.totalPoinRewardDicairkan}\n- Perlu Tinjauan Petugas: ${data.antreanPerluTinjauanPetugas} sesi`;
  }

  // 5. Tong penuh
  if (lower.includes("penuh") || lower.includes("kapasitas") || lower.includes("tong")) {
    const data = (await executeTool("getTongHampirPenuh", {}, banjarId)) as any;
    return `Om Swastyastu! Laporan Kapasitas Tong:\n${typeof data.daftarStasiun === "string" ? data.daftarStasiun : JSON.stringify(data.daftarStasiun, null, 2)}`;
  }

  // 6. Edukasi Sampah Canang / Bunga
  if (lower.includes("canang") || lower.includes("bunga") || lower.includes("janur") || lower.includes("upakara")) {
    return "Om Swastyastu! Untuk sampah canang sari dan upakara sembahyang: Pisahkan daun kelapa/janur dan bunga untuk dimasukkan ke tong Organik Banjar (dibuat kompos pupuk organik). Pastikan jarum semat/staples, dupa sisa, dan lilin dibuang ke tong residu agar tidak merusak mesin cacah dan tidak memicu titik bara api.";
  }

  // 7. Edukasi Botol Plastik / Anorganik
  if (lower.includes("plastik") || lower.includes("botol") || lower.includes("pet")) {
    return "Om Swastyastu! Botol plastik PET bernilai ekonomis tinggi. Mohon lepaskan label plastik dan tutupnya, lalu remas hingga pipih sebelum dimasukkan ke stasiun EcoSort agar ruang kompartemen maksimal.";
  }

  // Default
  return "Om Swastyastu! Titiang siap membantu Anda mengenai panduan pemilahan sampah canang sari, botol daur ulang, pemeriksaan status stasiun banjar, maupun rekap tabungan warga. Ada yang bisa titiang bantu?";
}

export async function POST(req: NextRequest) {
  try {
    let user = null;
    try {
      user = await getSession();
    } catch {
      // safe fallback outside cookie context
    }
    const banjarId = user?.banjarId || "bjr_kayumas";

    const body = await req.json();
    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    // Rate limiting: 10 panggilan per menit
    const rateCheckId = user?.userId || "anon_warga";
    const { allowed } = checkRateLimit(rateCheckId);
    if (!allowed) {
      return NextResponse.json({
        reply: "Om Swastyastu. Batas pesan per menit tercapai (maks 10 pesan/menit). Silakan tunggu sesaat sebelum bertanya kembali.",
      });
    }

    const client = getGeminiClient();
    const isMock = process.env.AI_MOCK === "true";

    // Fallback mode jika API Key tidak diset atau AI_MOCK="true"
    if (!client || isMock) {
      const mockReply = await getOfflineMockReply(message, banjarId);
      return NextResponse.json({ reply: mockReply });
    }

    const modelName = getGeminiModel();

    // Multi-turn Gemini Function Calling
    try {
      const abortSignal = AbortSignal.timeout(15000);

      // Turn 1: Kirim pertanyaan warga bersama definisi Tools
      const initialResponse = await client.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          tools: TOOLS_CONFIG as any,
          temperature: 0.2,
          abortSignal,
        },
      });

      // Cek apakah model meminta pemanggilan Tool (Function Calling)
      const functionCalls = initialResponse.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const toolExecutionPromises = functionCalls.map(async (call) => {
          const callName = call.name || "unknownTool";
          const toolResult = await executeTool(callName, (call.args as any) || {}, banjarId);
          return {
            functionResponse: {
              name: callName,
              response: { output: toolResult },
            },
          };
        });

        const toolResponseParts = await Promise.all(toolExecutionPromises);
        const modelContent = initialResponse.candidates?.[0]?.content;

        // Turn 2: Kirim balik hasil eksekusi tool ke Gemini untuk diformulasikan ke bahasa manusia
        const contentsPayload: any[] = [
          { role: "user", parts: [{ text: message }] },
        ];
        if (modelContent) {
          contentsPayload.push(modelContent);
        }
        contentsPayload.push({
          role: "user",
          parts: toolResponseParts,
        });

        const secondTurnResponse = await client.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            temperature: 0.2,
            abortSignal: AbortSignal.timeout(15000),
          },
        });

        const finalText = secondTurnResponse.text;
        if (finalText) {
          return NextResponse.json({ reply: finalText });
        }
      }

      // Jika jawaban teks langsung tanpa tool call
      const directText = initialResponse.text;
      if (directText) {
        return NextResponse.json({ reply: directText });
      }

      // Fallback
      const fallback = await getOfflineMockReply(message, banjarId);
      return NextResponse.json({ reply: fallback });
    } catch (apiErr: unknown) {
      logAiError("chatbot_genai", apiErr);
      const fallback = await getOfflineMockReply(message, banjarId);
      return NextResponse.json({ reply: fallback });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kendala pada asisten AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
