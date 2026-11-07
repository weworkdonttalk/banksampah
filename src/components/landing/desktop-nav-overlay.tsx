"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import gsap from "gsap";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
});

interface NavItem {
  chapter: string;
  title: string;
  href: string;
  isRoute?: boolean;
}

const MENU_ITEMS: NavItem[] = [
  { chapter: "BAB 1", title: "Monitoring IoT", href: "/dashboard", isRoute: true },
  { chapter: "BAB 2", title: "Bank Sampah", href: "/warga", isRoute: true },
  { chapter: "BAB 3", title: "AI Deteksi", href: "/petugas", isRoute: true },
  { chapter: "BAB 4", title: "Portal Masuk", href: "/login", isRoute: true },
];

export default function DesktopNavOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const overlayBgRef = useRef<HTMLDivElement>(null);
  const closeFocusRef = useRef<HTMLAnchorElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Handle ESC key and resize / orientation change
  useEffect(() => {
    // Only listen on desktop (>= 768px)
    const handleResize = () => {
      if (window.innerWidth < 768 && isOpen) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closeMenu();
        triggerBtnRef.current?.focus();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Lenis control and scroll lock
  useEffect(() => {
    const lenis = (window as any).__lenis;

    if (isOpen) {
      if (lenis) {
        lenis.stop();
      }
      document.body.style.overflow = "hidden";
      // Focus first actionable link
      setTimeout(() => {
        closeFocusRef.current?.focus();
      }, 100);
    } else {
      if (lenis) {
        lenis.start();
      }
      document.body.style.overflow = "";
    }

    return () => {
      if (lenis) {
        lenis.start();
      }
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // GSAP animation with matchMedia ("(min-width: 768px)")
  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        const overlay = overlayBgRef.current;
        const list = menuListRef.current;
        if (!overlay || !list) return;

        const items = list.querySelectorAll(".menu-item-row");
        const dividers = list.querySelectorAll(".menu-divider");
        const footer = list.querySelector(".menu-footer-subtext");
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        if (isOpen) {
          gsap.killTweensOf([overlay, items, dividers, footer]);

          if (prefersReducedMotion) {
            gsap.to(overlay, { opacity: 1, duration: 0.3, ease: "power2.out" });
            gsap.to(items, { opacity: 1, duration: 0.3, ease: "power2.out" });
            gsap.to(dividers, { scaleX: 1, duration: 0.3 });
            if (footer) gsap.to(footer, { opacity: 1, duration: 0.3 });
          } else {
            // Authentic Pear opening timeline
            gsap.fromTo(
              overlay,
              { opacity: 0 },
              { opacity: 1, duration: 0.5, ease: "power3.out" }
            );

            gsap.fromTo(
              items,
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                duration: 0.55,
                stagger: 0.08,
                ease: "power3.out",
                delay: 0.1,
              }
            );

            gsap.fromTo(
              dividers,
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: 0.6,
                stagger: 0.08,
                ease: "power2.out",
                delay: 0.2,
              }
            );

            if (footer) {
              gsap.fromTo(
                footer,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", delay: 0.45 }
              );
            }
          }
        } else {
          // Closing animation
          gsap.killTweensOf([overlay, items, dividers, footer]);

          if (prefersReducedMotion) {
            gsap.to([overlay, items, footer], {
              opacity: 0,
              duration: 0.25,
              ease: "power2.in",
            });
            gsap.to(dividers, { scaleX: 0, duration: 0.2 });
          } else {
            gsap.to(items, {
              opacity: 0,
              y: -15,
              duration: 0.3,
              stagger: 0.04,
              ease: "power2.in",
            });
            gsap.to(dividers, { scaleX: 0, duration: 0.25, ease: "power2.in" });
            if (footer) gsap.to(footer, { opacity: 0, duration: 0.2 });
            gsap.to(overlay, {
              opacity: 0,
              duration: 0.35,
              ease: "power3.inOut",
              delay: 0.05,
            });
          }
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isRoute?: boolean) => {
    closeMenu();
    triggerBtnRef.current?.focus();

    if (!isRoute && href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.replace("#", "");
      const elem = document.getElementById(targetId);
      if (elem) {
        const lenis = (window as any).__lenis;
        if (lenis) {
          lenis.scrollTo(elem, { offset: -30, duration: 1.2 });
        } else {
          elem.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  return (
    <div ref={containerRef} className="hidden md:block">
      {/* 1. LEFT SIDEBAR CONTROLS (Vertical stack: Logo above, 4-Box Grid Menu below) */}
      <div className="fixed top-8 left-6 lg:left-8 z-50 pointer-events-auto flex flex-col items-center gap-7">
        {/* Pear-style Mark Logo */}
        <Link
          href="#top"
          onClick={(e) => {
            if (isOpen) closeMenu();
            handleNavClick(e as any, "#top", false);
          }}
          className={`transition-colors duration-300 block outline-none ${
            isOpen ? "text-white" : "text-[#1d1c19] hover:opacity-75"
          }`}
          aria-label="EcoSort Beranda"
        >
          <svg
            viewBox="0 0 305 415"
            className="w-6 h-auto stroke-current fill-none stroke-[34] stroke-linecap-round stroke-miterlimit-10"
            aria-hidden="true"
          >
            <path
              pathLength="1"
              d="M153.19 22.53C168.21 23.03 182.32 28.8 193.13 38.92C202.3 47.51 208.57 58.46 211.23 70.6C220.52 112.92 237.69 155.75 262.27 197.92C273.65 217.44 279.66 239.79 279.66 262.54C279.66 296.89 266.29 329.18 242.01 353.46C217.73 377.74 185.45 391.11 151.13 391.12L149.08 391.11C80.4 390.15 23.57 333.39 22.51 264.58C22.14 240.37 28.5 216.71 40.91 196.17C63.74 158.4 80.6 116 91.02 70.15C93.73 58.21 99.95 47.41 109.01 38.92C120.33 28.33 135.27 22.5 151.08 22.5C151.79 22.5 152.49 22.51 153.19 22.53Z"
            />
          </svg>
        </Link>

        {/* 4-Box Grid Icon / Close 'X' Toggle Button */}
        <button
          ref={triggerBtnRef}
          type="button"
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-controls="desktop-nav-dialog"
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          className={`group relative size-7 flex items-center justify-center transition-colors duration-300 cursor-pointer outline-none ${
            isOpen ? "text-white" : "text-[#1d1c19] hover:opacity-75"
          }`}
        >
          {/* 4-Box Grid State */}
          <span
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
              isOpen ? "opacity-0 rotate-90 scale-50 pointer-events-none" : "opacity-100 rotate-0 scale-100"
            }`}
          >
            <span className="grid grid-cols-2 gap-[3px] w-[11px] h-[11px]">
              <span className="w-[4px] h-[4px] bg-current rounded-[0.5px]" />
              <span className="w-[4px] h-[4px] bg-current rounded-[0.5px]" />
              <span className="w-[4px] h-[4px] bg-current rounded-[0.5px]" />
              <span className="w-[4px] h-[4px] bg-current rounded-[0.5px]" />
            </span>
          </span>

          {/* Close 'X' State */}
          <span
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
              isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50 pointer-events-none"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 stroke-current stroke-[2.4] fill-none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        </button>
      </div>

      {/* Top-Right Pill/Brand Status (Desktop) */}
      <header className="fixed top-0 right-0 z-50 pointer-events-none px-6 lg:px-8 py-7 flex items-center">
        <div
          className={`font-gt-mono text-[10px] tracking-widest uppercase transition-colors duration-300 ${
            isOpen ? "text-white/60" : "text-[#84827a]"
          }`}
        >
          BALI DIGIFEST 2026
        </div>
      </header>

      {/* 2. FULLSCREEN OVERLAY DIALOG */}
      <div
        id="desktop-nav-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Navigasi Menu Utama"
        className={`fixed inset-0 z-40 transition-[visibility] duration-300 ${
          isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
      >
        {/* Backdrop Tint & Blur */}
        <div
          ref={overlayBgRef}
          onClick={closeMenu}
          className="absolute inset-0 opacity-0 bg-[#0a3d75]/90 [backdrop-filter:blur(28px)_saturate(1.2)] supports-[not(backdrop-filter:blur(1px))]:bg-[#082a52]/95"
          style={{ willChange: "opacity" }}
        />

        {/* Menu Content Container */}
        <div
          ref={menuListRef}
          className="relative z-10 h-full w-full flex flex-col justify-between items-center px-6 py-12 lg:py-16 pointer-events-none"
        >
          {/* Top spacer to balance header */}
          <div className="h-6 pointer-events-none" />

          {/* Centered Vertical 4 Items (Pear.no nvm pattern) */}
          <nav
            aria-label="Menu Utama"
            className="group/menu flex flex-col items-center justify-center w-full max-w-lg pointer-events-auto"
          >
            {MENU_ITEMS.map((item, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === MENU_ITEMS.length - 1;

              return (
                <div
                  key={item.chapter}
                  className="w-full flex flex-col items-center text-center group/item"
                >
                  <Link
                    ref={isFirst ? closeFocusRef : undefined}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href, item.isRoute)}
                    className="menu-item-row w-full py-3 sm:py-3.5 px-4 flex flex-col items-center text-center outline-none transition-all duration-300 group-hover/menu:opacity-40 group-focus-within/menu:opacity-40 hover:!opacity-100 focus-visible:!opacity-100"
                  >
                    {/* Chapter label */}
                    <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-[#93c5fd]/70 group-hover/item:text-[#bfdbfe] group-focus-visible/item:text-[#bfdbfe] transition-colors duration-300 mb-1.5">
                      {item.chapter}
                    </span>

                    {/* Serif Title */}
                    <span
                      className={`${cormorant.className} text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-[#f0f9ff] group-hover/item:text-white transition-colors duration-300 leading-tight`}
                    >
                      {item.title}
                    </span>
                  </Link>

                  {/* Expanding 1px divider */}
                  {!isLast && (
                    <div
                      className="menu-divider w-full max-w-xs sm:max-w-sm h-px bg-white/15 origin-center scale-x-0"
                      style={{ willChange: "transform" }}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer Subtext */}
          <div className="menu-footer-subtext pointer-events-auto flex flex-col sm:flex-row items-center gap-4 text-xs font-mono text-[#93c5fd]/70 tracking-wider uppercase opacity-0">
            <Link
              href="/login"
              onClick={closeMenu}
              className="hover:text-white underline underline-offset-4 decoration-white/30 transition-colors"
            >
              Masuk Sistem →
            </Link>
            <span className="hidden sm:inline text-white/20">•</span>
            <span>ECOSORT AI — BALI DIGIFEST 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
