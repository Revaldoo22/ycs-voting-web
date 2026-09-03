"use client";

import * as React from "react";
import { History, Loader2, Megaphone, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import { useAnnouncementLog } from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";

/** Template ajakan daftar peserta, bisa diedit sebelum dikirim. */
const TEMPLATE = {
  title: "Mau jadi peserta YCS 2026?",
  body:
    "Pendaftaran peserta masih dibuka dan 100% gratis. Kumpulkan dukungan, " +
    "raih beasiswa, dan jadi Duta Teladan Universitas STEKOM. " +
    "Daftar di events.stekom.ac.id/ycs2026",
};

/**
 * Kirim pengumuman ke lonceng notifikasi akun voter. Dipakai antara lain
 * untuk mengajak voter yang belum jadi peserta ikut mendaftar.
 */
export default function AdminPengumumanPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [title, setTitle] = React.useState(TEMPLATE.title);
  const [body, setBody] = React.useState(TEMPLATE.body);
  const [onlyNonParticipants, setOnlyNonParticipants] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const {
    data: audience,
    isLoading: loadingAudience,
    isError: audienceError,
  } = useQuery({
    queryKey: ["notif-audience"],
    queryFn: () =>
      api<{
        total_akun: number;
        belum_peserta: number;
        dilewati_dedupe: number;
      }>("/api/admin/notifications/audience"),
  });

  const target = onlyNonParticipants
    ? (audience?.belum_peserta ?? 0)
    : (audience?.total_akun ?? 0);
  // Akun yang sudah menerima dalam 24 jam terakhir akan dilewati, jadi yang
  // benar-benar terkirim bisa jauh lebih sedikit dari target.
  const skipped = audience?.dilewati_dedupe ?? 0;
  const willSend = Math.max(0, target - skipped);

  function submit() {
    if (title.trim().length < 3 || body.trim().length < 3) {
      return void toast.error("Judul dan isi pengumuman belum lengkap.");
    }
    confirm({
      title: `Kirim ke ${formatNumber(willSend)} akun?`,
      description:
        "Pengumuman masuk ke lonceng notifikasi mereka dan tidak bisa " +
        "ditarik kembali. Akun yang sudah menerima pengumuman dalam 24 jam " +
        "terakhir otomatis dilewati, jadi aman kalau tombol tertekan dua kali.",
      confirmText: "Kirim",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await api<{ sent: number }>(
            "/api/admin/notifications/broadcast",
            {
              method: "POST",
              body: JSON.stringify({
                title: title.trim(),
                body: body.trim(),
                only_non_participants: onlyNonParticipants,
              }),
            },
          );
          // Riwayat & jumlah penerima ikut disegarkan supaya pengumuman
          // yang baru langsung tampil di daftar bawah.
          qc.invalidateQueries({ queryKey: ["announcement-log"] });
          qc.invalidateQueries({ queryKey: ["notif-audience"] });
          toast.success(
            `Terkirim ke ${formatNumber(res.sent)} akun.` +
              (res.sent < target
                ? ` ${formatNumber(target - res.sent)} dilewati karena sudah menerima dalam 24 jam terakhir.`
                : ""),
          );
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal mengirim.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Megaphone className="h-6 w-6 text-primary" />
          Pengumuman
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Kirim pesan ke lonceng notifikasi akun voter. Cocok untuk mengajak
          voter yang belum jadi peserta ikut mendaftar.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Akun terdaftar
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatNumber(audience?.total_akun ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              termasuk yang belum onboarding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Belum jadi peserta
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
              {formatNumber(audience?.belum_peserta ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              sasaran ajakan mendaftar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="mis. Mau jadi peserta YCS 2026?"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Isi pesan</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={5}
              className="w-full rounded-xl border bg-background p-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Tulis isi pengumuman"
            />
            <p className="text-xs text-muted-foreground">
              {body.length}/1000 karakter
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={onlyNonParticipants}
              onChange={(e) => setOnlyNonParticipants(e.target.checked)}
            />
            <span>
              <span className="font-medium">
                Kirim hanya ke yang belum jadi peserta
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Disarankan tetap dicentang. Peserta tidak perlu menerima ajakan
                mendaftar, dan pesan yang tak relevan membuat notifikasi
                diabaikan.
              </span>
            </span>
          </label>

          {audienceError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Gagal mengambil jumlah penerima. Pastikan backend sudah ter-deploy
              dengan endpoint pengumuman, lalu muat ulang halaman ini.
            </div>
          ) : loadingAudience ? (
            <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
              Menghitung jumlah penerima...
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              Akan dikirim ke <b>{formatNumber(willSend)} akun</b>.
              {skipped > 0 && (
                <span className="mt-1 block text-xs text-amber-700">
                  {formatNumber(skipped)} akun dilewati karena sudah menerima
                  pengumuman dalam 24 jam terakhir. Tunggu besok kalau ingin
                  mengirim ulang ke semuanya.
                </span>
              )}
              {willSend === 0 && skipped === 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {onlyNonParticipants
                    ? "Semua akun voter sudah terdaftar sebagai peserta. Hilangkan centang di atas untuk mengirim ke semuanya."
                    : "Belum ada akun voter yang bisa dikirimi."}
                </span>
              )}
            </div>
          )}

          <Button
            className="w-full"
            onClick={submit}
            disabled={busy || willSend === 0 || loadingAudience || audienceError}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Kirim Pengumuman
          </Button>
        </CardContent>
      </Card>

      <AnnouncementLogList />
    </div>
  );
}

/**
 * Riwayat pengiriman + statistik kliknya. Dipisah dari form supaya admin bisa
 * melihat dampak pengumuman sebelumnya sebelum mengirim yang baru.
 */
function AnnouncementLogList() {
  const { data, isLoading, isFetching, refetch } = useAnnouncementLog();
  const rows = React.useMemo(() => data ?? [], [data]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <History className="h-5 w-5 text-primary" />
              Riwayat Pengiriman
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pengumuman yang pernah dikirim, beserta jumlah yang membuka dan
              mengklik tautannya.
            </p>
          </div>
          {/* Angka dibuka & klik bertambah seiring waktu, jadi perlu cara
              menyegarkan tanpa memuat ulang seluruh halaman. */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
            Segarkan
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada pengumuman terkirim"
            description="Riwayat muncul setelah pengumuman pertama dikirim."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((a) => (
              <div key={a.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {a.body}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {a.only_non_participants ? "Belum peserta" : "Semua akun"}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold tabular-nums">
                      {formatNumber(a.sent_count)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Terkirim
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold tabular-nums">
                      {formatNumber(a.read_count)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Dibuka</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <p className="text-lg font-bold tabular-nums text-primary">
                      {formatNumber(a.clicks)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Klik tautan
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {a.sent_by ? ` oleh ${a.sent_by}` : ""}
                  {a.click_accounts > 0
                    ? ` · ${formatNumber(a.click_accounts)} akun mengklik`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
