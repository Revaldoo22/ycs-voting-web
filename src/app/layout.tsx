import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/components/providers";

// Google Analytics 4 — bisa di-override / dimatikan lewat env.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-FZZC7WVGJX";
// Microsoft Clarity (heatmap + session recording).
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "xj40fbpzhu";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
