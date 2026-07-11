import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Heart,
  Info,
  MessageCircle,
  Ticket,
  UserRound,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Panduan Penggunaan - Youth Character Summit",
  description:
    "Cara mendukung peserta Youth Character Summit Universitas STEKOM, untuk pendukung umum maupun peserta.",
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
                title="Pendaftaran dibuka 10 Juli 2026"
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
