import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wajib untuk Docker: menghasilkan server.js beserta node_modules
  // seperlunya, sehingga image runtime tak perlu memuat seluruh dependensi
  // maupun menjalankan "next start".
  output: "standalone",
  // CI/verification builds can use a separate dist dir so they never race
  // with a running dev server over .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Proxy /api/* dan /uploads/* TIDAK memakai rewrites, melainkan route
  // handler di src/app/api dan src/app/uploads.
  //
  // rewrites() dievaluasi saat build dan hasilnya dibekukan ke manifest,
  // sehingga di Docker alamat backend ikut terkunci ke dalam image dan
  // API_PROXY_URL di environment container tidak pernah terbaca. Route
  // handler dieksekusi per permintaan, jadi alamatnya dibaca saat itu juga.
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
