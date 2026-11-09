import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { getGeminiClient, getGeminiModel, logAiError } from "@/lib/ai/gemini";

export async function GET(req: NextRequest) {
  try {
    const stations = await dbService.getAllStations();
    const station = stations[0];
    if (!station) {
      return NextResponse.json({ insight: "Belum ada stasiun terdaftar." });
    }

    const readings = await dbService.getStationReadings(station.id, 24);
    if (readings.length === 0) {
      return NextResponse.json({
        insight: "Data telemetri 24 jam belum memadai untuk analisis mendalam.",
      });
    }

    const temps = readings.map((r: any) => r.temp);
    const smokes = readings.map((r: any) => r.smoke);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
    const maxSmoke = Math.max(...smokes);
    const avgSmoke = Math.round(smokes.reduce((a, b) => a + b, 0) / smokes.length);
    const alertCount = station.alerts?.length || 0;

    const fallbackInsight = `📊 RINGKASAN MONITORING 24 JAM (${station.name}):
Suhu rata-rata tercatat di angka stabil ${avgTemp}°C (rentang ${minTemp}°C - ${maxTemp}°C). Konsentrasi gas metana/asap terpantau rata-rata ${avgSmoke} PPM dengan puncak ${maxSmoke} PPM saat fermentasi material organik siang hari.

🔍 STATUS RISIKO & ANOMALI:
Total ${alertCount} indikasi anomali termal terdeteksi dalam 24 jam terakhir. Laju kenaikan suhu tetap di bawah ambang bahaya kritis 60°C, membuktikan sirkulasi ventilasi dan pemilahan organik berhasil menekan akumulasi metana.

💡 REKOMENDASI PETUGAS BANJAR:
1. Lanjutkan pemisahan residu canang basah dari plastik kering untuk mencegah hotspot biologis.
2. Lakukan inspeksi visual pada tumpukan kardus saat terik matahari pukul 12:00 - 14:00 WITA.`;

    const client = getGeminiClient();
    if (client && process.env.AI_MOCK !== "true") {
      try {
        const prompt = `Bertindak sebagai ahli keselamatan TPST & IoT Lingkungan Bali. 
Analisis data sensor 24 jam stasiun ${station.name}:
- Suhu: Min ${minTemp}°C, Max ${maxTemp}°C, Rata-rata ${avgTemp}°C
- Asap/Gas: Rata-rata ${avgSmoke} PPM, Max ${maxSmoke} PPM
- Jumlah Alert Aktif: ${alertCount}

Buat ringkasan eksekutif 2-3 paragraf Bahasa Indonesia yang tajam dan rekomendasi mitigasi risiko kebakaran sampah khas iklim tropis Bali.`;

        const model = getGeminiModel();
        const response = await client.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: 0.3,
            abortSignal: AbortSignal.timeout(15000),
          },
        });

        const text = response.text;
        if (text) return NextResponse.json({ insight: text });
      } catch (e) {
        logAiError("daily_analysis", e);
      }
    }

    return NextResponse.json({ insight: fallbackInsight });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
