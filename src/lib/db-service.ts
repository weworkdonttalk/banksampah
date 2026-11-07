import { prisma } from "@/lib/prisma";
import { getMockDB } from "@/lib/mock-db";
import { Role } from "@prisma/client";
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

  async saveReading(data: { stationId: string; temp: number; smoke: number; humidity?: number }) {
    if (await isDatabaseConnected()) {
      return prisma.sensorReading.create({
        data: {
          stationId: data.stationId,
          temp: data.temp,
          smoke: data.smoke,
          humidity: data.humidity ?? null,
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
      createdAt: new Date(),
    };
    mock.readings.push(reading);
    return reading;
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
    }
    return station;
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
          .reduce((acc, l) => acc + (l.type === "CREDIT" ? l.amount : -l.amount), 0);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          saldoRupiah: balance,
        };
      });
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
      createdAt: new Date(),
    });
    return deposit;
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
          deposit: { include: { wasteType: true } },
          withdrawal: true,
        },
      });
    }
    const mock = getMockDB();
    return mock.ledger
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((l) => {
        const deposit = mock.deposits.find((d) => d.id === l.depositId);
        const wasteType = deposit ? mock.wasteTypes.find((w) => w.id === deposit.wasteTypeId) : null;
        const withdrawal = mock.withdrawals.find((w) => w.id === l.withdrawalId);
        return {
          ...l,
          deposit: deposit ? { ...deposit, wasteType } : null,
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
      createdAt: new Date(),
    });
    return wdr;
  },

  async getBanjarReport(banjarId: string) {
    // Aggregation of total deposits, total kg, breakdown per waste type
    if (await isDatabaseConnected()) {
      const deposits = await prisma.deposit.findMany({
        where: { citizen: { banjarId } },
        include: { wasteType: true },
        orderBy: { createdAt: "desc" },
      });
      return deposits;
    }
    const mock = getMockDB();
    const citizenIds = new Set(mock.users.filter((u) => u.banjarId === banjarId).map((u) => u.id));
    return mock.deposits
      .filter((d) => citizenIds.has(d.citizenId))
      .map((d) => ({
        ...d,
        wasteType: mock.wasteTypes.find((w) => w.id === d.wasteTypeId) || null,
      }));
  },
};
