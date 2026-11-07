"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] Registrasi service worker tertunda:", err);
      });
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(100);
        } catch {}
      }
      setTimeout(() => setShowStatus(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate([150, 100, 150]);
        } catch {}
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[60] text-center py-2 px-4 text-xs font-gt-mono font-semibold transition-all duration-300 ${
        isOnline
          ? "bg-[#015186] text-white"
          : "bg-amber-600 text-white shadow-md animate-pulse"
      }`}
    >
      <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
        <span
          className={`size-2 rounded-full ${
            isOnline ? "bg-emerald-300" : "bg-white animate-ping"
          }`}
        />
        <span>
          {isOnline
            ? "Tersambung Kembali — Data tersinkronisasi otomatis"
            : "Mode Offline — Data setoran disimpan lokal di antrean"}
        </span>
      </div>
    </div>
  );
}
