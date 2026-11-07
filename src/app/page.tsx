"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import PearCanvas from "@/components/webgl/pear-canvas";
import SmoothScrollProvider from "@/components/landing/smooth-scroll-provider";
import { playSuccessChime } from "@/lib/audio-alert";

const HeroThreeCanvas = dynamic(
  () => import("@/components/landing/hero-three-canvas"),
  { ssr: false }
);

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 1,
    question: "Berapa biaya implementasi EcoSort untuk Banjar / Kawasan?",
    answer:
      "Nol rupiah di awal dan tanpa tarif per jam. Kami mendanai perangkat keras IoT, kecerdasan buatan, dan pelatihan warga secara mandiri. Bagi hasil diambil dari nilai ekonomi daur ulang yang dihasilkan stasiun.",
  },
  {
    id: 2,
    question: "Bagaimana sistem membagi hasil nilai ekonomi sampah?",
    answer:
      "Disepakati per kemitraan Banjar sebelum stasiun dipasang. Berlaku murni atas pertumbuhan tonase terpilah di atas batas dasar (baseline), langsung dikreditkan ke saldo digital warga.",
  },
  {
    id: 3,
    question: "Bagaimana protokol Choke Mode memitigasi kebakaran TPA/TPS?",
    answer:
      "Sensor suhu infrared dan sensor gas MQ membaca korelasi ΔT > 45°C dan gas mudah terbakar > 400 PPM secara real-time. Motor servo seketika mengunci kompartemen rapat 0° dalam 380ms guna memutus suplai oksigen.",
  },
  {
    id: 4,
    question: "Bagaimana keabsahan data timbangan dan emisi CO₂e diukur?",
    answer:
      "Timbangan digital presisi (load cell) terkalibrasi otomatis pada setiap setoran dan diunggah ke buku besar telemetri stasiun. Metrik emisi merujuk pada standar konversi IPCC 2026.",
  },
  {
    id: 5,
    question: "Berapa lama waktu pemasangan hingga stasiun aktif beroperasi?",
    answer:
      "Perangkat IoT mikro terkoneksi dalam hitungan hari melalui jaringan seluler 4G/LTE atau WiFi Banjar. Warga dapat langsung memindai kartu dan menukarkan sampah terpilah.",
  },
];

export default function PearLandingPage() {
  const [activeBeat, setActiveBeat] = useState(0);
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const [activeChapter, setActiveChapter] = useState("model");
  const [footerActive, setFooterActive] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ name: "", email: "", goal: "" });
  const [applySubmitted, setApplySubmitted] = useState(false);

  // Scroll observer: triggers .revealed class on scroll
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.reveal || 0);
            setTimeout(() => {
              el.classList.add("revealed");
            }, delay);
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "50px 0px 50px 0px",
      }
    );

    // Immediately reveal anything already visible in viewport on initial load
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 50) {
        el.classList.add("revealed");
      } else {
        observer.observe(el);
      }
    });

    // Chapter rail tracking
    const sections = ["model", "work", "terms", "questions"];
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChapter(entry.target.id);
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });

    // Footer visibility tracking
    const footerEl = document.querySelector("footer");
    const footerObserver = new IntersectionObserver(
      ([entry]) => {
        setFooterActive(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (footerEl) footerObserver.observe(footerEl);

    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      footerObserver.disconnect();
    };
  }, []);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.name || !applyForm.email) return;
    setApplySubmitted(true);
    playSuccessChime();
    setTimeout(() => {
      setApplySubmitted(false);
      setShowApplyModal(false);
      setApplyForm({ name: "", email: "", goal: "" });
    }, 2800);
  };

  return (
    <SmoothScrollProvider>
      <div className="relative min-h-screen bg-[#f2f1ed] text-[#1d1c19] selection:bg-[#1d1c19] selection:text-[#f2f1ed]">
        {/* 0. INTERACTIVE WEBGL CANVAS (GETLAYERS & PEAR FLUID SHADER) */}
        <PearCanvas />
        <HeroThreeCanvas />

      {/* SVG Ink Dispersion Filter (authentic pear.no #inkf filter) */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="inkf" x="-18%" y="-30%" width="136%" height="160%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="4" seed="9" result="cl" />
            <feDisplacementMap in="SourceGraphic" in2="cl" scale="8.0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* BACKGROUND ATMOSPHERIC VIDEO LOOP */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-25 mix-blend-multiply">
        <video
          src="/films/signal.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>

      {/* 1. LEFT VERTICAL CHAPTER RAIL (Exact Pear.no styling from Image 1) */}
      <nav
        className={`fixed left-4 lg:left-6 xl:left-8 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-8 font-gt-mono transition-opacity duration-300 ${
          footerActive ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Bab Halaman"
      >
        {[
          { id: "model", title: "MODEL KEMITRAAN" },
          { id: "work", title: "TEKNOLOGI IOT" },
          { id: "terms", title: "KETENTUAN BERSAMA" },
          { id: "questions", title: "TANYA JAWAB" },
        ].map((item) => {
          const isActive = activeChapter === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="group flex items-center h-4 relative cursor-pointer"
            >
              {/* Horizontal dash line */}
              <span
                className={`h-[1.5px] transition-all duration-300 ease-out ${
                  isActive
                    ? "w-[26px] bg-[#1d1c19]"
                    : "w-[10px] bg-[#84827a] group-hover:w-[18px] group-hover:bg-[#1d1c19]"
                }`}
              />
              {/* Text label: visible when active on xl+, hover on smaller */}
              <span
                className={`absolute left-8 font-gt-mono text-[10px] tracking-[0.16em] uppercase whitespace-nowrap transition-all duration-300 ease-out pointer-events-none ${
                  isActive
                    ? "opacity-0 xl:opacity-100 translate-x-0 font-medium text-[#1d1c19] group-hover:opacity-100"
                    : "opacity-0 -translate-x-2 group-hover:opacity-75 group-hover:translate-x-0 text-[#84827a]"
                }`}
              >
                {item.title}
              </span>
            </a>
          );
        })}
      </nav>

      {/* 2. MAIN STAGE: CHAPTER 1 — THE MODEL (#top & #model) */}
      <section
        id="model"
        className="relative z-10 min-h-screen px-6 sm:px-12 lg:px-16 pt-12 sm:pt-28 md:pt-32 pb-24 max-w-5xl mx-auto flex flex-col justify-between"
      >
        <div className="pt-0 sm:pt-4 md:pt-6">
          <div
            className="inline-flex items-center gap-2 font-gt-mono text-[10px] text-[#55534c] tracking-widest uppercase mb-4 sm:mb-6 border border-[#1d1c19]/15 px-2.5 py-1 bg-[#f2f1ed]/60 backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" className="star-mark">
              <path d="M12 0Q13.1 10.9 24 12Q13.1 13.1 0 12Q10.9 10.9 12 0Z" />
            </svg>
            <span>PENGELOLAAN SAMPAH PINTAR BALI // 08°39′LS 115°13′BT</span>
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.12] tracking-tight text-[#1d1c19] max-w-4xl"
          >
            EcoSort. Ubah Sampah Jadi Manfaat Nyata.
          </h1>

          <p
            className="mt-4 text-lg sm:text-2xl font-normal text-[#55534c] leading-snug max-w-2xl"
          >
            Bukan TPA yang terus terbakar, melainkan solusi terukur untuk Banjar dan lingkungan Bali.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="relative inline-flex items-center gap-3 border border-[#1d1c19] bg-[#1d1c19] text-[#f2f1ed] px-6 py-3.5 text-xs font-semibold tracking-wider uppercase overflow-hidden group shadow-md cursor-pointer active:scale-95"
            >
              <span className="cta-flood" />
              <span className="relative z-10">Masuk Portal Multi-Peran</span>
              <span className="relative z-10 transition-transform group-hover:translate-x-1">→</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border border-[#1d1c19]/30 bg-white/70 px-5 py-3.5 text-xs font-semibold tracking-wider uppercase text-[#1d1c19] hover:bg-white active:scale-95 transition"
            >
              Live Telemetri →
            </Link>
          </div>
        </div>

        {/* 3-Beat Rhythm Switcher & The Stand Column */}
        <div
          className="mt-20 pt-10 border-t border-[#1d1c19]/15 grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
        >
          {/* Left: 3-Beat Controls */}
          <div className="md:col-span-5 space-y-3 text-xl sm:text-2xl font-bold">
            {[
              { beat: 0, text: "Kami deteksi dini." },
              { beat: 1, text: "Kami padamkan cepat." },
              { beat: 2, text: "Bagi hasil untuk warga." },
            ].map((b) => (
              <button
                key={b.beat}
                onClick={() => setActiveBeat(b.beat)}
                className={`block text-left transition-all duration-300 cursor-pointer ${
                  activeBeat === b.beat
                    ? "text-[#1d1c19] font-bold translate-x-2 underline decoration-[#1d1c19]/40 underline-offset-8"
                    : "text-[#84827a] hover:text-[#1d1c19] hover:translate-x-1"
                }`}
              >
                {b.text}
              </button>
            ))}
          </div>

          {/* Right: Stacked Prose Panels (Zero jump, continuous crossfade) */}
          <div className="md:col-span-7 space-y-4">
            <div className="grid grid-cols-1 grid-rows-1 min-h-[96px]">
              <p
                className={`font-gt-sans text-sm sm:text-base text-[#33322d] leading-relaxed font-normal beat-panel ${
                  activeBeat === 0 ? "beat-panel-active" : "beat-panel-inactive"
                }`}
              >
                Kami membangun stasiun IoT cerdas dengan sensor suhu infrared dan sensor gas MQ untuk mendeteksi potensi kebakaran TPA sebelum asap membumbung. Data dianalisis di level edge, membaca laju kenaikan termal secara presisi.
              </p>
              <p
                className={`font-gt-sans text-sm sm:text-base text-[#33322d] leading-relaxed font-normal beat-panel ${
                  activeBeat === 1 ? "beat-panel-active" : "beat-panel-inactive"
                }`}
              >
                Ketika anomali bahaya terdeteksi, protokol darurat Choke Mode seketika mengunci motor servo ke sudut 0° dalam waktu 380 milidetik. Pintu kompartemen kedap udara terisolasi total, memutus pasokan oksigen api seketika.
              </p>
              <p
                className={`font-gt-sans text-sm sm:text-base text-[#33322d] leading-relaxed font-normal beat-panel ${
                  activeBeat === 2 ? "beat-panel-active" : "beat-panel-inactive"
                }`}
              >
                Kami memilah sampah anorganik dan organik secara presisi, lalu membagi nilai rupiah daur ulang langsung ke saldo poin warga Banjar. Tanpa biaya awal, tanpa retribusi tambahan: jika sampah Bali tidak tertangani, kami tidak dibayar.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between font-gt-mono text-xs text-[#55534c] border-t border-[#1d1c19]/10">
              <span className="uppercase text-[10px] tracking-widest">
                [ MODEL KEMITRAAN BANJAR &middot; ZERO RETAINER ]
              </span>
              <span className="text-[#015186] font-bold">100% HASIL TERBUKTI</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION: CHAPTER 2 — THE WORK (#work) */}
      <section
        id="work"
        className="relative z-10 min-h-screen px-6 sm:px-12 lg:px-16 py-32 max-w-5xl mx-auto border-t border-[#1d1c19]/15"
      >
        <div
          data-reveal="50"
          className="reveal-on-scroll flex flex-wrap items-baseline justify-between mb-16 pb-2"
        >
          <div>
            <span className="font-gt-mono text-[10px] text-[#84827a] uppercase tracking-widest block">
              BAB 2 &middot; TEKNOLOGI IOT
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#1d1c19] mt-1">
              Semua sistem keselamatan dan penimbangan dalam satu stasiun.
            </h2>
          </div>
          <span className="font-gt-mono text-2xl sm:text-3xl font-bold text-[#015186]">
            98.4%
          </span>
        </div>

        {/* 3 Editorial Work Cards (Staggered scroll lift) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 01 */}
          <div
            data-reveal="120"
            className="reveal-card border border-[#1d1c19]/15 bg-[#f2f1ed]/80 backdrop-blur-sm p-6 flex flex-col justify-between group"
          >
            <span className="font-gt-mono text-[10px] uppercase tracking-widest text-[#84827a] block mb-4">
              01 &middot; SENSORIK &amp; TELEMETRI
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#1d1c19] mb-3 leading-snug">
                Sensor ultrasonik &amp; pemetaan kapasitas wadah.
              </h3>
              <p className="font-gt-sans text-xs text-[#55534c] leading-relaxed">
                Sensor jarak ultrasonik memindai volume tong sampah secara kontinu (0–100%). Panggilan armada truk DLH dipicu secara otomatis saat kapasitas mencapai batas 84%, mencegah penumpukan liar.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1d1c19]/10 font-gt-mono text-[10px] text-[#015186] flex justify-between">
              <span>LATENSI: 14MS</span>
              <span>ESP32-S3 CORE</span>
            </div>
          </div>

          {/* Card 02 */}
          <div
            data-reveal="240"
            className="reveal-card border border-[#1d1c19]/15 bg-[#f2f1ed]/80 backdrop-blur-sm p-6 flex flex-col justify-between group"
          >
            <span className="font-gt-mono text-[10px] uppercase tracking-widest text-[#84827a] block mb-4">
              02 &middot; KATUP PENGAMAN DARURAT
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#1d1c19] mb-3 leading-snug">
                Katup pemutus udara menutup rapat saat ada gas dan panas.
              </h3>
              <p className="font-gt-sans text-xs text-[#55534c] leading-relaxed">
                Korelasi lonjakan suhu di atas 45°C dan konsentrasi gas metana di atas 400 PPM seketika menutup katup mekanik dalam 380 milidetik untuk menghentikan api.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1d1c19]/10 font-gt-mono text-[10px] text-[#015186] flex justify-between">
              <span>RESPON: 380MS</span>
              <span>KATUP 0° KEDAP</span>
            </div>
          </div>

          {/* Card 03 */}
          <div
            data-reveal="360"
            className="reveal-card border border-[#1d1c19]/15 bg-[#f2f1ed]/80 backdrop-blur-sm p-6 flex flex-col justify-between group"
          >
            <span className="font-gt-mono text-[10px] uppercase tracking-widest text-[#84827a] block mb-4">
              03 &middot; EKONOMI SIRKULAR
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#1d1c19] mb-3 leading-snug">
                Poin reward digital dan insentif nyata untuk warga.
              </h3>
              <p className="font-gt-sans text-xs text-[#55534c] leading-relaxed">
                Setoran plastik PET, kardus, dan limbah upakara ditimbang presisi dengan sensor beban digital. Poin warga dapat langsung ditukar dengan token listrik PLN dan beras Banjar.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1d1c19]/10 font-gt-mono text-[10px] text-[#015186] flex justify-between">
              <span>STANDAR: IPCC 2026</span>
              <span>POIN OTOMATIS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION: CHAPTER 3 — THE TERMS (#terms) */}
      <section
        id="terms"
        className="relative z-10 min-h-screen px-6 sm:px-12 lg:px-16 py-32 max-w-5xl mx-auto border-t border-[#1d1c19]/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div data-reveal="100" className="reveal-on-scroll lg:col-span-7 space-y-6">
            <span className="font-gt-mono text-[10px] text-[#84827a] uppercase tracking-widest block">
              BAB 3 &middot; KETENTUAN BERSAMA
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#1d1c19] leading-tight">
              Tanpa biaya di awal. Berbagi hasil nilai daur ulang.
            </h2>
            <p className="font-gt-sans text-base text-[#33322d] leading-relaxed max-w-xl">
              Desa adat tidak dibebani biaya di muka: tanpa biaya konsultasi maupun tarif bulanan. Kami menanggung seluruh penyediaan perangkat IoT, analisis AI, dan pemasangan stasiun di banjar Anda.
            </p>

            <div className="border-t border-[#1d1c19]/15 pt-6 space-y-4">
              <span className="font-gt-mono text-xs uppercase tracking-wider text-[#1d1c19] font-bold flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="star-mark">
                  <path d="M12 0Q13.1 10.9 24 12Q13.1 13.1 0 12Q10.9 10.9 12 0Z" />
                </svg>
                Keterbukaan Sepenuhnya
              </span>
              <p className="font-gt-sans text-xs text-[#55534c] leading-relaxed max-w-lg">
                Pendapatan sistem murni diperoleh dari porsi bagi hasil penjualan komoditas daur ulang yang berhasil diselamatkan dari TPA. Banjar memiliki penuh stasiun fisik dan data lingkungan warga.
              </p>
            </div>
          </div>

          {/* Right Editorial Statement Box */}
          <div
            data-reveal="250"
            className="reveal-on-scroll lg:col-span-5 border border-[#1d1c19]/20 bg-[#e7e5df]/60 p-8 space-y-4"
          >
            <span className="font-gt-mono text-[10px] text-[#84827a] uppercase tracking-widest block">
              PRINSIP SELEKSI KEMITRAAN
            </span>
            <h3 className="text-2xl font-bold text-[#1d1c19] leading-snug">
              Kami selektif dalam memilih kemitraan.
            </h3>
            <p className="font-gt-sans text-xs text-[#55534c] leading-relaxed">
              Mitra kami adalah desa adat Banjar, pengelola kawasan wisata, dan instansi yang berkomitmen pada kelestarian nyata pulau Bali. Jika tujuan Anda sekadar formalitas tanpa kemauan memilah, kami bukan mitra yang tepat.
            </p>
            <div className="pt-2">
              <Link
                href="/history"
                className="font-gt-mono text-xs uppercase tracking-wider text-[#015186] font-bold hover:underline"
              >
                Lihat Armada Terkoneksi &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: CHAPTER 4 — QUESTIONS / INTERACTIVE 3D FAQ CAROUSEL (#questions) */}
      <section
        id="questions"
        className="relative z-10 min-h-screen px-6 sm:px-12 lg:px-16 py-32 max-w-5xl mx-auto border-t border-[#1d1c19]/15"
      >
        <div data-reveal="50" className="reveal-on-scroll text-center mb-16">
          <span className="font-gt-mono text-[10px] text-[#84827a] uppercase tracking-widest block">
            BAB 4 &middot; PERTANYAAN UMUM
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#1d1c19] mt-2">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="font-gt-sans text-xs sm:text-sm text-[#55534c] mt-2">
            Transparansi mengenai teknologi, sistem pencegahan api, dan insentif warga.
          </p>
        </div>

        {/* 3D FAQ Perspective Carousel */}
        <div data-reveal="200" className="reveal-on-scroll faq-stage relative max-w-2xl mx-auto">
          <div className="faq-card-3d border border-[#1d1c19]/20 bg-[#f2f1ed] p-6 sm:p-8 shadow-xl relative min-h-[270px] flex flex-col justify-between">
            <div className="flex justify-between items-center text-[#84827a] mb-4">
              <svg viewBox="0 0 24 24" className="star-mark">
                <path d="M12 0Q13.1 10.9 24 12Q13.1 13.1 0 12Q10.9 10.9 12 0Z" />
              </svg>
              <span className="font-gt-mono text-[10px] tracking-widest uppercase">
                PERTANYAAN {activeFaqIndex + 1} DARI {FAQS.length}
              </span>
              <svg viewBox="0 0 24 24" className="star-mark">
                <path d="M12 0Q13.1 10.9 24 12Q13.1 13.1 0 12Q10.9 10.9 12 0Z" />
              </svg>
            </div>

            <div key={activeFaqIndex} className="animate-crossfade">
              <h3 className="text-xl sm:text-2xl font-bold text-[#1d1c19] mb-3">
                {FAQS[activeFaqIndex].question}
              </h3>
              <p className="font-gt-sans text-sm text-[#33322d] leading-relaxed">
                {FAQS[activeFaqIndex].answer}
              </p>
            </div>

            {/* Stepper Controls */}
            <div className="pt-6 border-t border-[#1d1c19]/10 flex items-center justify-between font-gt-mono text-xs">
              <button
                onClick={() =>
                  setActiveFaqIndex((prev) => (prev > 0 ? prev - 1 : FAQS.length - 1))
                }
                className="text-[#55534c] hover:text-[#1d1c19] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors min-h-[44px] py-2 px-1"
              >
                &larr; SEBELUMNYA
              </button>
              <div className="flex gap-2">
                {FAQS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFaqIndex(i)}
                    className={`h-1.5 transition-all cursor-pointer ${
                      activeFaqIndex === i ? "w-6 bg-[#1d1c19]" : "w-2 bg-[#84827a]/40"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setActiveFaqIndex((prev) => (prev < FAQS.length - 1 ? prev + 1 : 0))
                }
                className="text-[#55534c] hover:text-[#1d1c19] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors min-h-[44px] py-2 px-1"
              >
                SELANJUTNYA &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION: THE FOOTER & CONTACT (.ft with Video Loop) */}
      <footer className="relative z-10 bg-[#0b0a09] text-[#f2f1ed] pt-28 pb-32 px-6 sm:px-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <video
            src="/films/footer-loop.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto space-y-16">
          <div
            data-reveal="50"
            className="reveal-on-scroll border-b border-[#ffffff1a] pb-12 flex flex-col md:flex-row justify-between items-baseline gap-6"
          >
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#f2f1ed]">
              EcoSort.
            </h2>
            <p className="text-base sm:text-xl text-[#84827a] max-w-sm">
              Kelestarian pulau Bali melalui teknologi cerdas dan pemberdayaan Banjar.
            </p>
          </div>

          {/* 4 Footer Columns with staggered reveal */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 font-gt-mono text-xs text-[#84827a]">
            <div data-reveal="100" className="reveal-on-scroll">
              <span className="text-white uppercase tracking-widest block mb-3 font-bold">
                KANTOR PUSAT
              </span>
              <p className="leading-relaxed">
                EcoSort Node Bali <br />
                Banjar Kayumas, Denpasar <br />
                Bali 80232, Indonesia
              </p>
            </div>
            <div data-reveal="200" className="reveal-on-scroll">
              <span className="text-white uppercase tracking-widest block mb-3 font-bold">
                NAVIGASI APLIKASI
              </span>
              <div className="space-y-1">
                <Link href="/dashboard" className="block hover:text-white transition-colors">
                  Monitoring IoT TPST
                </Link>
                <Link href="/petugas" className="block hover:text-white transition-colors">
                  Input Setoran Lapangan
                </Link>
                <Link href="/warga" className="block hover:text-white transition-colors">
                  Tabungan & Saldo Warga
                </Link>
                <Link href="/admin/laporan" className="block hover:text-white transition-colors">
                  Laporan & Statistik Banjar
                </Link>
              </div>
            </div>
            <div data-reveal="300" className="reveal-on-scroll">
              <span className="text-white uppercase tracking-widest block mb-3 font-bold">
                LAYANAN BANJAR
              </span>
              <p className="leading-relaxed">
                Email: <strong className="text-white">ops@ecosort.ai</strong> <br />
                Layanan: 0800-1-ECOSORT <br />
                Protokol: ESP32-S3 WSS
              </p>
            </div>
            <div data-reveal="400" className="reveal-on-scroll">
              <span className="text-white uppercase tracking-widest block mb-3 font-bold">
                KEMITRAAN BANJAR
              </span>
              <Link
                href="/login"
                className="w-full min-h-[44px] border border-white/40 bg-white text-black py-2.5 font-bold uppercase tracking-wider hover:bg-zinc-200 transition text-center block"
              >
                Portal Masuk Banjar &rarr;
              </Link>
            </div>
          </div>

          <div
            data-reveal="500"
            className="reveal-on-scroll pt-8 border-t border-[#ffffff1a] flex flex-wrap justify-between items-center text-[10px] font-gt-mono text-[#84827a]"
          >
            <span>&copy; 2026 EcoSort Bali &middot; Inovasi Pengelolaan Sampah Berbasis Banjar</span>
            <span>SIMBOL LINGKUNGAN BERKELANJUTAN BALI</span>
          </div>
        </div>
      </footer>

      {/* 7. MODAL: THE APPLICATION WITH SPECULAR CONIC RIM */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-crossfade">
          <div className="relative p-[1px] cf-spec-rim max-w-lg w-full shadow-2xl">
            <div className="bg-[#1d1c19] text-white p-6 sm:p-8 font-gt-mono relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="text-[10px] text-[#015186] font-bold uppercase tracking-widest block">
                    PROGRAM KEMITRAAN // BALI SMART VILLAGE
                  </span>
                  <h3 className="text-2xl font-bold text-white">
                    Pendaftaran Banjar
                  </h3>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-white/60 hover:text-white text-lg font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {applySubmitted ? (
                <div className="border border-green-500/40 bg-green-950/40 p-6 text-center space-y-2">
                  <span className="text-xl font-bold text-green-300 block">
                    Permohonan Berhasil Dikirim.
                  </span>
                  <p className="text-xs text-zinc-300 font-gt-sans leading-relaxed">
                    Pengajuan Anda telah masuk ke sistem. Tim operasional EcoSort Bali akan menghubungi pengurus banjar dalam 1x24 jam kerja.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-4 text-xs font-gt-sans">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">
                      Nama Lengkap Penanggung Jawab
                    </label>
                    <input
                      type="text"
                      required
                      value={applyForm.name}
                      onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                      placeholder="Contoh: I Ketut Sudira"
                      className="w-full bg-white/5 border border-white/15 px-3.5 py-2.5 text-white placeholder-zinc-500 font-gt-mono focus:outline-none focus:border-white/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">
                      Alamat Email Aktif
                    </label>
                    <input
                      type="email"
                      required
                      value={applyForm.email}
                      onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                      placeholder="kontak@banjar.desa.id"
                      className="w-full bg-white/5 border border-white/15 px-3.5 py-2.5 text-white placeholder-zinc-500 font-gt-mono focus:outline-none focus:border-white/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">
                      Nama Banjar / Desa Adat &amp; Kebutuhan
                    </label>
                    <textarea
                      rows={3}
                      value={applyForm.goal}
                      onChange={(e) => setApplyForm({ ...applyForm, goal: e.target.value })}
                      placeholder="Sebutkan nama banjar, perkiraan volume sampah harian, dan kondisi tempat pembuangan saat ini..."
                      className="w-full bg-white/5 border border-white/15 px-3.5 py-2.5 text-white placeholder-zinc-500 font-gt-mono focus:outline-none focus:border-white/50"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full min-h-[46px] border border-white bg-white text-black py-3 font-bold uppercase tracking-wider text-xs hover:bg-zinc-200 transition cursor-pointer"
                    >
                      Kirim Formulir Pendaftaran &rarr;
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </SmoothScrollProvider>
  );
}
