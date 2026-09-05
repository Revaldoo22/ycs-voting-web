"use client";

import * as React from "react";
import {
  Check,
  Gift,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  School,
  Search,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import { cn, formatNumber } from "@/lib/utils";

type Status = "pending" | "approved" | "sent" | "rejected";

type Klaim = {
  id: string;
  email: string;
  prize_code: string;
  prize_label: string;
  image_url: string | null;
  name: string;
  school: string;
  region: string;
  contact: string;
  address: string | null;
  note: string | null;
  status: Status;
  admin_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  won_at: string;
  won_source: string;
};

type Counts = Record<Status, number>;

const TAB: { key: Status; label: string }[] = [
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "sent", label: "Sudah dikirim" },
  { key: "rejected", label: "Ditolak" },
];

const WARNA: Record<Status, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-600",
  sent: "bg-sky-600",
  rejected: "bg-destructive",
};

function waktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Nomor WA jadi tautan chat, supaya panitia tak perlu menyalin manual. */
function waLink(nomor: string) {
  const digit = nomor.replace(/\D/g, "");
  return `https://wa.me/${digit.startsWith("0") ? "62" + digit.slice(1) : digit}`;
}

/**
 * Pengajuan klaim hadiah spin dari peserta.
 *
 * Data pengiriman disalin saat pengajuan, bukan dibaca dari profil, jadi apa
 * yang tampil di sini adalah yang peserta tulis waktu itu.
 */
export default function AdminKlaimHadiahPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = React.useState<Status>("pending");
  const [cari, setCari] = React.useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["prize-claims", tab],
    queryFn: () => api<Klaim[]>(`/api/admin/rewards/claims?status=${tab}`),
    placeholderData: (prev) => prev,
  });

  const { data: counts } = useQuery({
    queryKey: ["prize-claim-counts"],
    queryFn: () => api<Counts>("/api/admin/rewards/claims/counts"),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["prize-claims"] });
    qc.invalidateQueries({ queryKey: ["prize-claim-counts"] });
  }

  async function ubah(k: Klaim, status: Status, adminNote?: string) {
    try {
      await api(`/api/admin/rewards/claims/${k.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, admin_note: adminNote }),
      });
      toast.success(
        status === "approved"
          ? `Klaim ${k.name} disetujui.`
          : status === "sent"
            ? `${k.prize_label} untuk ${k.name} ditandai sudah dikirim.`
            : status === "rejected"
              ? `Klaim ${k.name} ditolak.`
              : "Status diubah.",
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status.");
    }
  }

  function tolak(k: Klaim) {
    // Alasan wajib: server menolak tanpa ini, dan peserta perlu tahu
    // penyebabnya supaya bisa mengajukan ulang dengan data yang benar.
    const alasan = window.prompt(
      `Alasan menolak klaim ${k.name} (${k.prize_label}):`,
      "",
    );
    if (alasan === null) return;
    if (alasan.trim().length < 3) {
      return void toast.error("Alasan minimal 3 karakter.");
    }
    confirm({
      title: "Tolak klaim ini?",
      description: `${k.name} akan melihat alasan: "${alasan.trim()}"`,
      confirmText: "Tolak",
      variant: "destructive",
      onConfirm: () => ubah(k, "rejected", alasan.trim()),
    });
  }

  const rows = React.useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q) ||
        k.school.toLowerCase().includes(q) ||
        k.contact.includes(q),
    );
  }, [data, cari]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Package className="h-6 w-6 text-primary" />
            Klaim Hadiah
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pengajuan hadiah spin dari peserta, lengkap dengan data pengiriman.
            Peserta hanya bisa mengajukan hadiah yang benar-benar dia menangkan.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Muat Ulang
        </Button>
      </div>

      {/* Tab status */}
      <div className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts && counts[t.key] > 0 && (
              <Badge
                variant={tab === t.key ? "secondary" : "outline"}
                className="ml-1"
              >
                {formatNumber(counts[t.key])}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={cari}
              placeholder="Cari nama, email, sekolah, atau nomor WA"
              onChange={(e) => setCari(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Tidak ada pengajuan"
          description={
            cari
              ? "Tidak ada yang cocok dengan pencarian."
              : `Belum ada klaim berstatus ${TAB.find((t) => t.key === tab)?.label.toLowerCase()}.`
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((k) => (
            <Card key={k.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {k.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={k.image_url}
                        alt={k.prize_label}
                        className="h-12 w-12 shrink-0 rounded border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border">
                        <Gift className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{k.prize_label}</span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs text-white",
                            WARNA[k.status],
                          )}
                        >
                          {TAB.find((t) => t.key === k.status)?.label}
                        </span>
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        Menang {waktu(k.won_at)} &middot; diajukan{" "}
                        {waktu(k.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data pengiriman */}
                <div className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
                  <p className="font-medium">{k.name}</p>
                  <p className="text-muted-foreground">{k.email}</p>
                  <p className="flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {k.school}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {k.region}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={waLink(k.contact)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {k.contact}
                    </a>
                  </p>
                  {k.address && (
                    <p className="text-muted-foreground sm:col-span-2">
                      Alamat: {k.address}
                    </p>
                  )}
                  {k.note && (
                    <p className="text-muted-foreground sm:col-span-2">
                      Catatan peserta: {k.note}
                    </p>
                  )}
                </div>

                {k.admin_note && (
                  <p className="rounded-lg border border-dashed p-2.5 text-sm">
                    <span className="font-medium">Catatan panitia:</span>{" "}
                    {k.admin_note}
                  </p>
                )}

                {k.handled_at && (
                  <p className="text-sm text-muted-foreground">
                    Diproses {waktu(k.handled_at)}
                    {k.handled_by ? ` oleh ${k.handled_by}` : ""}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {k.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => ubah(k, "approved")}>
                        <Check className="h-4 w-4" />
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => tolak(k)}
                      >
                        <X className="h-4 w-4" />
                        Tolak
                      </Button>
                    </>
                  )}
                  {k.status === "approved" && (
                    <Button size="sm" onClick={() => ubah(k, "sent")}>
                      <Truck className="h-4 w-4" />
                      Tandai Sudah Dikirim
                    </Button>
                  )}
                  {(k.status === "rejected" || k.status === "sent") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        confirm({
                          title: "Kembalikan ke menunggu?",
                          description:
                            "Pengajuan ini bisa diproses ulang dari awal.",
                          confirmText: "Kembalikan",
                          onConfirm: () => ubah(k, "pending"),
                        })
                      }
                    >
                      Kembalikan ke Menunggu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
