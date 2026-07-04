import type { NextConfig } from "next";

const API_URL = process.env.API_PROXY_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
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
    // Uploaded photos are absolute URLs pointing back at this app.
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
