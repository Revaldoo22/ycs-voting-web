import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/components/providers";
import { HelpFab } from "@/components/help-fab";

// Google Analytics 4 — bisa di-override / dimatikan lewat env.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-FZZC7WVGJX";
// Microsoft Clarity (heatmap + session recording).
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "xj40fbpzhu";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

// Fallback ke domain produksi, bukan localhost: metadataBase dipakai untuk
// canonical & Open Graph. Kalau env lupa diset saat build produksi, canonical
// "localhost" akan ditolak Google Search Console.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://idola.stekom.ac.id";
const title = "Youth Character Summit - Universitas STEKOM";
const description =
  "Platform kompetisi karakter pelajar SMA/SMK. Dukung peserta favoritmu dan menangkan smartphone, sertifikat, & jadi Duta Teladan Universitas STEKOM!";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "Youth Character Summit",
    "Universitas STEKOM",
    "kompetisi pelajar",
    "voting",
    "SMA SMK",
  ],
  openGraph: {
    title,
    description,
    siteName: "Youth Character Summit Universitas STEKOM",
    type: "website",
    locale: "id_ID",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  // Favicon eksplisit. Crawler favicon Google memprioritaskan /favicon.ico di
  // root, jadi file itu wajib ada sebagai file statis (bukan route ber-hash).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  // Verifikasi Google Search Console lewat metode "HTML tag". Isi
  // NEXT_PUBLIC_GOOGLE_VERIFICATION dengan value token dari GSC, lalu build.
  // Kalau kosong, tag-nya tidak dirender sama sekali.
  ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={jakarta.className} suppressHydrationWarning>
        <NextTopLoader
          color="hsl(24 95% 53%)"
          height={3}
          showSpinner={false}
          shadow="0 0 10px hsl(24 95% 53% / 0.6)"
        />
        <Providers>{children}</Providers>
        {/* Tombol bantuan WhatsApp melayang, tampil di semua halaman voter. */}
        <HelpFab />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        {CLARITY_ID && (
          <Script id="clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_ID}");
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
