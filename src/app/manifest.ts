import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoSort AI — Bali Smart Waste & Hazard Mitigation",
    short_name: "EcoSort AI",
    description: "Sistem IoT dan AI Mitigasi Bahaya Kebakaran Sampah & Pengelolaan Sampah Cerdas Bali",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f1ed",
    theme_color: "#1d1c19",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
