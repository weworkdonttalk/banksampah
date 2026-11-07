import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/navigation/bottom-nav";
import PwaRegister from "@/components/pwa/pwa-register";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1d1c19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "EcoSort AI — Bali Smart Waste & Hazard Mitigation",
  description:
    "Solusi AI & IoT untuk deteksi dini bahaya kebakaran sampah, protokol Choke Mode, dan ekonomi sirkular desa adat Bali.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EcoSort AI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-[100dvh] bg-[#f2f1ed] text-[#1d1c19] selection:bg-[#1d1c19] selection:text-[#f2f1ed] flex flex-col">
        <PwaRegister />
        <BottomNav />
        <main className="flex-1 min-h-[100dvh]">{children}</main>
      </body>
    </html>
  );
}
