import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Youth Character Summit 2026 - Universitas STEKOM",
    short_name: "YCS 2026",
    description:
      "Pendaftaran Youth Character Summit 2026 gratis tanpa biaya. Dukung peserta favoritmu.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
