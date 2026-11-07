import { dbService } from "../src/lib/db-service";
import { analyzeWastePhoto } from "../src/lib/ai-vision";

async function runTest() {
  console.log("=== MEMULAI TEST INTEGRASI E2E LOGIKA IOT & BANK SAMPAH ===");

  // 1. Ambil stasiun & tarif default
  const stations = await dbService.getAllStations();
  const station = stations[0];
  console.log(`[1] Stasiun Terpilih: ${station.name} (${station.deviceId}), API Key: ${station.apiKey}`);

  const tariff = await dbService.getStationTariff(station.banjarId);
  console.log(`[2] Tarif Flat Banjar: Organik=Rp${tariff.organicRate}, Anorganik=Rp${tariff.inorganicRate}`);

  // 2. Warga membuat sesi setor (5 menit)
  const citizenId = "usr_warga_1";
  const session = await dbService.createDepositSession({
    stationId: station.id,
    citizenId,
  });
  console.log(`[3] Sesi Dibuat: ${session.sessionCode}, Status: ${session.status}, Exp: ${session.expiresAt.toISOString()}`);
  if (session.status !== "WAITING_TRASH") throw new Error("Status sesi awal harus WAITING_TRASH");

  // 3. ESP32 Wemos mengirim event ultrasonic waste_in
  const eventResult = await dbService.recordStationEvent({
    stationId: station.id,
    type: "waste_in",
    distanceCm: 12.8,
  });
  console.log(`[4] Event Ultrasonic: Sesi Terupdate=${eventResult.sessionUpdated}, Event ID=${eventResult.event.id}`);
  if (!eventResult.sessionUpdated) throw new Error("Event harus mengait ke sesi aktif");

  // 4. Test Debounce 5 detik: Kirim event kedua langsung
  const debounceResult = await dbService.recordStationEvent({
    stationId: station.id,
    type: "waste_in",
    distanceCm: 12.9,
  });
  console.log(`[5] Debounce Test: Debounced=${debounceResult.debounced} (Harus TRUE)`);
  if (!debounceResult.debounced) throw new Error("Event dalam 5 detik harus didebounce");

  // 5. Cek status sesi setelah event ultrasonic
  const refreshedSession = await dbService.getSessionById(session.id);
  console.log(`[6] Status Sesi Setelah Sensor Masuk: ${refreshedSession?.status} (Harus TRASH_DETECTED)`);
  if (refreshedSession?.status !== "TRASH_DETECTED") throw new Error("Status harus TRASH_DETECTED");

  // 6. Test AI Vision Schema & Decision Engine
  // Test A: Warga klaim ORGANIK, AI deteksi ORGANIK (Match -> Disetujui)
  const aiResultOrganik = await analyzeWastePhoto("sample-canang", "ORGANIK");
  console.log(`[7] AI Vision Result (Canang): Kategori=${aiResultOrganik.kategori}, Confidence=${aiResultOrganik.confidence}, Sub=${aiResultOrganik.subjenis}`);

  const initialBalance = await dbService.getUserBalance(citizenId);
  const approvedSession = await dbService.processSessionAiResult(session.id, {
    userCategory: "ORGANIK",
    imageUrl: "/samples/sample-canang.png",
    aiResult: aiResultOrganik,
  });
  const updatedBalance = await dbService.getUserBalance(citizenId);
  console.log(`[8] Hasil Setoran: Status=${approvedSession.status}, Reward=Rp${approvedSession.rewardAmount}, Saldo: Rp${initialBalance} -> Rp${updatedBalance}`);
  if (approvedSession.status !== "COMPLETED") throw new Error("Setoran valid harus COMPLETED");
  if (updatedBalance - initialBalance !== tariff.organicRate) throw new Error("Saldo harus bertambah sebesar tarif organik flat");

  // 7. Test Mismatch AI (Warga klaim ORGANIK padahal Plastik -> Dikoreksi AI)
  const session2 = await dbService.createDepositSession({
    stationId: station.id,
    citizenId,
  });
  // Event ultrasonic manual tanpa debounce
  session2.status = "TRASH_DETECTED" as any;

  const aiResultPlastik = {
    kategori: "anorganik" as const,
    subjenis: "plastik" as const,
    confidence: 0.94,
    alasan_singkat: "Botol plastik polimer PET terdeteksi",
    tips_pemilahan: "Koreksi ke anorganik",
  };

  const correctedSession = await dbService.processSessionAiResult(session2.id, {
    userCategory: "ORGANIK", // Klaim keliru
    imageUrl: "/samples/sample-pet.png",
    aiResult: aiResultPlastik,
  });
  console.log(`[9] Test Koreksi AI: Status=${correctedSession.status}, isCorrected=${correctedSession.isCorrected}, isCheating=${correctedSession.isCheatingSuspected}, Reward=Rp${correctedSession.rewardAmount}`);
  if (!correctedSession.isCorrected) throw new Error("Harus ditandai isCorrected=true");
  if (correctedSession.rewardAmount !== tariff.inorganicRate) throw new Error("Reward harus mengikuti tarif anorganik hasil koreksi AI");

  // 8. Test Tong Hampir Penuh (fill_level >= 80%)
  const fillTest = await dbService.updateStationFillLevel(station.id, 86.4);
  console.log(`[10] Test Tong Penuh: Fill=${fillTest?.fillLevel}%, Alert Dibuat=${fillTest?.alertCreated}`);
  if (!fillTest?.alertCreated) throw new Error("Alert BIN_FULL harus terpicu jika fill level >= 80%");

  console.log("=== SEMUA TEST INTEGRASI FITUR BARU BERHASIL 100% ===");
}

runTest().catch((err) => {
  console.error("Test Gagal:", err);
  process.exit(1);
});
