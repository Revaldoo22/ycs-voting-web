import type { Metadata } from "next";
import { HomeBody } from "./home-body";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://idola.stekom.ac.id";

const homeTitle =
  "Youth Character Summit 2026 | Pendaftaran Gratis | Universitas STEKOM";
const homeDescription =
  "Pendaftaran Youth Character Summit 2026 100% GRATIS, tidak ada biaya dan tidak ada transfer dalam bentuk apa pun. Kompetisi karakter pelajar SMA/SMK dengan beasiswa hingga Rp5.000.000.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  keywords: [
    "Youth Character Summit 2026",
    "YCS 2026",
    "pendaftaran gratis",
    "YCS 2026 gratis",
    "apakah YCS 2026 berbayar",
    "biaya pendaftaran YCS 2026",
    "kompetisi pelajar SMA SMK",
    "beasiswa pelajar",
    "Universitas STEKOM",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    type: "website",
    locale: "id_ID",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
  },
};

/**
 * Event structured data dengan offers.price "0" — inilah yang memungkinkan
 * Google menampilkan label "Free" pada rich result.
 */
const EVENT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Youth Character Summit 2026",
  description: homeDescription,
  startDate: "2026-12-23T08:00:00+08:00",
  endDate: "2026-12-23T17:00:00+08:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  image: [`${siteUrl}/logo.png`],
  location: {
    "@type": "Place",
    name: "Bali",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bali",
      addressCountry: "ID",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Universitas STEKOM",
    url: "https://stekom.ac.id",
  },
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    name: "Pendaftaran Peserta Youth Character Summit 2026",
    price: "0",
    priceCurrency: "IDR",
    availability: "https://schema.org/InStock",
    validFrom: "2026-07-21T00:00:00+07:00",
    url: siteUrl,
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT_JSON_LD) }}
      />
      <HomeBody />
    </>
  );
}
