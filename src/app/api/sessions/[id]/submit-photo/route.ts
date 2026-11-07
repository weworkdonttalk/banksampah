import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { getSession } from "@/lib/auth";
import { analyzeWastePhoto } from "@/lib/ai-vision";

const SubmitPhotoSchema = z.object({
  userCategory: z.enum(["ORGANIK", "ANORGANIK"]),
  imageBase64: z.string().min(10), // Base64 data atau data URL
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Harap login" }, { status: 401 });
    }

    const { id } = await params;
    const session = await dbService.getSessionById(id);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (session.citizenId !== user.userId) {
      return NextResponse.json({ error: "Forbidden: Sesi bukan milik Anda" }, { status: 403 });
    }

    // Batasan: Foto hanya diterima dalam 3 menit setelah event ultrasonic terdeteksi
    if (session.eventTriggeredAt) {
      const eventAgeMs = Date.now() - new Date(session.eventTriggeredAt).getTime();
      const MAX_PHOTO_AGE_MS = 3 * 60 * 1000;
      if (eventAgeMs > MAX_PHOTO_AGE_MS) {
        return NextResponse.json(
          { error: "Batas waktu foto telah habis (maks 3 menit setelah sampah terdeteksi). Sesi ditutup." },
          { status: 400 }
        );
      }
    }

    const body = await req.json();
    const parsed = SubmitPhotoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload tidak valid", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userCategory, imageBase64 } = parsed.data;

    // Simpan gambar (Data URL atau path Blob/Storage)
    const imageUrl = imageBase64.length > 500000
      ? imageBase64.slice(0, 500000) // Safety boundary
      : imageBase64;

    // Jalankan analisis AI Vision
    let aiResult;
    try {
      aiResult = await analyzeWastePhoto(imageBase64, userCategory);
    } catch {
      // Jika AI gagal / timeout -> fallback ke status perlu tinjauan petugas, jangan beri saldo otomatis
      aiResult = {
        kategori: "tidak_jelas" as const,
        subjenis: "lainnya",
        confidence: 0.0,
        alasan_singkat: "Sistem AI sedang sibuk atau mengalami timeout.",
        tips_pemilahan: "Setoran dialihkan ke tinjauan fisik oleh petugas banjar.",
      };
    }

    // Proses aturan verifikasi & pencatatan ledger
    const updatedSession = await dbService.processSessionAiResult(id, {
      userCategory,
      imageUrl,
      aiResult,
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      aiResult,
      isCorrected: updatedSession.isCorrected,
      rewardAmount: updatedSession.rewardAmount,
      needsReview: updatedSession.status === "NEEDS_REVIEW",
      message:
        updatedSession.status === "COMPLETED"
          ? updatedSession.isCorrected
            ? `Koreksi AI: Pilihan Anda dikoreksi ke ${updatedSession.aiCategory?.toUpperCase()}. Saldo flat Rp${updatedSession.rewardAmount.toLocaleString("id-ID")} berhasil ditambahkan!`
            : `Setoran terverifikasi! Saldo flat Rp${updatedSession.rewardAmount.toLocaleString("id-ID")} berhasil ditambahkan ke akun Anda.`
          : updatedSession.status === "NEEDS_REVIEW"
          ? "Foto belum jelas setelah percobaan maksimal. Setoran sedang menunggu tinjauan petugas banjar."
          : "Foto kurang jelas. Silakan ambil foto ulang (maksimal 2 kali percobaan).",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memproses foto setoran";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
