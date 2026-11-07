# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (React full-stack)

## Users

Two primary roles:

1. **Nasabah (Bank Sampah members)** — Warga Bali yang menyetor sampah ke Bank Sampah. Butuh cara mudah cek poin reward daur ulang, riwayat setoran, dan redeem reward. Akses via smartphone browser.
2. **Operator Bank Sampah** — Pengelola Bank Sampah yang memantau kondisi tempat sampah, keselamatan (suhu, gas), dan logistik penjemputan. Butuh dashboard real-time dengan insight AI.

## Product Purpose

Platform web Smart Waste Management yang menghubungkan data IoT hardware (sensor ultrasonik, suhu, gas, motor servo) dengan dashboard web. Tujuan:
- Nasabah: pencatatan & reward daur ulang (model Octopus/Rekosistem)
- Operator: monitoring keselamatan real-time + rekomendasi rute penjemputan berbasis AI
- Mempermudah pengelolaan Bank Sampah di Bali secara digital

Sukses = adopsi Bank Sampah di Bali, peningkatan partisipasi daur ulang, zero insiden keselamatan yang terlewat.

## Positioning

Integrasi IoT telemetry + AI anomaly detection + reward system dalam satu platform khusus Bank Sampah. Bukan generic waste management — spesifik untuk ekosistem Bank Sampah Indonesia dengan model poin reward nasabah.

## Operating Context

- Hardware: sensor ultrasonik (kapasitas bin), sensor suhu & gas (deteksi kebakaran/kebocoran), motor servo (pemilahan otomatis)
- Data flow: hardware → telemetry data → web dashboard
- Dua portal terpisah: nasabah portal dan operator dashboard
- Lokasi: Bank Sampah di Bali
- Bahasa UI: Bahasa Indonesia (primary)

## Capabilities and Constraints

### Confirmed capabilities
- Portal nasabah: cek poin, riwayat setoran, redeem reward
- Dashboard operator: real-time monitoring bin capacity, suhu, gas levels
- AI anomaly detection: alert keselamatan (kebakaran, gas bocor)
- AI route recommendation: optimasi rute penjemputan sampah
- Integrasi data telemetri dari IoT sensors
- Pemilahan sampah otomatis via servo control

### Undecided
- Sumber data IoT (MQTT, REST API, WebSocket) — belum dikonfirmasi
- Authentication method — belum dikonfirmasi
- Apakah ada mobile app atau web-only
- Sistem pembayaran/redeem reward spesifik

## Evidence on Hand

Tidak ada data, desain, atau aset existing. Project dari nol. Referensi kompetitor: Octopus, Rekosistem (model reward daur ulang).

## Product Principles

1. **Safety first** — Anomali keselamatan (suhu, gas) harus terdeteksi dan di-alert dalam hitungan detik, bukan menit.
2. **Accessible simplicity** — Nasabah (warga umum) harus bisa pakai tanpa training. Satu tap untuk cek poin.
3. **Data-driven operations** — Setiap keputusan operator didukung data real-time dan rekomendasi AI.
4. **Local context** — Didesain untuk realitas Bank Sampah Bali: bahasa Indonesia, workflow lokal, infrastruktur yang ada.
