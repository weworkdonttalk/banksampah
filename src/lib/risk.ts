import { z } from "zod";
import { generateJSON } from "@/lib/ai/gemini";

export type FireRiskLevel = "AMAN" | "WASPADA" | "BAHAYA";

export interface SensorRiskInput {
  temperature: number; // Suhu (°C)
  gasPpm: number; // Gas / Asap MQ2/MQ135 (PPM)
  prevTemperature?: number; // Suhu pembacaan sebelumnya (°C)
  prevGasPpm?: number; // Gas pembacaan sebelumnya (PPM)
  deltaTimeSeconds?: number; // Jeda waktu (detik), default 60
  timestamp?: string;
}

export interface RiskFactors {
  tempScore: number; // 0 - 40
  gasScore: number; // 0 - 35
  tempRateOfRise: number; // °C per menit
  tempDeltaScore: number; // 0 - 15
  gasRateOfRise: number; // PPM per menit
  gasDeltaScore: number; // 0 - 10
  correlationBonus: number; // 0 - 15 (sinergi suhu tinggi + gas pekat)
}

export interface FireRiskResult {
  score: number; // 0 - 100
  level: FireRiskLevel;
  factors: RiskFactors;
  summary: string;
  recommendedAction: string;
  timestamp: string;
}

export const AiRiskExplanationSchema = z.object({
  ringkasan_analisis: z.string().min(1),
  potensi_penyebab: z.array(z.string()).min(1),
  tindakan_petugas: z.array(z.string()).min(1),
  urgensi: z.enum(["rendah", "sedang", "tinggi", "kritis"]),
});

export type AiRiskExplanation = z.infer<typeof AiRiskExplanationSchema>;

/**
 * Algoritma Deterministik Skor Risiko Kebakaran Kompartemen Sampah (0-100).
 * Menggabungkan suhu absolut, gas absolut, laju kenaikan per menit (RoR),
 * dan korelasi simultan antar multi-sensor.
 */
export function calculateFireRisk(input: SensorRiskInput): FireRiskResult {
  const {
    temperature,
    gasPpm,
    prevTemperature = temperature,
    prevGasPpm = gasPpm,
    deltaTimeSeconds = 60,
  } = input;

  const dtMinutes = Math.max(0.1, deltaTimeSeconds / 60);

  // 1. Skor Absolut Suhu (Maks 40 Poin)
  let tempScore = 0;
  if (temperature <= 34) {
    tempScore = Math.max(0, (temperature - 25) * 0.8);
  } else if (temperature <= 45) {
    tempScore = 8 + (temperature - 34) * 1.3;
  } else if (temperature <= 55) {
    tempScore = 22 + (temperature - 45) * 1.2;
  } else {
    tempScore = Math.min(40, 34 + (temperature - 55) * 0.6);
  }

  // 2. Skor Absolut Gas / Asap (Maks 35 Poin)
  let gasScore = 0;
  if (gasPpm <= 150) {
    gasScore = Math.max(0, (gasPpm / 150) * 6);
  } else if (gasPpm <= 300) {
    gasScore = 6 + ((gasPpm - 150) / 150) * 10;
  } else if (gasPpm <= 500) {
    gasScore = 16 + ((gasPpm - 300) / 200) * 11;
  } else {
    gasScore = Math.min(35, 27 + ((gasPpm - 500) / 300) * 8);
  }

  // 3. Laju Kenaikan Suhu (Rate of Rise - RoR, Maks 15 Poin)
  const deltaTemp = Math.max(0, temperature - prevTemperature);
  const tempRateOfRise = Number((deltaTemp / dtMinutes).toFixed(2)); // °C / menit
  let tempDeltaScore = 0;
  if (tempRateOfRise > 3.0) {
    tempDeltaScore = 15;
  } else if (tempRateOfRise > 1.5) {
    tempDeltaScore = 10;
  } else if (tempRateOfRise > 0.5) {
    tempDeltaScore = 5;
  }

  // 4. Laju Kenaikan Gas (Maks 10 Poin)
  const deltaGas = Math.max(0, gasPpm - prevGasPpm);
  const gasRateOfRise = Number((deltaGas / dtMinutes).toFixed(1)); // PPM / menit
  let gasDeltaScore = 0;
  if (gasRateOfRise > 50) {
    gasDeltaScore = 10;
  } else if (gasRateOfRise > 20) {
    gasDeltaScore = 6;
  } else if (gasRateOfRise > 5) {
    gasDeltaScore = 3;
  }

  // 5. Korelasi Multi-Sensor (Maks 15 Poin)
  let correlationBonus = 0;
  if (temperature >= 48 && gasPpm >= 380) {
    correlationBonus = 15;
  } else if (temperature >= 42 && gasPpm >= 280) {
    correlationBonus = 8;
  }

  const rawScore =
    tempScore +
    gasScore +
    tempDeltaScore +
    gasDeltaScore +
    correlationBonus;

  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  let level: FireRiskLevel = "AMAN";
  let summary = "";
  let recommendedAction = "";

  if (score >= 70) {
    level = "BAHAYA";
    summary = `Kondisi kritis: Suhu ${temperature}°C dan gas ${gasPpm} PPM terdeteksi mengalami kenaikan serentak. Risiko titik api aktif sangat tinggi.`;
    recommendedAction = "SOP Bahaya: Katup udara choke-mode menutup otomatis, aktifkan alarm lokal banjar, dan inspeksi fisik dengan APAR.";
  } else if (score >= 40) {
    level = "WASPADA";
    summary = `Peningkatan anomali: Suhu (${temperature}°C) atau gas (${gasPpm} PPM) melebihi ambang standar. Indikasi fermentasi anaerobik cepat atau benda baterai panas.`;
    recommendedAction = "SOP Waspada: Percepat laju sampling sensor menjadi 5 detik, periksa ventilasi stasiun, dan pantau grafik telemetri.";
  } else {
    level = "AMAN";
    summary = `Kompartemen stabil: Suhu ${temperature}°C dan gas ${gasPpm} PPM berada dalam batas operasi normal lingkungan Bali.`;
    recommendedAction = "SOP Normal: Operasi pemilahan berjalan normal tanpa eskalasi.";
  }

  return {
    score,
    level,
    factors: {
      tempScore: Number(tempScore.toFixed(1)),
      gasScore: Number(gasScore.toFixed(1)),
      tempRateOfRise,
      tempDeltaScore,
      gasRateOfRise,
      gasDeltaScore,
      correlationBonus,
    },
    summary,
    recommendedAction,
    timestamp: input.timestamp || "",
  };
}

/**
 * Fallback deterministik untuk rekomendasi AI (tanpa token eksternal / offline mode).
 */
export function getDeterministicRiskExplanation(
  risk: FireRiskResult,
  stationName = "Stasiun TPST Kayumas"
): AiRiskExplanation {
  if (risk.level === "BAHAYA") {
    return {
      ringkasan_analisis: `Peringatan Kritis di ${stationName}: Skor ${risk.score}/100. Kombinasi kenaikan suhu cepat (${risk.factors.tempRateOfRise}°C/menit) dan lonjakan gas (${risk.factors.gasRateOfRise} PPM/menit) mengindikasikan reaksi termal aktif atau baterai meledak.`,
      potensi_penyebab: [
        "Korsleting sel baterai litium atau powerbank yang terbuang",
        "Sisa dupa sembahyang Bali yang belum padam sempurna",
        "Reaksi gas metana dengan panas kompartemen tertutup",
      ],
      tindakan_petugas: [
        "Segera tutup corong masukan sampah (mode isolasi udara)",
        "Siapkan APAR powder di sekitar stasiun banjar",
        "Kirim notifikasi darurat ke grup koordinat pecalang & petugas banjar",
      ],
      urgensi: "kritis",
    };
  }

  if (risk.level === "WASPADA") {
    return {
      ringkasan_analisis: `Perhatian di ${stationName}: Skor ${risk.score}/100. Terdeteksi anomali pada kompartemen. Sensor membaca kenaikan gas atau suhu di atas rata-rata normal.`,
      potensi_penyebab: [
        "Fermentasi bahan organik basah menghasilkan gas biogas",
        "Udara panas siang hari menumpuk di dalam box kompartemen",
        "Kemasan aerosol bocor perlahan",
      ],
      tindakan_petugas: [
        "Periksa ventilasi udara stasiun sampah",
        "Pantau tren kenaikan suhu dalam 15 menit ke depan",
        "Pastikan sensor MQ2/MQ135 tidak tertutup kotoran debu",
      ],
      urgensi: "sedang",
    };
  }

  return {
    ringkasan_analisis: `Kondisi Normal di ${stationName}: Skor ${risk.score}/100. Suhu dan gas stabil di kisaran aman. Tidak ditemukan potensi titik api.`,
    potensi_penyebab: [
      "Sirkulasi udara kompartemen berfungsi optimal",
      "Sampah tersortir dengan baik tanpa pemicu api",
    ],
    tindakan_petugas: [
      "Lanjutkan pemantauan rutin telemetri",
      "Kosongkan tong jika kapasitas mencapai >80%",
    ],
    urgensi: "rendah",
  };
}

/**
 * Meminta Gemini AI menghasilkan narasi analisis mendalam & rekomendasi mitigasi.
 * Menggunakan cache in-memory 60 detik agar hemat kuota dan responsif.
 */
export async function getAiRiskExplanation(
  risk: FireRiskResult,
  stationContext: { stationId: string; stationName: string; banjarName?: string },
  userId?: string
): Promise<AiRiskExplanation> {
  const cacheKey = `ai_risk_${stationContext.stationId}_${risk.level}_${Math.floor(risk.score / 5)}`;

  const prompt = `Analisis data risiko kebakaran stasiun sampah:
Stasiun: ${stationContext.stationName} (ID: ${stationContext.stationId}, Wilayah: ${stationContext.banjarName || "Denpasar"})
Skor Risiko: ${risk.score}/100 (Level: ${risk.level})
Faktor Sensor:
- Laju Kenaikan Suhu: ${risk.factors.tempRateOfRise} °C/menit (Skor: ${risk.factors.tempScore}/40)
- Laju Kenaikan Gas: ${risk.factors.gasRateOfRise} PPM/menit (Skor: ${risk.factors.gasScore}/35)
- Korelasi Multi-Sensor: ${risk.factors.correlationBonus > 0 ? "Korelasi Terdeteksi" : "Normal"}
Ringkasan Sistem: ${risk.summary}

Buat penjelasan ringkas untuk petugas banjar, potensi penyebab lokal (misal: canang dupa belum mati, baterai lithium), dan 3 tindakan konkrit. Jawab strictly JSON sesuai schema.`;

  const schema = {
    type: "OBJECT",
    properties: {
      ringkasan_analisis: { type: "STRING" },
      potensi_penyebab: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      tindakan_petugas: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      urgensi: {
        type: "STRING",
        enum: ["rendah", "sedang", "tinggi", "kritis"],
      },
    },
    required: [
      "ringkasan_analisis",
      "potensi_penyebab",
      "tindakan_petugas",
      "urgensi",
    ],
  };

  return await generateJSON<AiRiskExplanation>({
    prompt,
    systemInstruction:
      "Kamu asisten keamanan pintar stasiun IoT EcoSort AI Bali. Analisis risiko kebakaran sampah berdasarkan data sensor secara objektif dan terukur.",
    schema,
    zodSchema: AiRiskExplanationSchema,
    userId,
    cacheKey,
    cacheTtlSeconds: 60,
    mockFallback: () => getDeterministicRiskExplanation(risk, stationContext.stationName),
  });
}
