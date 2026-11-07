import { Role, AlertLevel, AlertStatus, WasteCategory, WithdrawalStatus, SessionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

// In-memory persistent demo store for mock DB mode when Postgres is unavailable
export interface MockDB {
  banjars: Array<{
    id: string;
    kode: string;
    nama: string;
    alamat: string | null;
    kecamatan: string;
    kabupaten: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    phone: string | null;
    role: Role;
    banjarId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  stations: Array<{
    id: string;
    deviceId: string;
    apiKey: string;
    name: string;
    lokasi: string;
    banjarId: string;
    tempWarnThreshold: number;
    tempDangerThreshold: number;
    smokeWarnThreshold: number;
    smokeDangerThreshold: number;
    fillWarnThreshold: number;
    currentFillLevel: number;
    lastFillAlertAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  readings: Array<{
    id: string;
    stationId: string;
    temp: number;
    smoke: number;
    humidity: number | null;
    fillLevel: number | null;
    createdAt: Date;
  }>;
  stationEvents: Array<{
    id: string;
    stationId: string;
    type: string;
    distanceCm: number | null;
    hasActiveSession: boolean;
    isClaimed: boolean;
    sessionId: string | null;
    rawPayload: string | null;
    createdAt: Date;
  }>;
  stationTariffs: Array<{
    id: string;
    banjarId: string;
    organicRate: number;
    inorganicRate: number;
    subRatesJson: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  depositSessions: Array<{
    id: string;
    sessionCode: string;
    stationId: string;
    citizenId: string;
    status: SessionStatus;
    userCategory: WasteCategory | null;
    imageUrl: string | null;
    eventTriggeredAt: Date | null;
    eventDistanceCm: number | null;
    aiCategory: string | null;
    aiSubCategory: string | null;
    aiConfidence: number | null;
    aiReason: string | null;
    aiTips: string | null;
    aiRawResponse: string | null;
    isCorrected: boolean;
    isCheatingSuspected: boolean;
    retryCount: number;
    reviewedById: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    rewardAmount: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
  alerts: Array<{
    id: string;
    stationId: string;
    type: string;
    level: AlertLevel;
    value: number;
    status: AlertStatus;
    resolvedAt: Date | null;
    resolvedBy: string | null;
    createdAt: Date;
  }>;
  wasteTypes: Array<{
    id: string;
    banjarId: string;
    kode: string;
    nama: string;
    category: WasteCategory;
    pricePerKg: number;
    unit: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  deposits: Array<{
    id: string;
    citizenId: string;
    operatorId: string;
    wasteTypeId: string;
    weightKg: number;
    pricePerKg: number;
    totalAmount: number;
    imageUrl: string | null;
    aiPredicted: boolean;
    notes: string | null;
    createdAt: Date;
  }>;
  ledger: Array<{
    id: string;
    userId: string;
    amount: number;
    type: string;
    description: string;
    sessionId: string | null;
    depositId: string | null;
    withdrawalId: string | null;
    createdAt: Date;
  }>;
  withdrawals: Array<{
    id: string;
    userId: string;
    amount: number;
    status: WithdrawalStatus;
    notes: string | null;
    processedAt: Date | null;
    processedBy: string | null;
    createdAt: Date;
  }>;
}

declare global {
  // eslint-disable-next-line no-var
  var __ECOSORT_MOCK_DB__: MockDB | undefined;
}

function initSeed(): MockDB {
  const hash = bcrypt.hashSync("password123", 10);
  const now = new Date();

  // Banjar 1: Banjar Kayumas (Denpasar Selatan)
  // Banjar 2: Banjar Kuta Seminyak (Badung)
  const b1 = {
    id: "bjr_kayumas",
    kode: "BJR-KYM-01",
    nama: "Banjar Kayumas Kaja",
    alamat: "Jl. Surapati No. 12, Denpasar",
    kecamatan: "Denpasar Timur",
    kabupaten: "Denpasar",
    createdAt: now,
    updatedAt: now,
  };

  const b2 = {
    id: "bjr_seminyak",
    kode: "BJR-SMY-02",
    nama: "Banjar Seminyak Kaja",
    alamat: "Jl. Raya Seminyak No. 88, Badung",
    kecamatan: "Kuta",
    kabupaten: "Badung",
    createdAt: now,
    updatedAt: now,
  };

  const users = [
    {
      id: "usr_admin_1",
      email: "admin@kayumas.banjar.id",
      passwordHash: hash,
      name: "I Gusti Ngurah Agung",
      phone: "081234567890",
      role: Role.ADMIN_BANJAR,
      banjarId: b1.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_petugas_1",
      email: "petugas@kayumas.banjar.id",
      passwordHash: hash,
      name: "I Made Sukadana",
      phone: "081234567891",
      role: Role.PETUGAS,
      banjarId: b1.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_warga_1",
      email: "warga@kayumas.banjar.id",
      passwordHash: hash,
      name: "I Wayan Sudiarta",
      phone: "081234567892",
      role: Role.WARGA,
      banjarId: b1.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_warga_2",
      email: "putu.rai@kayumas.banjar.id",
      passwordHash: hash,
      name: "Ni Luh Putu Rai",
      phone: "081234567893",
      role: Role.WARGA,
      banjarId: b1.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_warga_3",
      email: "ketut.dana@kayumas.banjar.id",
      passwordHash: hash,
      name: "I Ketut Mardana",
      phone: "081234567894",
      role: Role.WARGA,
      banjarId: b1.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const stations = [
    {
      id: "st_001",
      deviceId: "ST-001",
      apiKey: "ecosort_key_st001_secret",
      name: "Stasiun TPST Terpadu Kayumas",
      lokasi: "Kawasan Bank Sampah Banjar Kayumas",
      banjarId: b1.id,
      tempWarnThreshold: 45.0,
      tempDangerThreshold: 60.0,
      smokeWarnThreshold: 300.0,
      smokeDangerThreshold: 600.0,
      fillWarnThreshold: 80.0,
      currentFillLevel: 42.0,
      lastFillAlertAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "st_002",
      deviceId: "ST-002",
      apiKey: "ecosort_key_st002_secret",
      name: "Stasiun TPS Seminyak Coastal",
      lokasi: "Depot Sampah Pantai Seminyak",
      banjarId: b2.id,
      tempWarnThreshold: 45.0,
      tempDangerThreshold: 60.0,
      smokeWarnThreshold: 300.0,
      smokeDangerThreshold: 600.0,
      fillWarnThreshold: 80.0,
      currentFillLevel: 84.5,
      lastFillAlertAt: new Date(now.getTime() - 40 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 24 jam sensor readings untuk ST-001
  const readings: MockDB["readings"] = [];
  const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;
  for (let i = 0; i <= 24; i++) {
    const timestamp = new Date(twentyFourHoursAgo + i * 60 * 60 * 1000);
    const temp = Number((30 + Math.sin(i / 3) * 4 + (Math.random() * 1.5 - 0.75)).toFixed(1));
    const smoke = Math.floor(110 + Math.cos(i / 2) * 35 + Math.random() * 20);
    const humidity = Number((68 + Math.sin(i / 4) * 8).toFixed(1));
    const fillLevel = Math.min(95, Math.floor(20 + i * 2.5));

    readings.push({
      id: `rd_${i}`,
      stationId: "st_001",
      temp,
      smoke,
      humidity,
      fillLevel,
      createdAt: timestamp,
    });
  }

  // Bacaan terkini 5 detik lalu agar stasiun ONLINE
  readings.push({
    id: `rd_latest`,
    stationId: "st_001",
    temp: 32.4,
    smoke: 135,
    humidity: 71.0,
    fillLevel: 42.0,
    createdAt: new Date(now.getTime() - 5000),
  });

  const alerts: MockDB["alerts"] = [
    {
      id: "alt_01",
      stationId: "st_001",
      type: "TEMPERATURE",
      level: AlertLevel.WASPADA,
      value: 46.2,
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      resolvedBy: "I Made Sukadana",
      createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
    },
    {
      id: "alt_02",
      stationId: "st_002",
      type: "BIN_FULL",
      level: AlertLevel.WASPADA,
      value: 84.5,
      status: AlertStatus.ACTIVE,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date(now.getTime() - 40 * 60 * 1000),
    },
  ];

  // Tarif Flat Banjar
  const stationTariffs: MockDB["stationTariffs"] = [
    {
      id: "trf_kayumas",
      banjarId: b1.id,
      organicRate: 2000,
      inorganicRate: 3000,
      subRatesJson: JSON.stringify({
        plastik: 3000,
        kertas: 2500,
        logam: 4000,
        kaca: 2000,
        sisa_makanan: 2000,
        daun: 2000,
      }),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "trf_seminyak",
      banjarId: b2.id,
      organicRate: 2500,
      inorganicRate: 3500,
      subRatesJson: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Sesi Setor IoT Baru
  const depositSessions: MockDB["depositSessions"] = [
    {
      id: "ses_demo_1",
      sessionCode: "SES-882191",
      stationId: "st_001",
      citizenId: "usr_warga_1",
      status: SessionStatus.COMPLETED,
      userCategory: WasteCategory.ORGANIK,
      imageUrl: "/samples/sample-canang.png",
      eventTriggeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      eventDistanceCm: 14.2,
      aiCategory: "organik",
      aiSubCategory: "daun",
      aiConfidence: 0.96,
      aiReason: "Terdeteksi janur daun kelapa & sisa bunga canang upakara Bali.",
      aiTips: "Sangat baik untuk bahan pupuk kompos organik banjar.",
      aiRawResponse: null,
      isCorrected: false,
      isCheatingSuspected: false,
      retryCount: 0,
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: null,
      rewardAmount: 2000,
      expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 45000),
    },
    {
      id: "ses_demo_2",
      sessionCode: "SES-882192",
      stationId: "st_001",
      citizenId: "usr_warga_1",
      status: SessionStatus.COMPLETED,
      userCategory: WasteCategory.ORGANIK, // User pilih organik padahal plastik
      imageUrl: "/samples/sample-pet.png",
      eventTriggeredAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      eventDistanceCm: 11.5,
      aiCategory: "anorganik",
      aiSubCategory: "plastik",
      aiConfidence: 0.94,
      aiReason: "AI Vision mendeteksi botol plastik polimer bening (PET), bukan organik.",
      aiTips: "Pilihan dikoreksi otomatis ke tarif anorganik.",
      aiRawResponse: null,
      isCorrected: true,
      isCheatingSuspected: true,
      retryCount: 0,
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: "Koreksi AI otomatis: Pilihan warga Organik terdeteksi Plastik",
      rewardAmount: 3000,
      expiresAt: new Date(now.getTime() - 1 * 60 * 60 * 1000 + 5 * 60 * 1000),
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000 + 50000),
    },
    {
      id: "ses_demo_3",
      sessionCode: "SES-882193",
      stationId: "st_001",
      citizenId: "usr_warga_2",
      status: SessionStatus.NEEDS_REVIEW,
      userCategory: WasteCategory.ANORGANIK,
      imageUrl: "/samples/sample-pet.png",
      eventTriggeredAt: new Date(now.getTime() - 25 * 60 * 1000),
      eventDistanceCm: 16.0,
      aiCategory: "tidak_jelas",
      aiSubCategory: "lainnya",
      aiConfidence: 0.52,
      aiReason: "Pencahayaan foto minim dan sudut pengambilan objek terpotong.",
      aiTips: "Perlu konfirmasi fisik oleh petugas pos timbang banjar.",
      aiRawResponse: null,
      isCorrected: false,
      isCheatingSuspected: false,
      retryCount: 2,
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: null,
      rewardAmount: 0,
      expiresAt: new Date(now.getTime() - 25 * 60 * 1000 + 5 * 60 * 1000),
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 25 * 60 * 1000 + 60000),
    },
  ];

  const stationEvents: MockDB["stationEvents"] = [
    {
      id: "evt_01",
      stationId: "st_001",
      type: "waste_in",
      distanceCm: 14.2,
      hasActiveSession: true,
      isClaimed: true,
      sessionId: "ses_demo_1",
      rawPayload: JSON.stringify({ device_id: "ST-001", distance_cm: 14.2 }),
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: "evt_02",
      stationId: "st_001",
      type: "waste_in",
      distanceCm: 11.5,
      hasActiveSession: true,
      isClaimed: true,
      sessionId: "ses_demo_2",
      rawPayload: JSON.stringify({ device_id: "ST-001", distance_cm: 11.5 }),
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    {
      id: "evt_03",
      stationId: "st_001",
      type: "waste_in",
      distanceCm: 18.0,
      hasActiveSession: false,
      isClaimed: false,
      sessionId: null,
      rawPayload: JSON.stringify({ device_id: "ST-001", distance_cm: 18.0 }),
      createdAt: new Date(now.getTime() - 45 * 60 * 1000),
    },
  ];

  // Kompatibilitas tabel legacy
  const wasteTypes: MockDB["wasteTypes"] = [
    {
      id: "wt_organik",
      banjarId: b1.id,
      kode: "ORG-01",
      nama: "Sampah Organik Canang",
      category: WasteCategory.ORGANIK,
      pricePerKg: 2000,
      unit: "setoran",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "wt_anorganik",
      banjarId: b1.id,
      kode: "ANORG-01",
      nama: "Sampah Anorganik Daur Ulang",
      category: WasteCategory.ANORGANIK,
      pricePerKg: 3000,
      unit: "setoran",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const deposits: MockDB["deposits"] = [];

  const ledger: MockDB["ledger"] = [
    {
      id: "led_01",
      userId: "usr_warga_1",
      amount: 2000,
      type: "DEPOSIT_SESSION",
      description: "Setoran Sampah Organik (Sesi SES-882191)",
      sessionId: "ses_demo_1",
      depositId: null,
      withdrawalId: null,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: "led_02",
      userId: "usr_warga_1",
      amount: 3000,
      type: "DEPOSIT_SESSION",
      description: "Setoran Sampah Anorganik - Koreksi AI (Sesi SES-882192)",
      sessionId: "ses_demo_2",
      depositId: null,
      withdrawalId: null,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
  ];

  const withdrawals: MockDB["withdrawals"] = [
    {
      id: "wd_01",
      userId: "usr_warga_1",
      amount: 2500,
      status: WithdrawalStatus.PENDING,
      notes: "Tukar ke voucher token listrik",
      processedAt: null,
      processedBy: null,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  ];

  return {
    banjars: [b1, b2],
    users,
    stations,
    readings,
    stationEvents,
    stationTariffs,
    depositSessions,
    alerts,
    wasteTypes,
    deposits,
    ledger,
    withdrawals,
  };
}

export function getMockDB(): MockDB {
  if (
    !global.__ECOSORT_MOCK_DB__ ||
    !Array.isArray(global.__ECOSORT_MOCK_DB__.depositSessions) ||
    !Array.isArray(global.__ECOSORT_MOCK_DB__.stationEvents) ||
    !Array.isArray(global.__ECOSORT_MOCK_DB__.stations) ||
    !Array.isArray(global.__ECOSORT_MOCK_DB__.ledger) ||
    !Array.isArray(global.__ECOSORT_MOCK_DB__.wasteTypes)
  ) {
    global.__ECOSORT_MOCK_DB__ = initSeed();
  }
  return global.__ECOSORT_MOCK_DB__;
}

export function resetMockDB(): MockDB {
  global.__ECOSORT_MOCK_DB__ = initSeed();
  return global.__ECOSORT_MOCK_DB__;
}
