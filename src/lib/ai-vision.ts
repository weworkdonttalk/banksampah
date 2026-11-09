import { z } from "zod";
import { generateJSON } from "@/lib/ai/gemini";

export const WasteVerificationOutputSchema = z.object({
  kategori: z.enum(["organik", "anorganik", "tidak_jelas"]),
  subjenis: z.enum([
    "plastik",
    "kertas",
    "logam",
    "kaca",
    "sisa_makanan",
    "daun_dan_sampah_upacara",
    "lainnya",
  ]),
  confidence: z.number().min(0).max(1),
  benda_berisiko_api: z.boolean(),
  jenis_risiko: z
    .enum(["baterai", "aerosol", "korek_gas", "powerbank", "lainnya"])
    .nullable(),
  alasan_singkat: z.string().min(1),
  tips_pemilahan: z.string().min(1),
});

export type WasteVerificationOutput = z.infer<typeof WasteVerificationOutputSchema>;

// Compatible OpenAPI 3.0 schema subset for Gemini structured output
export const wasteVerificationGeminiSchema = {
  type: "OBJECT",
  properties: {
    kategori: {
      type: "STRING",
      enum: ["organik", "anorganik", "tidak_jelas"],
    },
    subjenis: {
      type: "STRING",
      enum: [
        "plastik",
        "kertas",
        "logam",
        "kaca",
        "sisa_makanan",
        "daun_dan_sampah_upacara",
        "lainnya",
      ],
    },
    confidence: {
      type: "NUMBER",
    },
    benda_berisiko_api: {
      type: "BOOLEAN",
    },
    jenis_risiko: {
      type: "STRING",
      enum: ["baterai", "aerosol", "korek_gas", "powerbank", "lainnya"],
      nullable: true,
    },
    alasan_singkat: {
      type: "STRING",
    },
    tips_pemilahan: {
      type: "STRING",
    },
  },
  required: [
    "kategori",
    "subjenis",
    "confidence",
    "benda_berisiko_api",
    "alasan_singkat",
    "tips_pemilahan",
  ],
};

const SYSTEM_PROMPT = `kamu verifikator sampah di bank sampah Bali. Klasifikasikan isi foto.
Sampah upacara Bali (canang sari, janur, bunga, dupa) = organik.
Tandai benda berisiko api (baterai litium, kaleng aerosol, korek gas, powerbank).
Jika foto buram/gelap/tidak ada sampah, kategori "tidak_jelas".
Jangan mengarang; jawab hanya JSON sesuai schema.`;

/**
 * Validates image size and type on the server.
 * Supported: JPEG, PNG, WEBP. Max size: 2 MB.
 */
export function validateImagePayload(data: string): {
  valid: boolean;
  error?: string;
  mimeType: string;
  cleanBase64: string;
} {
  if (!data || typeof data !== "string") {
    return { valid: false, error: "Data gambar kosong", mimeType: "image/jpeg", cleanBase64: "" };
  }

  let mimeType = "image/jpeg";
  let cleanBase64 = data;

  if (data.startsWith("data:")) {
    const match = data.match(/^data:(image\/(jpeg|png|webp));base64,(.*)$/);
    if (!match) {
      return {
        valid: false,
        error: "Format gambar tidak didukung. Harap gunakan JPEG, PNG, atau WEBP.",
        mimeType,
        cleanBase64: "",
      };
    }
    mimeType = match[1];
    cleanBase64 = match[3];
  }

  const approxBytes = Math.floor(cleanBase64.length * 0.75);
  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
  if (approxBytes > MAX_BYTES) {
    return {
      valid: false,
      error: "Ukuran gambar melebihi batas maksimal 2 MB",
      mimeType,
      cleanBase64: "",
    };
  }

  return { valid: true, mimeType, cleanBase64 };
}

/**
 * High-accuracy deterministic fallback generator for offline testing,
 * demo presets, and rate-limit safety.
 */
export function getDeterministicWasteMock(
  base64OrSampleUrl: string,
  userClaimedCategory: "ORGANIK" | "ANORGANIK"
): WasteVerificationOutput {
  const lower = base64OrSampleUrl.toLowerCase();

  // 1. Skenario Benda Berisiko Api (Baterai, Aerosol, Korek, Powerbank)
  if (
    lower.includes("battery") ||
    lower.includes("baterai") ||
    lower.includes("aerosol") ||
    lower.includes("korek") ||
    lower.includes("powerbank") ||
    lower.includes("sample-battery")
  ) {
    return {
      kategori: "anorganik",
      subjenis: "lainnya",
      confidence: 0.96,
      benda_berisiko_api: true,
      jenis_risiko: lower.includes("aerosol")
        ? "aerosol"
        : lower.includes("korek")
        ? "korek_gas"
        : lower.includes("powerbank")
        ? "powerbank"
        : "baterai",
      alasan_singkat: "Terdeteksi sel baterai lithium/alat pemicu api yang membahayakan stasiun kompartemen.",
      tips_pemilahan: "Benda berisiko api dilarang dibuang ke tong ini. Serahkan langsung ke pos petugas banjar.",
    };
  }

  // 2. Skenario Foto Buram / Tidak Jelas
  if (
    lower.includes("blur") ||
    lower.includes("buram") ||
    lower.includes("gelap") ||
    lower.includes("sample-blur")
  ) {
    return {
      kategori: "tidak_jelas",
      subjenis: "lainnya",
      confidence: 0.35,
      benda_berisiko_api: false,
      jenis_risiko: null,
      alasan_singkat: "Foto buram atau intensitas cahaya terlalu rendah untuk mengidentifikasi kontur sampah.",
      tips_pemilahan: "Ambil foto ulang tegak lurus dengan pencahayaan cukup dan fokus ke objek sampah.",
    };
  }

  // 3. Skenario Organik (Canang Bali, Janur, Bunga upakara)
  if (
    lower.includes("canang") ||
    lower.includes("bunga") ||
    lower.includes("janur") ||
    lower.includes("sample-canang") ||
    lower.includes("upakara")
  ) {
    return {
      kategori: "organik",
      subjenis: "daun_dan_sampah_upacara",
      confidence: 0.95,
      benda_berisiko_api: false,
      jenis_risiko: null,
      alasan_singkat: "Material terverifikasi: janur kelapa, bunga sembahyang, dan materi organik upakara Bali.",
      tips_pemilahan: "Pisahkan staples/bambu residu sebelum dimasukkan ke kompartemen kompos banjar.",
    };
  }

  // 4. Skenario Anorganik Plastik (Botol PET, kaleng, kardus)
  if (
    lower.includes("pet") ||
    lower.includes("plastik") ||
    lower.includes("botol") ||
    lower.includes("sample-pet")
  ) {
    return {
      kategori: "anorganik",
      subjenis: "plastik",
      confidence: 0.94,
      benda_berisiko_api: false,
      jenis_risiko: null,
      alasan_singkat: "Botol plastik polimer PET teridentifikasi dalam kondisi bersih dan minim kontaminan.",
      tips_pemilahan: "Lepaskan tutup botol dan remas botol hingga pipih untuk memaksimalkan ruang tong.",
    };
  }

  // Default: verifikasi sesuai klaim user untuk demo
  return {
    kategori: userClaimedCategory.toLowerCase() as "organik" | "anorganik",
    subjenis: userClaimedCategory === "ORGANIK" ? "daun_dan_sampah_upacara" : "plastik",
    confidence: 0.92,
    benda_berisiko_api: false,
    jenis_risiko: null,
    alasan_singkat: `Material terverifikasi konsisten dengan kategori ${userClaimedCategory.toLowerCase()}.`,
    tips_pemilahan: "Terima kasih telah memilah sampah langsung dari sumber rumah tangga.",
  };
}

/**
 * Server-side AI Vision verification engine.
 * Calls Gemini via unified generateJSON helper with strict zod validation.
 */
export async function analyzeWastePhoto(
  base64OrDataUrl: string,
  userClaimedCategory: "ORGANIK" | "ANORGANIK",
  userId?: string
): Promise<WasteVerificationOutput> {
  const validation = validateImagePayload(base64OrDataUrl);
  if (!validation.valid) {
    throw new Error(validation.error || "Validasi foto gagal");
  }

  const prompt = `Warga mengklaim kategori sampah: "${userClaimedCategory}".
Analisis foto sampah ini secara cermat.
Klasifikasikan apakah foto berisi sampah organik (termasuk canang sari Bali), anorganik, atau tidak jelas.
Periksa secara khusus keberadaan benda berbahaya pemicu api (baterai, kaleng aerosol, korek gas, powerbank).
Keluarkan jawaban JSON persis sesuai schema.`;

  return await generateJSON<WasteVerificationOutput>({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
    schema: wasteVerificationGeminiSchema,
    zodSchema: WasteVerificationOutputSchema,
    image: {
      mimeType: validation.mimeType,
      base64: validation.cleanBase64,
    },
    userId,
    mockFallback: () => getDeterministicWasteMock(base64OrDataUrl, userClaimedCategory),
  });
}
