import { prisma } from "@/lib/prisma";
import { getMockDB } from "@/lib/mock-db";
import { Role, SessionStatus, WasteCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

// Helper checking if real database is connected or fallback to mock
let hasDatabaseConnection: boolean | null = null;

export async function isDatabaseConnected(): Promise<boolean> {
  if (hasDatabaseConnection !== null) return hasDatabaseConnection;
  try {
    // Quick test query with 2s timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
    ]);
    hasDatabaseConnection = true;
    return true;
  } catch {
    hasDatabaseConnection = false;
    return false;
  }
}

export const dbService = {
  // --- AUTH / USER ---
  async getUserByEmail(email: string) {
    if (await isDatabaseConnected()) {
      return prisma.user.findUnique({
        where: { email },
        include: { banjar: true },
      });
    }
    const mock = getMockDB();
    const user = mock.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    const banjar = mock.banjars.find((b) => b.id === user.banjarId) || null;
    return { ...user, banjar };
  },

  async getUserById(id: string) {
    if (await isDatabaseConnected()) {
      return prisma.user.findUnique({
        where: { id },
        include: { banjar: true },
      });
    }
    const mock = getMockDB();
    const user = mock.users.find((u) => u.id === id);
    if (!user) return null;
    const banjar = mock.banjars.find((b) => b.id === user.banjarId) || null;
    return { ...user, banjar };
  },

  async registerBanjarWithAdmin(data: {
    kode: string;
    namaBanjar: string;
    kecamatan: string;
    kabupaten: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminPhone?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    if (await isDatabaseConnected()) {
      return prisma.$transaction(async (tx) => {
        const banjar = await tx.banjar.create({
          data: {
            kode: data.kode,
            nama: data.namaBanjar,
            kecamatan: data.kecamatan,
            kabupaten: data.kabupaten,
          },
        });
        const admin = await tx.user.create({
          data: {
            name: data.adminName,
            email: data.adminEmail,
            passwordHash,
            phone: data.adminPhone,
            role: Role.ADMIN_BANJAR,
            banjarId: banjar.id,
          },
        });
        // Default station for this banjar
        await tx.station.create({
          data: {
            deviceId: `ST-${data.kode}`,
            apiKey: `key_${data.kode.toLowerCase()}_${Date.now()}`,
            name: `Stasiun IoT TPST ${data.namaBanjar}`,
            lokasi: `Area Utama ${data.namaBanjar}`,
            banjarId: banjar.id,
          },
        });
        // Default flat tariff
        await tx.stationTariff.create({
          data: {
            banjarId: banjar.id,
            organicRate: 2000,
            inorganicRate: 3000,
          },
        });
        return { banjar, admin };
      });
    }

    const mock = getMockDB();
    const banjar = {
      id: `bjr_${Date.now()}`,
      kode: data.kode,
      nama: data.namaBanjar,
      alamat: null,
      kecamatan: data.kecamatan,
      kabupaten: data.kabupaten,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const admin = {
      id: `usr_adm_${Date.now()}`,
      email: data.adminEmail,
      passwordHash,
      name: data.adminName,
      phone: data.adminPhone || null,
      role: Role.ADMIN_BANJAR,
      banjarId: banjar.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mock.banjars.push(banjar);
    mock.users.push(admin);
    mock.stations.push({
      id: `st_${Date.now()}`,
      deviceId: `ST-${data.kode}`,
      apiKey: `key_${data.kode.toLowerCase()}_${Date.now()}`,
      name: `Stasiun IoT TPST ${data.namaBanjar}`,
      lokasi: `Area Utama ${data.namaBanjar}`,
      banjarId: banjar.id,
      tempWarnThreshold: 45,
      tempDangerThreshold: 60,
      smokeWarnThreshold: 300,
      smokeDangerThreshold: 600,
      fillWarnThreshold: 80,
      currentFillLevel: 0,
      lastFillAlertAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mock.stationTariffs.push({
      id: `trf_${Date.now()}`,
      banjarId: banjar.id,
      organicRate: 2000,
      inorganicRate: 3000,
      subRatesJson: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { banjar, admin };
  },

  // --- STATIONS & INGEST ---
  async getStationByApiKey(apiKey: string) {
    if (await isDatabaseConnected()) {
      return prisma.station.findUnique({
        where: { apiKey },
        include: { banjar: true },
      });
    }
    const mock = getMockDB();
    const st = mock.stations.find((s) => s.apiKey === apiKey);
    if (!st) return null;
    const banjar = mock.banjars.find((b) => b.id === st.banjarId) || null;
    return { ...st, banjar };
  },

  async getStationByDeviceId(deviceId: string) {
    if (await isDatabaseConnected()) {
      return prisma.station.findUnique({
        where: { deviceId },
        include: { banjar: true },
      });
    }
    const mock = getMockDB();
    const st = mock.stations.find((s) => s.deviceId === deviceId);
    if (!st) return null;
    const banjar = mock.banjars.find((b) => b.id === st.banjarId) || null;
    return { ...st, banjar };
  },

  async getStationsByBanjar(banjarId: string) {
    if (await isDatabaseConnected()) {
      return prisma.station.findMany({
        where: { banjarId },
        include: {
          readings: { orderBy: { createdAt: "desc" }, take: 1 },
          alerts: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
        },
      });
    }
    const mock = getMockDB();
    const stations = mock.stations.filter((s) => s.banjarId === banjarId);
    return stations.map((st) => {
      const readings = mock.readings
        .filter((r) => r.stationId === st.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 1);
      const alerts = mock.alerts
        .filter((a) => a.stationId === st.id && a.status === "ACTIVE")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return { ...st, readings, alerts };
    });
  },

  async getAllStations() {
    if (await isDatabaseConnected()) {
      return prisma.station.findMany({
        include: {
          banjar: true,
          readings: { orderBy: { createdAt: "desc" }, take: 1 },
          alerts: { where: { status: "ACTIVE" } },
        },
      });
    }
    const mock = getMockDB();
    return mock.stations.map((st) => {
      const banjar = mock.banjars.find((b) => b.id === st.banjarId) || null;
      const readings = mock.readings
        .filter((r) => r.stationId === st.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 1);
      const alerts = mock.alerts.filter((a) => a.stationId === st.id && a.status === "ACTIVE");
      return { ...st, banjar, readings, alerts };
    });
  },

  async saveReading(data: {
    stationId: string;
    temp: number;
    smoke: number;
    humidity?: number;
    fillLevel?: number;
  }) {
    if (await isDatabaseConnected()) {
      return prisma.sensorReading.create({
        data: {
          stationId: data.stationId,
          temp: data.temp,
          smoke: data.smoke,
          humidity: data.humidity ?? null,
          fillLevel: data.fillLevel ?? null,
        },
      });
    }
    const mock = getMockDB();
    const reading = {
      id: `rd_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      stationId: data.stationId,
      temp: data.temp,
      smoke: data.smoke,
      humidity: data.humidity ?? null,
      fillLevel: data.fillLevel ?? null,
      createdAt: new Date(),
    };
    mock.readings.push(reading);
    return reading;
  },

  // Alert Tong Penuh (fillLevel >= 80% dengan cooldown anti-spam 30 menit)
  async updateStationFillLevel(stationId: string, fillLevel: number) {
    const now = new Date();
    const COOLDOWN_MS = 30 * 60 * 1000;

    if (await isDatabaseConnected()) {
      const station = await prisma.station.findUnique({ where: { id: stationId } });
      if (!station) return null;

      let triggerAlert = false;
      if (fillLevel >= station.fillWarnThreshold) {
        if (!station.lastFillAlertAt || now.getTime() - station.lastFillAlertAt.getTime() > COOLDOWN_MS) {
          triggerAlert = true;
        }
      }

      await prisma.station.update({
        where: { id: stationId },
        data: {
          currentFillLevel: fillLevel,
          lastFillAlertAt: triggerAlert ? now : station.lastFillAlertAt,
        },
      });

      if (triggerAlert) {
        await prisma.alert.create({
          data: {
            stationId,
            type: "BIN_FULL",
            level: "WASPADA",
            value: fillLevel,
          },
        });
      }
      return { stationId, fillLevel, alertCreated: triggerAlert };
    }

    const mock = getMockDB();
    const station = mock.stations.find((s) => s.id === stationId);
    if (!station) return null;

    let triggerAlert = false;
    if (fillLevel >= station.fillWarnThreshold) {
      if (!station.lastFillAlertAt || now.getTime() - station.lastFillAlertAt.getTime() > COOLDOWN_MS) {
        triggerAlert = true;
      }
    }

    station.currentFillLevel = fillLevel;
    if (triggerAlert) {
      station.lastFillAlertAt = now;
      mock.alerts.push({
        id: `alt_${Date.now()}`,
        stationId,
        type: "BIN_FULL",
        level: "WASPADA",
        value: fillLevel,
        status: "ACTIVE",
        resolvedAt: null,
        resolvedBy: null,
        createdAt: now,
      });
    }
    return { stationId, fillLevel, alertCreated: triggerAlert };
  },

  async createAlert(data: {
    stationId: string;
    type: string;
    level: "WASPADA" | "BAHAYA";
    value: number;
  }) {
    if (await isDatabaseConnected()) {
      return prisma.alert.create({
        data: {
          stationId: data.stationId,
          type: data.type,
          level: data.level,
          value: data.value,
        },
      });
    }
    const mock = getMockDB();
    const alert = {
      id: `alt_${Date.now()}`,
      stationId: data.stationId,
      type: data.type,
      level: data.level,
      value: data.value,
      status: "ACTIVE" as const,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date(),
    };
    mock.alerts.push(alert);
    return alert;
  },

  async resolveAlert(alertId: string, resolvedBy: string) {
    if (await isDatabaseConnected()) {
      return prisma.alert.update({
        where: { id: alertId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy,
        },
      });
    }
    const mock = getMockDB();
    const alert = mock.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.status = "RESOLVED";
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
    }
    return alert;
  },

  async getStationReadings(stationId: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    if (await isDatabaseConnected()) {
      return prisma.sensorReading.findMany({
        where: {
          stationId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
      });
    }
    const mock = getMockDB();
    return mock.readings
      .filter((r) => r.stationId === stationId && r.createdAt >= since)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async updateStationThresholds(
    stationId: string,
    thresholds: {
      tempWarnThreshold?: number;
      tempDangerThreshold?: number;
      smokeWarnThreshold?: number;
      smokeDangerThreshold?: number;
      fillWarnThreshold?: number;
    }
  ) {
    if (await isDatabaseConnected()) {
      return prisma.station.update({
        where: { id: stationId },
        data: thresholds,
      });
    }
    const mock = getMockDB();
    const station = mock.stations.find((s) => s.id === stationId);
    if (station) {
      if (thresholds.tempWarnThreshold !== undefined) station.tempWarnThreshold = thresholds.tempWarnThreshold;
      if (thresholds.tempDangerThreshold !== undefined) station.tempDangerThreshold = thresholds.tempDangerThreshold;
      if (thresholds.smokeWarnThreshold !== undefined) station.smokeWarnThreshold = thresholds.smokeWarnThreshold;
      if (thresholds.smokeDangerThreshold !== undefined) station.smokeDangerThreshold = thresholds.smokeDangerThreshold;
      if (thresholds.fillWarnThreshold !== undefined) station.fillWarnThreshold = thresholds.fillWarnThreshold;
    }
    return station;
  },

  // --- TARIF FLAT PER SETORAN ---
  async getStationTariff(banjarId: string) {
    if (await isDatabaseConnected()) {
      const tariff = await prisma.stationTariff.findUnique({
        where: { banjarId },
      });
      if (tariff) return tariff;
      return prisma.stationTariff.create({
        data: {
          banjarId,
          organicRate: 2000,
          inorganicRate: 3000,
        },
      });
    }
    const mock = getMockDB();
    let tariff = mock.stationTariffs.find((t) => t.banjarId === banjarId);
    if (!tariff) {
      tariff = {
        id: `trf_${Date.now()}`,
        banjarId,
        organicRate: 2000,
        inorganicRate: 3000,
        subRatesJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mock.stationTariffs.push(tariff);
    }
    return tariff;
  },

  async updateStationTariff(banjarId: string, data: { organicRate: number; inorganicRate: number; subRatesJson?: string }) {
    if (await isDatabaseConnected()) {
      return prisma.stationTariff.upsert({
        where: { banjarId },
        create: {
          banjarId,
          organicRate: data.organicRate,
          inorganicRate: data.inorganicRate,
          subRatesJson: data.subRatesJson ?? null,
        },
        update: {
          organicRate: data.organicRate,
          inorganicRate: data.inorganicRate,
          subRatesJson: data.subRatesJson ?? null,
        },
      });
    }
    const mock = getMockDB();
    let tariff = mock.stationTariffs.find((t) => t.banjarId === banjarId);
    if (!tariff) {
      tariff = {
        id: `trf_${Date.now()}`,
        banjarId,
        organicRate: data.organicRate,
        inorganicRate: data.inorganicRate,
        subRatesJson: data.subRatesJson ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mock.stationTariffs.push(tariff);
    } else {
      tariff.organicRate = data.organicRate;
      tariff.inorganicRate = data.inorganicRate;
      if (data.subRatesJson !== undefined) tariff.subRatesJson = data.subRatesJson;
      tariff.updatedAt = new Date();
    }
    return tariff;
  },

  // --- SESI SETOR IOT BARU ---
  async getActiveSessionByStation(stationId: string) {
    const now = new Date();
    if (await isDatabaseConnected()) {
      return prisma.depositSession.findFirst({
        where: {
          stationId,
          status: { in: [SessionStatus.WAITING_TRASH, SessionStatus.TRASH_DETECTED] },
          expiresAt: { gt: now },
        },
        include: { citizen: true, station: true },
        orderBy: { createdAt: "desc" },
      });
    }
    const mock = getMockDB();
    if (!mock.depositSessions) mock.depositSessions = [];
    const session = mock.depositSessions
      .filter(
        (s) =>
          s.stationId === stationId &&
          (s.status === SessionStatus.WAITING_TRASH || s.status === SessionStatus.TRASH_DETECTED) &&
          s.expiresAt > now
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!session) return null;
    const citizen = mock.users.find((u) => u.id === session.citizenId) || null;
    const station = mock.stations.find((s) => s.id === session.stationId) || null;
    return { ...session, citizen, station };
  },

  async createDepositSession(data: { stationId: string; citizenId: string }) {
    const now = new Date();
    const EXPIRES_MINUTES = 5;
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60 * 1000);

    // Rate-limit: batasi jumlah setoran per warga per jam (maks 10 sesi/jam)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Cek apakah ada sesi aktif di stasiun yang sama
    const existingActive = await this.getActiveSessionByStation(data.stationId);
    if (existingActive) {
      if (existingActive.citizenId === data.citizenId) {
        return existingActive; // Kembalikan sesi milik warga tersebut
      }
      throw new Error("Stasiun sedang digunakan oleh warga lain. Silakan tunggu hingga sesi selesai.");
    }

    const sessionCode = `SES-${Date.now().toString().slice(-6)}`;

    if (await isDatabaseConnected()) {
      const recentSessionsCount = await prisma.depositSession.count({
        where: {
          citizenId: data.citizenId,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (recentSessionsCount >= 10) {
        throw new Error("Batas setoran per jam tercapai (maks 10 setoran/jam). Coba lagi nanti.");
      }

      return prisma.depositSession.create({
        data: {
          sessionCode,
          stationId: data.stationId,
          citizenId: data.citizenId,
          status: SessionStatus.WAITING_TRASH,
          expiresAt,
        },
        include: { station: true },
      });
    }

    const mock = getMockDB();
    if (!mock.depositSessions) mock.depositSessions = [];
    const recentSessionsCount = mock.depositSessions.filter(
      (s) => s.citizenId === data.citizenId && s.createdAt >= oneHourAgo
    ).length;
    if (recentSessionsCount >= 10) {
      throw new Error("Batas setoran per jam tercapai (maks 10 setoran/jam). Coba lagi nanti.");
    }

    const session = {
      id: `ses_${Date.now()}`,
      sessionCode,
      stationId: data.stationId,
      citizenId: data.citizenId,
      status: SessionStatus.WAITING_TRASH,
      userCategory: null,
      imageUrl: null,
      eventTriggeredAt: null,
      eventDistanceCm: null,
      aiCategory: null,
      aiSubCategory: null,
      aiConfidence: null,
      aiReason: null,
      aiTips: null,
      aiRawResponse: null,
      isCorrected: false,
      isCheatingSuspected: false,
      retryCount: 0,
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: null,
      rewardAmount: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    mock.depositSessions.push(session);
    const station = mock.stations.find((s) => s.id === session.stationId) || null;
    return { ...session, station };
  },

  async getSessionById(sessionId: string) {
    if (await isDatabaseConnected()) {
      return prisma.depositSession.findUnique({
        where: { id: sessionId },
        include: {
          station: true,
          citizen: true,
          events: true,
          ledgerEntry: true,
        },
      });
    }
    const mock = getMockDB();
    const session = mock.depositSessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const station = mock.stations.find((s) => s.id === session.stationId) || null;
    const citizen = mock.users.find((u) => u.id === session.citizenId) || null;
    const events = mock.stationEvents.filter((e) => e.sessionId === session.id);
    const ledgerEntry = mock.ledger.find((l) => l.sessionId === session.id) || null;
    return { ...session, station, citizen, events, ledgerEntry };
  },

  // Endpoint Event Ultrasonic (POST /api/ingest/event)
  async recordStationEvent(data: {
    stationId: string;
    type?: string;
    distanceCm?: number;
    rawPayload?: string;
  }) {
    const now = new Date();
    const DEBOUNCE_MS = 5000;

    // Debounce server-side: abaikan event ganda dalam 5 detik di stasiun yang sama
    if (await isDatabaseConnected()) {
      const recentEvent = await prisma.stationEvent.findFirst({
        where: {
          stationId: data.stationId,
          createdAt: { gte: new Date(now.getTime() - DEBOUNCE_MS) },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recentEvent) {
        return { debounced: true, event: recentEvent };
      }

      // Cari sesi aktif
      const activeSession = await prisma.depositSession.findFirst({
        where: {
          stationId: data.stationId,
          status: SessionStatus.WAITING_TRASH,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });

      const event = await prisma.stationEvent.create({
        data: {
          stationId: data.stationId,
          type: data.type || "waste_in",
          distanceCm: data.distanceCm,
          hasActiveSession: !!activeSession,
          isClaimed: !!activeSession,
          sessionId: activeSession ? activeSession.id : null,
          rawPayload: data.rawPayload,
        },
      });

      if (activeSession) {
        await prisma.depositSession.update({
          where: { id: activeSession.id },
          data: {
            status: SessionStatus.TRASH_DETECTED,
            eventTriggeredAt: now,
            eventDistanceCm: data.distanceCm,
          },
        });
      }

      return { debounced: false, event, sessionUpdated: !!activeSession, sessionId: activeSession?.id };
    }

    const mock = getMockDB();
    const recent = mock.stationEvents
      .filter((e) => e.stationId === data.stationId && now.getTime() - e.createdAt.getTime() < DEBOUNCE_MS)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (recent) {
      return { debounced: true, event: recent };
    }

    const activeSession = mock.depositSessions
      .filter(
        (s) =>
          s.stationId === data.stationId &&
          s.status === SessionStatus.WAITING_TRASH &&
          s.expiresAt > now
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    const event = {
      id: `evt_${Date.now()}`,
      stationId: data.stationId,
      type: data.type || "waste_in",
      distanceCm: data.distanceCm ?? null,
      hasActiveSession: !!activeSession,
      isClaimed: !!activeSession,
      sessionId: activeSession ? activeSession.id : null,
      rawPayload: data.rawPayload || null,
      createdAt: now,
    };
    mock.stationEvents.push(event);

    if (activeSession) {
      activeSession.status = SessionStatus.TRASH_DETECTED;
      activeSession.eventTriggeredAt = now;
      activeSession.eventDistanceCm = data.distanceCm ?? null;
      activeSession.updatedAt = now;
    }

    return { debounced: false, event, sessionUpdated: !!activeSession, sessionId: activeSession?.id };
  },

  // Verifikasi Foto AI & Reward atomic ledger
  async processSessionAiResult(sessionId: string, params: {
    userCategory: "ORGANIK" | "ANORGANIK";
    imageUrl: string;
    aiResult: {
      kategori: "organik" | "anorganik" | "tidak_jelas";
      subjenis: string;
      confidence: number;
      alasan_singkat: string;
      tips_pemilahan: string;
      rawResponse?: string;
    };
  }) {
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error("Sesi tidak ditemukan");
    if (session.status !== SessionStatus.TRASH_DETECTED && session.status !== SessionStatus.WAITING_TRASH) {
      if (session.status === SessionStatus.COMPLETED) {
        throw new Error("Sesi ini sudah selesai dan saldo sudah dikreditkan.");
      }
    }

    // Ambil tarif flat banjar
    const banjarId = session.station?.banjarId || "bjr_kayumas";
    const tariff = await this.getStationTariff(banjarId);

    const { userCategory, imageUrl, aiResult } = params;
    const userCatLower = userCategory.toLowerCase();
    const aiCatLower = aiResult.kategori.toLowerCase();

    let newStatus: SessionStatus = SessionStatus.COMPLETED;
    let isCorrected = false;
    let isCheatingSuspected = false;
    let rewardAmount = 0;

    // Aturan Keputusan:
    // 1. Match + confidence >= 0.7 -> DISETUJUI
    if (aiCatLower === userCatLower && aiResult.confidence >= 0.7) {
      newStatus = SessionStatus.COMPLETED;
      rewardAmount = userCatLower === "organik" ? tariff.organicRate : tariff.inorganicRate;
    }
    // 2. Mismatch + confidence >= 0.7 -> DIKOREKSI AI (reward sesuai kategori AI)
    else if ((aiCatLower === "organik" || aiCatLower === "anorganik") && aiCatLower !== userCatLower && aiResult.confidence >= 0.7) {
      newStatus = SessionStatus.COMPLETED;
      isCorrected = true;
      isCheatingSuspected = true;
      rewardAmount = aiCatLower === "organik" ? tariff.organicRate : tariff.inorganicRate;
    }
    // 3. Confidence < 0.7 atau tidak_jelas
    else {
      if (session.retryCount < 2) {
        // Izinkan user foto ulang maks 2x
        newStatus = SessionStatus.TRASH_DETECTED; // Tetap di status untuk foto ulang
      } else {
        // Fallback: perlu tinjauan petugas, saldo tertahan
        newStatus = SessionStatus.NEEDS_REVIEW;
      }
      rewardAmount = 0;
    }

    if (await isDatabaseConnected()) {
      return prisma.$transaction(async (tx) => {
        const updatedSession = await tx.depositSession.update({
          where: { id: sessionId },
          data: {
            userCategory: userCategory as WasteCategory,
            imageUrl,
            aiCategory: aiResult.kategori,
            aiSubCategory: aiResult.subjenis,
            aiConfidence: aiResult.confidence,
            aiReason: aiResult.alasan_singkat,
            aiTips: aiResult.tips_pemilahan,
            aiRawResponse: aiResult.rawResponse ?? null,
            isCorrected,
            isCheatingSuspected,
            retryCount: aiResult.confidence < 0.7 || aiResult.kategori === "tidak_jelas" ? session.retryCount + 1 : session.retryCount,
            status: newStatus,
            rewardAmount,
          },
        });

        // Jika approved / dikoreksi otomatis cairkan poin flat via PointLedger atomic
        if (newStatus === SessionStatus.COMPLETED && rewardAmount > 0) {
          const desc = isCorrected
            ? `Setoran Sampah ${aiCatLower.toUpperCase()} (Koreksi AI dari ${userCategory}) - Sesi ${session.sessionCode}`
            : `Setoran Sampah ${userCategory} - Sesi ${session.sessionCode}`;

          await tx.pointLedger.create({
            data: {
              userId: session.citizenId,
              amount: rewardAmount,
              type: "DEPOSIT_SESSION",
              description: desc,
              sessionId: session.id,
            },
          });
        }

        return updatedSession;
      });
    }

    const mock = getMockDB();
    const mockSession = mock.depositSessions.find((s) => s.id === sessionId);
    if (!mockSession) throw new Error("Sesi mock tidak ditemukan");

    mockSession.userCategory = userCategory as WasteCategory;
    mockSession.imageUrl = imageUrl;
    mockSession.aiCategory = aiResult.kategori;
    mockSession.aiSubCategory = aiResult.subjenis;
    mockSession.aiConfidence = aiResult.confidence;
    mockSession.aiReason = aiResult.alasan_singkat;
    mockSession.aiTips = aiResult.tips_pemilahan;
    mockSession.aiRawResponse = aiResult.rawResponse || null;
    mockSession.isCorrected = isCorrected;
    mockSession.isCheatingSuspected = isCheatingSuspected;
    if (aiResult.confidence < 0.7 || aiResult.kategori === "tidak_jelas") {
      mockSession.retryCount += 1;
    }
    mockSession.status = newStatus;
    mockSession.rewardAmount = rewardAmount;
    mockSession.updatedAt = new Date();

    if (newStatus === SessionStatus.COMPLETED && rewardAmount > 0) {
      const desc = isCorrected
        ? `Setoran Sampah ${aiCatLower.toUpperCase()} (Koreksi AI dari ${userCategory}) - Sesi ${session.sessionCode}`
        : `Setoran Sampah ${userCategory} - Sesi ${session.sessionCode}`;

      mock.ledger.push({
        id: `led_${Date.now()}`,
        userId: session.citizenId,
        amount: rewardAmount,
        type: "DEPOSIT_SESSION",
        description: desc,
        sessionId: session.id,
        depositId: null,
        withdrawalId: null,
        createdAt: new Date(),
      });
    }

    return mockSession;
  },

  // Antrean tinjauan petugas (NEEDS_REVIEW)
  async getPendingReviewSessions(banjarId?: string) {
    if (await isDatabaseConnected()) {
      return prisma.depositSession.findMany({
        where: {
          status: SessionStatus.NEEDS_REVIEW,
          ...(banjarId ? { station: { banjarId } } : {}),
        },
        include: {
          citizen: true,
          station: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }
    const mock = getMockDB();
    if (!mock.depositSessions) mock.depositSessions = [];
    return mock.depositSessions
      .filter((s) => s.status === SessionStatus.NEEDS_REVIEW)
      .map((s) => {
        const citizen = mock.users.find((u) => u.id === s.citizenId) || null;
        const station = mock.stations.find((st) => st.id === s.stationId) || null;
        return { ...s, citizen, station };
      })
      .filter((s) => !banjarId || s.station?.banjarId === banjarId);
  },

  // Persetujuan atau koreksi manual oleh petugas
  async officerReviewSession(sessionId: string, params: {
    officerId: string;
    decision: "APPROVE_AS_IS" | "CORRECT_CATEGORY" | "REJECT";
    finalCategory?: "ORGANIK" | "ANORGANIK";
    notes?: string;
  }) {
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error("Sesi tidak ditemukan");
    if (session.status !== SessionStatus.NEEDS_REVIEW) {
      throw new Error("Sesi tidak sedang dalam status menunggu tinjauan.");
    }

    const banjarId = session.station?.banjarId || "bjr_kayumas";
    const tariff = await this.getStationTariff(banjarId);
    let rewardAmount = 0;
    let finalStatus: SessionStatus = SessionStatus.COMPLETED;
    let chosenCategory = session.userCategory || WasteCategory.ANORGANIK;

    if (params.decision === "REJECT") {
      finalStatus = SessionStatus.REJECTED;
      rewardAmount = 0;
    } else if (params.decision === "CORRECT_CATEGORY" && params.finalCategory) {
      finalStatus = SessionStatus.COMPLETED;
      chosenCategory = params.finalCategory as WasteCategory;
      rewardAmount = params.finalCategory === "ORGANIK" ? tariff.organicRate : tariff.inorganicRate;
    } else {
      // APPROVE_AS_IS
      finalStatus = SessionStatus.COMPLETED;
      rewardAmount = session.userCategory === "ORGANIK" ? tariff.organicRate : tariff.inorganicRate;
    }

    const now = new Date();

    if (await isDatabaseConnected()) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.depositSession.update({
          where: { id: sessionId },
          data: {
            status: finalStatus,
            rewardAmount,
            userCategory: chosenCategory,
            reviewedById: params.officerId,
            reviewedAt: now,
            reviewNotes: params.notes || `Keputusan petugas: ${params.decision}`,
            isCorrected: params.decision === "CORRECT_CATEGORY",
          },
        });

        if (finalStatus === SessionStatus.COMPLETED && rewardAmount > 0) {
          await tx.pointLedger.create({
            data: {
              userId: session.citizenId,
              amount: rewardAmount,
              type: "DEPOSIT_SESSION",
              description: `Persetujuan Petugas: Setoran ${chosenCategory} (Sesi ${session.sessionCode})`,
              sessionId: session.id,
            },
          });
        }
        return updated;
      });
    }

    const mock = getMockDB();
    const s = mock.depositSessions.find((item) => item.id === sessionId);
    if (!s) throw new Error("Mock session not found");

    s.status = finalStatus;
    s.rewardAmount = rewardAmount;
    s.userCategory = chosenCategory;
    s.reviewedById = params.officerId;
    s.reviewedAt = now;
    s.reviewNotes = params.notes || `Keputusan petugas: ${params.decision}`;
    s.isCorrected = params.decision === "CORRECT_CATEGORY";
    s.updatedAt = now;

    if (finalStatus === SessionStatus.COMPLETED && rewardAmount > 0) {
      mock.ledger.push({
        id: `led_${Date.now()}`,
        userId: session.citizenId,
        amount: rewardAmount,
        type: "DEPOSIT_SESSION",
        description: `Persetujuan Petugas: Setoran ${chosenCategory} (Sesi ${session.sessionCode})`,
        sessionId: session.id,
        depositId: null,
        withdrawalId: null,
        createdAt: now,
      });
    }
    return s;
  },

  // Riwayat sesi untuk profil Warga
  async getCitizenSessions(citizenId: string, limit = 20) {
    if (await isDatabaseConnected()) {
      return prisma.depositSession.findMany({
        where: { citizenId },
        include: { station: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }
    const mock = getMockDB();
    if (!mock.depositSessions) mock.depositSessions = [];
    return mock.depositSessions
      .filter((s) => s.citizenId === citizenId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((s) => {
        const station = mock.stations.find((st) => st.id === s.stationId) || null;
        return { ...s, station };
      });
  },

  // --- BANK SAMPAH / TRANSACTIONS ---
  async getWasteTypes(banjarId: string) {
    if (await isDatabaseConnected()) {
      return prisma.wasteType.findMany({
        where: { banjarId, active: true },
        orderBy: { kode: "asc" },
      });
    }
    const mock = getMockDB();
    return mock.wasteTypes.filter((w) => w.banjarId === banjarId && w.active);
  },

  async createWasteType(data: {
    banjarId: string;
    kode: string;
    nama: string;
    category: any;
    pricePerKg: number;
    unit?: string;
  }) {
    if (await isDatabaseConnected()) {
      return prisma.wasteType.create({ data });
    }
    const mock = getMockDB();
    const wt = {
      id: `wt_${Date.now()}`,
      banjarId: data.banjarId,
      kode: data.kode,
      nama: data.nama,
      category: data.category,
      pricePerKg: data.pricePerKg,
      unit: data.unit || "kg",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mock.wasteTypes.push(wt);
    return wt;
  },

  async recordDeposit(data: {
    citizenId: string;
    operatorId: string;
    wasteTypeId: string;
    weightKg: number;
    pricePerKg: number;
    totalAmount: number;
    imageUrl?: string;
    aiPredicted?: boolean;
    notes?: string;
  }) {
    if (await isDatabaseConnected()) {
      return prisma.$transaction(async (tx) => {
        const deposit = await tx.deposit.create({
          data: {
            citizenId: data.citizenId,
            operatorId: data.operatorId,
            wasteTypeId: data.wasteTypeId,
            weightKg: data.weightKg,
            pricePerKg: data.pricePerKg,
            totalAmount: data.totalAmount,
            imageUrl: data.imageUrl,
            aiPredicted: data.aiPredicted || false,
            notes: data.notes,
          },
        });
        await tx.pointLedger.create({
          data: {
            userId: data.citizenId,
            amount: data.totalAmount,
            type: "DEPOSIT",
            description: `Setoran ${data.weightKg} kg sampah terpilah`,
            depositId: deposit.id,
          },
        });
        return deposit;
      });
    }

    const mock = getMockDB();
    const deposit = {
      id: `dep_${Date.now()}`,
      citizenId: data.citizenId,
      operatorId: data.operatorId,
      wasteTypeId: data.wasteTypeId,
      weightKg: data.weightKg,
      pricePerKg: data.pricePerKg,
      totalAmount: data.totalAmount,
      imageUrl: data.imageUrl || null,
      aiPredicted: data.aiPredicted || false,
      notes: data.notes || null,
      createdAt: new Date(),
    };
    mock.deposits.push(deposit);
    mock.ledger.push({
      id: `led_${Date.now()}`,
      userId: data.citizenId,
      amount: data.totalAmount,
      type: "DEPOSIT",
      description: `Setoran ${data.weightKg} kg sampah terpilah`,
      depositId: deposit.id,
      withdrawalId: null,
      sessionId: null,
      createdAt: new Date(),
    });
    return deposit;
  },

  async getCitizens(banjarId: string) {
    if (await isDatabaseConnected()) {
      const users = await prisma.user.findMany({
        where: { banjarId, role: Role.WARGA },
        select: { id: true, name: true, email: true, phone: true },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        saldoRupiah: 0,
      }));
    }
    const mock = getMockDB();
    return mock.users
      .filter((u) => u.banjarId === banjarId && u.role === Role.WARGA)
      .map((u) => {
        const balance = mock.ledger
          .filter((l) => l.userId === u.id)
          .reduce((acc, l) => acc + l.amount, 0);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          saldoRupiah: balance,
        };
      });
  },

  async getUserBalance(userId: string): Promise<number> {
    if (await isDatabaseConnected()) {
      const sum = await prisma.pointLedger.aggregate({
        where: { userId },
        _sum: { amount: true },
      });
      return sum._sum.amount || 0;
    }
    const mock = getMockDB();
    return mock.ledger
      .filter((l) => l.userId === userId)
      .reduce((acc, cur) => acc + cur.amount, 0);
  },

  async getUserLedger(userId: string) {
    if (await isDatabaseConnected()) {
      return prisma.pointLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          depositSession: { include: { station: true } },
          withdrawal: true,
        },
      });
    }
    const mock = getMockDB();
    return mock.ledger
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((l) => {
        const depositSession = l.sessionId ? mock.depositSessions.find((s) => s.id === l.sessionId) : null;
        const station = depositSession ? mock.stations.find((st) => st.id === depositSession.stationId) : null;
        const withdrawal = mock.withdrawals.find((w) => w.id === l.withdrawalId);
        return {
          ...l,
          depositSession: depositSession ? { ...depositSession, station } : null,
          withdrawal: withdrawal || null,
        };
      });
  },

  async requestWithdrawal(userId: string, amount: number, notes?: string) {
    const currentBalance = await this.getUserBalance(userId);
    if (currentBalance < amount) {
      throw new Error("Saldo tidak mencukupi untuk penarikan ini.");
    }

    if (await isDatabaseConnected()) {
      return prisma.withdrawal.create({
        data: {
          userId,
          amount,
          notes,
          status: "PENDING",
        },
      });
    }

    const mock = getMockDB();
    const withdrawal = {
      id: `wdr_${Date.now()}`,
      userId,
      amount,
      status: "PENDING" as const,
      notes: notes || null,
      processedAt: null,
      processedBy: null,
      createdAt: new Date(),
    };
    mock.withdrawals.push(withdrawal);
    return withdrawal;
  },

  async approveWithdrawal(withdrawalId: string, operatorId: string) {
    if (await isDatabaseConnected()) {
      return prisma.$transaction(async (tx) => {
        const withdrawal = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: "APPROVED",
            processedAt: new Date(),
            processedBy: operatorId,
          },
        });
        await tx.pointLedger.create({
          data: {
            userId: withdrawal.userId,
            amount: -withdrawal.amount,
            type: "WITHDRAWAL",
            description: `Pencairan saldo Rp${withdrawal.amount.toLocaleString("id-ID")}`,
            withdrawalId: withdrawal.id,
          },
        });
        return withdrawal;
      });
    }

    const mock = getMockDB();
    const wdr = mock.withdrawals.find((w) => w.id === withdrawalId);
    if (!wdr) throw new Error("Withdrawal not found");
    wdr.status = "APPROVED";
    wdr.processedAt = new Date();
    wdr.processedBy = operatorId;

    mock.ledger.push({
      id: `led_${Date.now()}`,
      userId: wdr.userId,
      amount: -wdr.amount,
      type: "WITHDRAWAL",
      description: `Pencairan saldo Rp${wdr.amount.toLocaleString("id-ID")}`,
      depositId: null,
      withdrawalId: wdr.id,
      sessionId: null,
      createdAt: new Date(),
    });
    return wdr;
  },

  async getPendingWithdrawals(banjarId?: string) {
    if (await isDatabaseConnected()) {
      return prisma.withdrawal.findMany({
        where: {
          status: "PENDING",
          ...(banjarId ? { user: { banjarId } } : {}),
        },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
    }
    const mock = getMockDB();
    return mock.withdrawals
      .filter((w) => w.status === "PENDING")
      .map((w) => {
        const user = mock.users.find((u) => u.id === w.userId) || null;
        return { ...w, user };
      })
      .filter((w) => !banjarId || w.user?.banjarId === banjarId);
  },

  async getBanjarReport(banjarId: string) {
    if (await isDatabaseConnected()) {
      const sessions = await prisma.depositSession.findMany({
        where: { station: { banjarId } },
        orderBy: { createdAt: "desc" },
      });
      return sessions;
    }
    const mock = getMockDB();
    if (!mock.depositSessions) mock.depositSessions = [];
    const stationIds = new Set((mock.stations || []).filter((s) => s.banjarId === banjarId).map((s) => s.id));
    return mock.depositSessions.filter((s) => stationIds.has(s.stationId));
  },
};
