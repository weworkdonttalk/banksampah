import { Role, AlertLevel, AlertStatus, WasteCategory, WithdrawalStatus } from "@prisma/client";
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
    createdAt: Date;
    updatedAt: Date;
  }>;
  readings: Array<{
    id: string;
    stationId: string;
    temp: number;
    smoke: number;
    humidity: number | null;
    createdAt: Date;
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
      email: "wayan@warga.id",
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
      email: "ketut@warga.id",
      passwordHash: hash,
      name: "Ni Ketut Suartini",
      phone: "081234567893",
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
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 24 jam sensor readings untuk ST-001
  const readings: MockDB["readings"] = [];
  const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;
  for (let i = 0; i <= 24; i++) {
    const timestamp = new Date(twentyFourHoursAgo + i * 60 * 60 * 1000);
    // Variasi suhu 29 - 36 C, gas 90 - 180 ppm
    const temp = Number((30 + Math.sin(i / 3) * 4 + (Math.random() * 1.5 - 0.75)).toFixed(1));
    const smoke = Math.floor(110 + Math.cos(i / 2) * 35 + Math.random() * 20);
    const humidity = Number((68 + Math.sin(i / 4) * 8).toFixed(1));

    readings.push({
      id: `rd_${i}`,
      stationId: "st_001",
      temp,
      smoke,
      humidity,
      createdAt: timestamp,
    });
  }

  // Tambahkan bacaan terkini 5 detik lalu agar stasiun ONLINE
  readings.push({
    id: `rd_latest`,
    stationId: "st_001",
    temp: 32.4,
    smoke: 135,
    humidity: 71.0,
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
      resolvedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      resolvedBy: "I Made Sukadana",
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    },
  ];

  const wasteTypes: MockDB["wasteTypes"] = [
    {
      id: "wt_pet",
      banjarId: b1.id,
      kode: "PLT-PET",
      nama: "Botol Plastik PET Bening",
      category: WasteCategory.ANORGANIK_PLASTIK,
      pricePerKg: 3500,
      unit: "kg",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "wt_hdpe",
      banjarId: b1.id,
      kode: "PLT-HDPE",
      nama: "Plastik Tutup / Jerigen HDPE",
      category: WasteCategory.ANORGANIK_PLASTIK,
      pricePerKg: 4000,
      unit: "kg",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "wt_kardus",
      banjarId: b1.id,
      kode: "KRT-BOX",
      nama: "Kardus Tebal Bersih",
      category: WasteCategory.ANORGANIK_KERTAS,
      pricePerKg: 1800,
      unit: "kg",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "wt_kaleng",
      banjarId: b1.id,
      kode: "MET-ALUM",
      nama: "Kaleng Minuman Aluminium",
      category: WasteCategory.ANORGANIK_LOGAM,
      pricePerKg: 12000,
      unit: "kg",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "wt_organik",
      banjarId: b1.id,
      kode: "ORG-KOMPOS",
      nama: "Sisa Makanan & Sampah Canang (Organik)",
      category: WasteCategory.ORGANIK,
      pricePerKg: 500,
      unit: "kg",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Setoran perdana Wayan
  const deposits: MockDB["deposits"] = [
    {
      id: "dep_01",
      citizenId: "usr_warga_1",
      operatorId: "usr_petugas_1",
      wasteTypeId: "wt_pet",
      weightKg: 4.5,
      pricePerKg: 3500,
      totalAmount: 15750,
      imageUrl: null,
      aiPredicted: true,
      notes: "Botol PET bersih disortir",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "dep_02",
      citizenId: "usr_warga_1",
      operatorId: "usr_petugas_1",
      wasteTypeId: "wt_kardus",
      weightKg: 12.0,
      pricePerKg: 1800,
      totalAmount: 21600,
      imageUrl: null,
      aiPredicted: false,
      notes: "Kardus bekas packing",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const ledger: MockDB["ledger"] = [
    {
      id: "led_01",
      userId: "usr_warga_1",
      amount: 15750,
      type: "DEPOSIT",
      description: "Setoran 4.5 kg Botol Plastik PET Bening",
      depositId: "dep_01",
      withdrawalId: null,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "led_02",
      userId: "usr_warga_1",
      amount: 21600,
      type: "DEPOSIT",
      description: "Setoran 12 kg Kardus Tebal Bersih",
      depositId: "dep_02",
      withdrawalId: null,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const withdrawals: MockDB["withdrawals"] = [];

  return {
    banjars: [b1, b2],
    users,
    stations,
    readings,
    alerts,
    wasteTypes,
    deposits,
    ledger,
    withdrawals,
  };
}

export function getMockDB(): MockDB {
  if (!global.__ECOSORT_MOCK_DB__) {
    global.__ECOSORT_MOCK_DB__ = initSeed();
  }
  return global.__ECOSORT_MOCK_DB__;
}
