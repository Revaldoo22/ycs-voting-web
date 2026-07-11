"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/states";
import { useMyCoupons, useMyProfile, type CouponRow } from "@/lib/queries";

/** Muat gambar hadiah handphone (public/hp.jpg); null bila gagal. */
function loadPrizeImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/hp.png";
  });
}

/** Render kartu kupon jadi PNG (canvas, 2x retina) lalu unduh. */
async function downloadCoupon(c: CouponRow) {
  const W = 1000;
  const H = 460;
  const SCALE = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return void toast.error("Browser tidak mendukung unduhan.");
  ctx.scale(SCALE, SCALE);

  const r = (
    x: number, y: number, w: number, h: number, rad: number,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rad);
  };

  // Latar gradasi laut Bali
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#164e63");
  bg.addColorStop(0.55, "#0e7490");
  bg.addColorStop(1, "#06b6d4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Lingkaran dekor transparan
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (const [cx, cy, rad] of [
    [120, 60, 130], [880, 400, 170], [720, 40, 70],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiket putih + bayangan
  const TX = 56, TY = 56, TW = W - 112, TH = H - 112;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  r(TX, TY, TW, TH, 22);
  ctx.fill();
  ctx.restore();

  // Takik tiket (kiri-kanan garis sobek)
  const STUB_X = TX + TW - 260;
  ctx.fillStyle = "#0e7490";
  const notch = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#0d6f8f"; // warna latar di titik takik agar menyatu
    ctx.fill();
  };
  notch(STUB_X, TY);
  notch(STUB_X, TY + TH);

  // Garis sobek
  ctx.strokeStyle = "#cbd5e1";
  ctx.setLineDash([6, 7]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STUB_X, TY + 22);
  ctx.lineTo(STUB_X, TY + TH - 22);
  ctx.stroke();
  ctx.setLineDash([]);

  // Strip aksen oranye di kiri
  const accent = ctx.createLinearGradient(0, TY, 0, TY + TH);
  accent.addColorStop(0, "#fb923c");
  accent.addColorStop(1, "#f97316");
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(TX, TY, 10, TH, [22, 0, 0, 22]);
  ctx.fill();

  // Konten kiri
  const LX = TX + 44;
  ctx.fillStyle = "#0e7490";
  ctx.font = "800 15px Arial";
  ctx.fillText("Y O U T H   C H A R A C T E R   S U M M I T", LX, TY + 46);

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 34px Arial";
  ctx.fillText("Kupon Undian Handphone", LX, TY + 92);

  // Kode dalam panel
  ctx.fillStyle = "#ecfeff";
  r(LX, TY + 118, 420, 64, 14);
  ctx.fill();
  ctx.strokeStyle = "#a5f3fc";
  ctx.lineWidth = 1.5;
  r(LX, TY + 118, 420, 64, 14);
  ctx.stroke();
  ctx.fillStyle = "#0e7490";
  ctx.font = "800 34px Courier New";
  ctx.fillText(c.code, LX + 24, TY + 162);

  ctx.fillStyle = "#334155";
  ctx.font = "600 17px Arial";
  ctx.fillText(c.owner_name ?? "-", LX, TY + 226);
  ctx.fillStyle = "#64748b";
  ctx.font = "15px Arial";
  ctx.fillText(
    "Terbit " +
      new Date(c.created_at).toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
      }),
    LX,
    TY + 252,
  );
  ctx.fillText(
    "Simpan kupon ini - pemenang diumumkan panitia di akhir event.",
    LX,
    TY + 288,
  );

  // Pseudo-barcode dari kode
  let bx = LX;
  const by = TY + TH - 46;
  for (const ch of (c.code + c.code).slice(0, 40)) {
    const wBar = (ch.charCodeAt(0) % 3) + 1.5;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(bx, by, wBar, 26);
    bx += wBar + 3;
  }

  // Stub kanan — gambar hadiah handphone (fallback teks bila gagal dimuat)
  const SX = STUB_X + 34;
  ctx.fillStyle = "#f97316";
  ctx.font = "800 14px Arial";
  ctx.fillText("HADIAH UTAMA", SX, TY + 60);
  const prize = await loadPrizeImage();
  if (prize) {
    // PNG transparan — gambar langsung di atas tiket putih tanpa kotak,
    // biar menyatu dengan latar kupon.
    const IW = 210;
    const IH = Math.round((IW * prize.height) / prize.width);
    const IX = STUB_X + 20;
    const IY = TY + 78;
    ctx.drawImage(prize, IX, IY, IW, IH);
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Arial";
    ctx.fillText("Diundi oleh panitia", SX, IY + IH + 28);
  } else {
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 40px Arial";
    ctx.fillText("HAND", SX, TY + 116);
    ctx.fillText("PHONE", SX, TY + 160);
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Arial";
    ctx.fillText("Diundi oleh panitia", SX, TY + 196);
  }

  // Kode kecil vertikal di stub
  ctx.save();
  ctx.translate(TX + TW - 26, TY + TH - 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 13px Courier New";
  ctx.fillText(c.code, 0, 0);
  ctx.restore();

  const a = document.createElement("a");
  a.download = `kupon-${c.code}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

export default function CouponPage() {
  const router = useRouter();
  const { data: me, isLoading: loadingMe } = useMyProfile();
  // Voter onboarded ATAU peserta (role "participant") — sama-sama punya kupon.
  const enabled =
    !!me && (me.is_participant || (me.role === "voter" && me.onboarded));
  const { data: coupons, isLoading } = useMyCoupons(enabled);

  React.useEffect(() => {
    if (!loadingMe && !me) router.replace("/login?next=/kupon");
  }, [loadingMe, me, router]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-xl space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Ticket className="h-6 w-6 text-accent" />
            Kupon Undian
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hadiah handphone, diundi di akhir event. Kupon didapat dari follow
            akun Universitas STEKOM saat vote pertamamu.
          </p>
        </div>

        {loadingMe || isLoading ? (
          <LoadingState />
        ) : !coupons || coupons.length === 0 ? (
          <EmptyState
            title="Belum ada kupon"
            description="Vote peserta favoritmu dan follow akun Universitas STEKOM untuk mendapatkan kupon."
          />
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <Card
                key={c.code}
                className="overflow-hidden border-primary/25"
              >
                <div className="flex items-stretch">
                  {/* Kiri: identitas kupon */}
                  <CardContent className="flex-1 space-y-2 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                      Kupon Undian Handphone
                    </p>
                    <p className="font-mono text-2xl font-extrabold tracking-wide">
                      {c.code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.owner_name} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                  {/* Kanan: aksi, dipisah garis putus ala tiket */}
                  <div className="flex w-28 flex-col items-center justify-center gap-2 border-l border-dashed bg-muted/30 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/hp.png"
                      alt="Hadiah handphone"
                      className="h-14 w-20 object-contain"
                    />
                    <Button size="sm" onClick={() => downloadCoupon(c)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <p className="text-center text-xs text-muted-foreground">
              Unduh dan simpan kuponmu. Pengundian dilakukan panitia di akhir
              event.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
