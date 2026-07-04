import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/components/providers";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "Youth Character Summit - Universitas STEKOM";
const description =
  "Platform kompetisi karakter pelajar SMA/SMK. Dukung peserta favoritmu dan menangkan smartphone, sertifikat, & jadi Duta Teladan STEKOM!";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "Youth Character Summit",
    "STEKOM",
    "kompetisi pelajar",
    "voting",
    "SMA SMK",
  ],
  openGraph: {
    title,
    description,
    siteName: "Youth Character Summit STEKOM",
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
      </body>
    </html>
  );
}
