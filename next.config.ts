import type { NextConfig } from "next";

// Dibaca saat SERVER JALAN, bukan saat build: di Docker, alamat backend baru
// diketahui ketika container dijalankan. Karena rewrites() dipanggil per
// permintaan di mode standalone, nilai ini ikut terbaca dari environment
// container, bukan terkunci pada nilai saat image dibuat.
const API_URL = process.env.API_PROXY_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Wajib untuk Docker: menghasilkan server.js beserta node_modules
  // seperlunya, sehingga image runtime tak perlu memuat seluruh dependensi
  // maupun menjalankan "next start".
  output: "standalone",
  // CI/verification builds can use a separate dist dir so they never race
  // with a running dev server over .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Same-origin /api/* and /uploads/* are proxied to the NestJS backend.
  // Client code and cookies behave exactly like the old monolith.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
    ];
  },
  images: {
    // Optimasi gambar Vercel berbayar per gambar dan kuotanya sudah habis:
    // /_next/image membalas 402 sehingga SEMUA gambar gagal dimuat. Dimatikan
    // supaya gambar dilayani apa adanya. Jangan dinyalakan lagi sebelum kuota
    // ditambah, dan pastikan file yang diunggah sudah dikompres dari sisi app.
    unoptimized: true,
    // Uploaded photos are absolute URLs pointing back at this app.
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
