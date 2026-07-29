import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idola.stekom.ac.id";

/**
 * Halaman publik yang layak diindeks. Halaman berbasis sesi (akun, kupon,
 * onboarding) sengaja tidak dimasukkan — lihat robots.ts.
 */
const ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/panduan", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ranking", priority: 0.8, changeFrequency: "daily" },
  { path: "/peringkat-sekolah", priority: 0.7, changeFrequency: "daily" },
  { path: "/gelombang", priority: 0.6, changeFrequency: "weekly" },
  { path: "/top-voter", priority: 0.5, changeFrequency: "daily" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
