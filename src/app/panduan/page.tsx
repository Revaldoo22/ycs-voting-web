import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Heart,
  Info,
  MessageCircle,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pageTitle =
  "Panduan & Pendaftaran GRATIS - Youth Character Summit Universitas STEKOM";
const pageDescription =
  "Pendaftaran Youth Character Summit 2026 100% GRATIS tanpa biaya apa pun. Tidak ada biaya pendaftaran, biaya administrasi, atau uang partisipasi. Ikuti panduan cara daftar dan cara mendukung peserta di sini.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "pendaftaran gratis",
    "Youth Character Summit gratis",
    "daftar YCS 2026 tanpa biaya",
    "lomba pelajar gratis",
    "beasiswa gratis SMA SMK",
    "panduan pendaftaran Youth Character Summit",
    "Universitas STEKOM",
    "biaya pendaftaran YCS",
  ],
  alternates: { canonical: "/panduan" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    type: "article",
    locale: "id_ID",
    url: "/panduan",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

/**
 * Structured data: FAQPage untuk pertanyaan biaya (berpeluang muncul sebagai
 * rich result di Google) + HowTo ringkas untuk alur pendaftaran gratis.
 */
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Apakah pendaftaran Youth Character Summit gratis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya, pendaftaran Youth Character Summit 2026 Universitas STEKOM sepenuhnya gratis. Tidak ada biaya pendaftaran, biaya administrasi, biaya seleksi, maupun biaya penjurian sepeser pun.",
      },
    },
    {
      "@type": "Question",
      name: "Berapa biaya pendaftaran Youth Character Summit 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Biayanya Rp0. Seluruh tahapan mulai dari pendaftaran, seleksi Golden Buzzer, penilaian semi finalis, sampai pengumuman finalis tidak memungut biaya apa pun dari peserta maupun sekolah.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah mendukung atau vote peserta dikenakan biaya?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tidak. Memberi dukungan atau vote untuk peserta juga gratis. Kamu hanya perlu masuk dengan akun Google, dan setiap akun mendapat satu vote selama event.",
      },
    },
    {
      "@type": "Question",
      name: "Bagaimana jika ada orang yang meminta uang untuk pendaftaran?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Abaikan dan segera laporkan ke admin resmi Youth Character Summit lewat WhatsApp +62 888-8555-591. Panitia tidak pernah meminta pembayaran dalam bentuk apa pun.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah beasiswa yang didapat peserta juga gratis tanpa potongan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya. Beasiswa Rp3.000.000 untuk semi finalis dan Rp5.000.000 untuk finalis diberikan tanpa potongan biaya administrasi apa pun.",
      },
    },
  ],
};

const ADMIN_WA_DISPLAY = "+62 888-8555-591";
const ADMIN_WA_LINK =
  "https://wa.me/628888555591?text=" +
  encodeURIComponent(
    "Halo Admin YCS, saya butuh bantuan terkait web voting Youth Character Summit.",
  );

/** Satu langkah bernomor di dalam kartu panduan. */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // Rich result FAQ untuk pertanyaan biaya pendaftaran.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Navbar />

      <main className="container max-w-5xl space-y-8 py-8">
        <div className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="h-6 w-6 text-primary" />
            Panduan Penggunaan
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Ikuti panduan yang sesuai dengan kamu: <b>pendukung umum</b> (teman,
            guru, keluarga, atau siapa pun) atau <b>peserta YCS</b> yang ingin
            ikut mendukung temannya.
          </p>
        </div>

        {/* ------------- Penegasan pendaftaran gratis (SEO utama) ------------- */}
        <section
          aria-labelledby="pendaftaran-gratis"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 sm:p-6"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </span>
            <h2
              id="pendaftaran-gratis"
              className="text-xl font-extrabold tracking-tight sm:text-2xl"
            >
              Semua Pendaftaran GRATIS, Tanpa Biaya Apa Pun
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              <b>Pendaftaran Youth Character Summit 2026 Universitas STEKOM
              sepenuhnya gratis alias Rp0.</b>{" "}
              Kamu tidak dipungut biaya pendaftaran, biaya administrasi, biaya
              seleksi, biaya penjurian, maupun uang partisipasi. Ikut mendukung
              atau vote peserta juga gratis. Semua yang ada di panduan ini bisa
              kamu lakukan tanpa mengeluarkan uang sama sekali.
            </p>
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              "Rp0 biaya pendaftaran peserta",
              "Rp0 biaya administrasi & seleksi",
              "Rp0 biaya untuk vote dan kupon undian",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-xl border bg-background/60 p-3 text-sm font-medium"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <b>Hati-hati penipuan.</b> Panitia tidak pernah meminta pembayaran
              dengan alasan apa pun. Kalau ada yang meminta uang agar kamu lolos
              atau agar bisa mendaftar, itu bukan panitia resmi. Laporkan ke
              admin lewat WhatsApp {ADMIN_WA_DISPLAY}.
            </span>
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ------------------- Panduan pendukung umum ------------------- */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Untuk Pendukung Umum
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Kamu ingin mendukung peserta favoritmu di ajang ini.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <Step
                  n={1}
                  title="Masuk dengan akun Google"
                  desc="Klik tombol Masuk di kanan atas, lalu pilih akun Google kamu."
                />
                <Step
                  n={2}
                  title="Isi data diri sekali saja"
                  desc="Lengkapi nama, nomor WhatsApp, dan asal daerah atau sekolahmu. Cukup sekali di awal."
                />
                <Step
                  n={3}
                  title="Pilih peserta lalu klik Dukung"
                  desc="Cari nama peserta atau sekolahnya di halaman utama, buka profilnya, lalu klik tombol Dukung."
                />
                <Step
                  n={4}
                  title="Selesaikan tugas follow dan kirim buktinya"
                  desc="Follow akun media sosial yang tercantum, lalu upload screenshot bukti untuk setiap tugas."
                />
                <Step
                  n={5}
                  title="Selesai! Tunggu konfirmasi"
                  desc="Vote kamu diperiksa admin lebih dulu. Setelah disetujui, dukunganmu sah dan kamu mendapat kupon undian berhadiah handphone."
                />
              </ol>
              <div className="mt-4 space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  <b>Satu akun hanya bisa vote satu kali</b> selama event, jadi
                  pilih dukunganmu dengan mantap.
                </p>
                <p>
                  Kupon undianmu bisa dilihat di menu akun bagian{" "}
                  <Ticket className="inline h-3.5 w-3.5" /> <b>Kupon Saya</b>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* --------------------- Panduan peserta --------------------- */}
          <Card className="border-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" />
                Untuk Peserta YCS <Badge variant="accent">Peserta</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Kamu terdaftar sebagai peserta dan ingin ikut mendukung peserta
                lain.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <Step
                  n={1}
                  title="Masuk dengan email pendaftaranmu"
                  desc="Gunakan akun Google dengan email yang sama seperti saat kamu mendaftar jadi peserta. Sistem akan langsung mengenalimu."
                />
                <Step
                  n={2}
                  title="Tidak perlu isi data lagi"
                  desc="Data dirimu sudah ada dari pendaftaran, jadi kamu bisa langsung pakai semua fitur."
                />
                <Step
                  n={3}
                  title="Langsung dukung peserta lain"
                  desc="Pilih peserta lain lalu klik Dukung. Tanpa tugas follow dan dukunganmu langsung sah. Kamu tidak bisa mendukung dirimu sendiri."
                />
                <Step
                  n={4}
                  title="Kupon undian langsung didapat"
                  desc="Setelah vote terkirim, kupon undianmu otomatis masuk. Cek di menu Kupon Saya."
                />
                <Step
                  n={5}
                  title="Ajak teman mendukungmu"
                  desc="Buka profilmu, klik Bagikan Profil, dan sebarkan ke teman-temanmu. Pantau posisimu di menu Ranking dan Klasemen."
                />
              </ol>
              <div className="mt-4 space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  Aturan <b>satu akun satu vote</b> juga berlaku untuk peserta.
                </p>
                <p>
                  Tidak dikenali sebagai peserta saat masuk? Kemungkinan email
                  yang dipakai berbeda dengan data pendaftaran. Hubungi admin di
                  bawah ya.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- Timeline & info kegiatan YCS 2026 ---------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Timeline YCS 2026
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jadwal lengkap kegiatan, main dan menangkan!
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="space-y-4">
              <Step
                n={1}
                title="Pendaftaran dibuka 10 Juli 2026, gratis tanpa biaya"
                desc="Tiap bulan ada pemilihan Golden Buzzer dan semi finalis: 10 sampai 31 Juli (5 Golden Buzzer Juli), 1 sampai 30 Agustus (10 Golden Buzzer plus 200 Semi Finalis Grup A), 1 sampai 29 September (15 Golden Buzzer plus Grup B), dan 1 sampai 30 Oktober (20 Golden Buzzer plus Grup C)."
              />
              <Step
                n={2}
                title="Pengumuman 200 Semi Finalis"
                desc="Grup A diumumkan 31 Agustus 2026, Grup B 30 September 2026, dan Grup C 31 Oktober 2026. Seluruh semi finalis mendapat beasiswa Rp3.000.000."
              />
              <Step
                n={3}
                title="Periode penilaian dan penjurian panitia"
                desc="Berlangsung 1 sampai 14 November 2026."
              />
              <Step
                n={4}
                title="Pengumuman 100 Finalis Peserta YCS 2026"
                desc="Diumumkan 16 November 2026. Seluruh finalis mendapat beasiswa Rp5.000.000. Sampai jumpa di Bali!"
              />
            </ol>

            {/* Jalur kelulusan */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { n: "50", label: "Lolos via Golden Buzzer" },
                { n: "100", label: "Lolos Seleksi Umum" },
                { n: "150", label: "Total Peserta Lolos" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-2xl font-extrabold text-primary">{s.n}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <b>Golden Buzzer</b> adalah peserta yang terpilih langsung
                  oleh panitia atau juri karena punya keunggulan yang unik,
                  inspiratif, spesial, dan bisa jadi role model yang baik bagi
                  banyak orang.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b>Seleksi lanjutan semi finalis:</b> membuat Twibbon dan
                  video kampanye contoh #AksiBaik di sekolah, lalu tes
                  kuesioner yang dipandu lewat online meeting Zoom.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b>Ketentuan beasiswa:</b> kalau kamu mendapat 2 beasiswa
                  atau lebih dari program ini, yang berlaku adalah beasiswa
                  yang terakhir dikeluarkan (nominal terbesar).
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b>Soal Grup A, B, dan C:</b> itu hanya nama fase
                  pengumuman. Peserta yang lolos tiap fase dipilih dari
                  pendaftar bulan berjalan dan pendaftar sebelumnya yang belum
                  lolos, jadi semua pendaftar punya kesempatan yang sama.
                  Belum terpilih bulan ini? Datamu otomatis ikut pemilihan
                  bulan berikutnya.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* -------- FAQ biaya: teks jawaban sinkron dengan FAQ_JSON_LD -------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Pertanyaan Seputar Biaya Pendaftaran
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jawaban singkat soal biaya Youth Character Summit 2026.
            </p>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {FAQ_JSON_LD.mainEntity.map((qa) => (
                <div key={qa.name} className="space-y-1">
                  <dt className="font-semibold">{qa.name}</dt>
                  <dd className="text-sm text-muted-foreground">
                    {qa.acceptedAnswer.text}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* ------------------------- Bantuan ------------------------- */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Heart className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold">Masih bingung atau menemui kendala?</p>
              <p className="text-sm text-muted-foreground">
                Vote belum masuk, akun tidak dikenali, atau ada pertanyaan lain?
                Admin siap membantu lewat WhatsApp.
              </p>
            </div>
            <Button
              asChild
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <a href={ADMIN_WA_LINK} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Hubungi Admin ({ADMIN_WA_DISPLAY})
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Siap mendukung?{" "}
          <Link href="/" className="text-primary hover:underline">
            Kembali ke halaman utama
          </Link>{" "}
          dan pilih pesertamu.
        </p>
      </main>
    </div>
  );
}
