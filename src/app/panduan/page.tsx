import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Heart,
  MessageCircle,
  Ticket,
  UserRound,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Panduan Penggunaan - Youth Character Summit",
  description:
    "Cara vote di Youth Character Summit Universitas STEKOM: panduan untuk voter biasa dan voter yang juga peserta.",
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

function ContactAdminButton({ block = false }: { block?: boolean }) {
  return (
    <Button
      asChild
      className={
        block
          ? "w-full bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-emerald-600 text-white hover:bg-emerald-700"
      }
    >
      <a href={ADMIN_WA_LINK} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        Hubungi Admin ({ADMIN_WA_DISPLAY})
      </a>
    </Button>
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
            Ada dua jalur pemakaian web ini: <b>voter biasa</b> (teman, guru,
            keluarga, siapa pun yang mau mendukung) dan <b>voter yang juga
            peserta YCS</b>. Cari posisimu di bawah, ikuti langkahnya.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ------------------- Panduan voter biasa ------------------- */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Voter Biasa
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Kamu bukan peserta lomba — hanya ingin mendukung peserta
                favoritmu.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <Step
                  n={1}
                  title="Masuk dengan akun Google"
                  desc="Klik tombol Masuk di pojok kanan atas (atau langsung klik Dukung di peserta — nanti otomatis diarahkan login)."
                />
                <Step
                  n={2}
                  title="Lengkapi profil sekali"
                  desc="Isi nama, nomor WhatsApp, asal wilayah, status, dan sekolah. Field bertanda * wajib. Setelah selesai kamu dikembalikan ke halaman terakhir."
                />
                <Step
                  n={3}
                  title="Pilih peserta & klik Dukung"
                  desc="Cari lewat nama/sekolah atau pakai filter Sekolahku/Kabupatenku di halaman utama."
                />
                <Step
                  n={4}
                  title="Kerjakan 6 tugas follow + upload bukti"
                  desc="Follow TikTok & Instagram Univ STEKOM dan TopLoker.com, serta ikuti 2 saluran WhatsApp. Upload screenshot bukti untuk SETIAP tugas."
                />
                <Step
                  n={5}
                  title="Tunggu review admin"
                  desc="Vote-mu berstatus 'menunggu review'. Setelah admin approve, poin masuk ke peserta dan kamu dapat kupon undian berhadiah handphone."
                />
                <Step
                  n={6}
                  title="Tambah poin lewat quest (opsional)"
                  desc="Di halaman peserta ada quest (like/komen/repost, buat konten, dll.) — kerjakan untuk memberi poin tambahan ke peserta."
                />
              </ol>
              <div className="mt-4 space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  <b>1 akun = 1 vote</b> untuk seluruh event — pilih
                  peserta dukunganmu dengan mantap.
                </p>
                <p>
                  Kupon undianmu bisa dilihat di menu akun →{" "}
                  <Ticket className="inline h-3.5 w-3.5" /> <b>Kupon Saya</b>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* --------------- Panduan voter yang juga peserta --------------- */}
          <Card className="border-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" />
                Voter yang Juga Peserta{" "}
                <Badge variant="accent">Peserta YCS</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Kamu terdaftar sebagai peserta lomba dan ingin ikut memberi
                dukungan ke peserta lain.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <Step
                  n={1}
                  title="Masuk Google dengan email pendaftaranmu"
                  desc="Pakai email yang SAMA dengan yang kamu daftarkan sebagai peserta. Sistem otomatis mengenalimu — muncul badge 'Peserta' di menu akun."
                />
                <Step
                  n={2}
                  title="Tanpa isi profil, tanpa tugas follow"
                  desc="Identitasmu (nama, WA, sekolah) diambil otomatis dari data pendaftaran. Kamu tidak perlu wizard profil ataupun upload bukti follow."
                />
                <Step
                  n={3}
                  title="Vote peserta lain — langsung sah"
                  desc="Pilih peserta lain lalu klik Dukung; poin langsung masuk tanpa menunggu review. Kamu tidak bisa mendukung dirimu sendiri."
                />
                <Step
                  n={4}
                  title="Kupon undian otomatis"
                  desc="Begitu vote terkirim kamu langsung menerima kupon undian — cek di menu Kupon Saya."
                />
                <Step
                  n={5}
                  title="Kumpulkan dukungan untukmu"
                  desc="Buka halaman profilmu, klik Bagikan Profil, dan sebarkan link-nya. Pantau posisimu di menu Ranking dan posisi sekolahmu di Gelombang."
                />
              </ol>
              <div className="mt-4 space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  <BadgeCheck className="inline h-3.5 w-3.5 text-emerald-500" />{" "}
                  Aturan <b>1 akun = 1 vote</b> tetap berlaku untuk peserta.
                </p>
                <p>
                  Login gagal dikenali sebagai peserta? Kemungkinan emailmu
                  beda dengan data pendaftaran — hubungi admin di bawah.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------- Bantuan ------------------------- */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Heart className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold">Masih bingung atau menemui kendala?</p>
              <p className="text-sm text-muted-foreground">
                Vote tidak masuk, akun tidak dikenali sebagai peserta, bukti
                ditolak, atau pertanyaan lain — admin siap membantu via
                WhatsApp.
              </p>
            </div>
            <ContactAdminButton />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Siap mendukung?{" "}
          <Link href="/" className="text-primary hover:underline">
            Kembali ke halaman utama
          </Link>{" "}
          dan pilih pesertamu.{" "}
          <CheckCircle2 className="inline h-3.5 w-3.5 text-emerald-500" />
        </p>
      </main>
    </div>
  );
}
