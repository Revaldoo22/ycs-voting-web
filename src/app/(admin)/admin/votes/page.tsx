"use client";

import * as React from "react";
import Image from "next/image";
import { Check, CheckCheck, Loader2, Vote as VoteIcon, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardSkeletonGrid, EmptyState, ErrorState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

/** Alasan penolakan cepat — admin bisa klik atau ketik sendiri. */
const REJECT_TEMPLATES = [
  "Bukti follow tidak jelas / buram.",
  "Screenshot bukan bukti follow.",
  "Belum follow semua akun yang diminta.",
  "Bukti tidak sesuai dengan tugas.",
];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Label bukti per key tugas (termasuk key lama ig/tiktok). */
const PROOF_LABELS: Record<string, string> = {
  stekom_tiktok: "TikTok Univ STEKOM",
  stekom_ig: "IG Univ STEKOM",
  toploker_tiktok: "TikTok TopLoker",
  toploker_ig: "IG TopLoker",
  wa_stekom: "Saluran WA UnivSTEKOM",
  wa_ycs: "Saluran WA YCS 2026",
  ig: "IG Univ STEKOM",
  tiktok: "TikTok Univ STEKOM",
};

type VoteRow = {
  id: string;
  status: "pending" | "approved";
  points: number;
  created_at: string;
  voter_name: string | null;
  voter_phone: string | null;
  voter_email: string | null;
  voter_status: string | null;
  voter_school: string | null;
  voter_class: string | null;
  follow_proofs: string[] | Record<string, string> | null;
  participants: { id: string; name: string; schools: { name: string } | null };
};

/**
 * Verifikasi vote pertama voter: bukti follow per tugas (IG & TikTok).
 * Approve = poin masuk ke peserta + voter dapat kupon. Reject = vote dihapus
 * (hak vote voter kembali). Mendukung pilih banyak + approve/tolak massal.
 */
export default function AdminVotesPage() {
  const [tab, setTab] = React.useState<string>("pending");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Dialog tolak: { mode: "one", id } untuk satu vote, { mode: "bulk" } untuk terpilih.
  const [rejectTarget, setRejectTarget] = React.useState<
    { mode: "one"; id: string } | { mode: "bulk" } | null
  >(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-votes", tab],
    queryFn: () => api<VoteRow[]>(`/api/admin/votes?status=${tab}`),
  });
  const { data: counts } = useQuery({
    queryKey: ["admin-votes-counts"],
    queryFn: () =>
      api<{ pending: number; approved: number }>("/api/admin/votes/counts"),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-votes"] });
    qc.invalidateQueries({ queryKey: ["admin-votes-counts"] });
  }

  const review = useMutation({
    mutationFn: (v: {
      id: string;
      status: "approved" | "rejected";
      reason?: string;
    }) =>
      api(`/api/admin/votes/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: v.status, reason: v.reason }),
      }),
    onSuccess: invalidate,
  });
  const bulkReview = useMutation({
    mutationFn: (v: {
      ids: string[];
      status: "approved" | "rejected";
      reason?: string;
    }) =>
      api<{ processed: number }>("/api/admin/votes/bulk", {
        method: "POST",
        body: JSON.stringify(v),
      }),
    onSuccess: invalidate,
  });

  // Ganti tab/cari → reset halaman & pilihan.
  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [tab, search]);

  const [processing, setProcessing] = React.useState<Set<string>>(new Set());
  async function act(
    id: string,
    status: "approved" | "rejected",
    reason?: string,
  ) {
    setProcessing((prev) => new Set(prev).add(id));
    try {
      await review.mutateAsync({ id, status, reason });
      toast.success(
        status === "approved"
          ? "Vote disetujui — poin masuk & kupon terbit."
          : "Vote ditolak — voter dapat pemberitahuan & bisa vote ulang.",
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      toast.error("Gagal memproses: " + (e as Error).message);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // Konfirmasi tolak (satu / massal) dengan alasan yang diketik admin.
  async function confirmReject() {
    const reason = rejectReason.trim() || undefined;
    const target = rejectTarget;
    setRejectTarget(null);
    setRejectReason("");
    if (!target) return;

    if (target.mode === "one") {
      await act(target.id, "rejected", reason);
      return;
    }
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await bulkReview.mutateAsync({ ids, status: "rejected", reason });
      toast.success(`${res.processed} vote ditolak — voter diberi tahu.`);
      setSelected(new Set());
    } catch (e) {
      toast.error("Gagal memproses: " + (e as Error).message);
    }
  }

  function bulkApprove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    confirm({
      title: `Approve ${ids.length} vote sekaligus?`,
      description:
        "Poin langsung masuk ke peserta terkait dan setiap voter mendapat kupon undian.",
      confirmText: "Approve Semua",
      onConfirm: async () => {
        try {
          const res = await bulkReview.mutateAsync({ ids, status: "approved" });
          toast.success(`${res.processed} vote disetujui.`);
          setSelected(new Set());
        } catch (e) {
          toast.error("Gagal memproses: " + (e as Error).message);
        }
      },
    });
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (v) =>
        v.voter_name?.toLowerCase().includes(q) ||
        v.voter_email?.toLowerCase().includes(q) ||
        v.voter_phone?.toLowerCase().includes(q) ||
        v.participants?.name.toLowerCase().includes(q),
    );
  }, [data, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Item berkurang (habis di-approve) → mundur ke halaman valid terakhir.
  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Pilih semua di halaman ini (hanya relevan di tab pending).
  const pageIds = paged.map((v) => v.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const bulkBusy = bulkReview.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <VoteIcon className="h-6 w-6 text-primary" />
            Verifikasi Vote
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Review bukti follow (IG &amp; TikTok) vote pertama voter. Approve =
            poin masuk ke peserta + kupon undian terbit.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Menunggu{" "}
              {counts ? <Badge variant="warning">{counts.pending}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Disetujui{" "}
              {counts ? (
                <Badge variant="success">{counts.approved}</Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Cari voter / peserta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        {tab === "pending" && paged.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleSelectPage}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Pilih semua di halaman ini
          </label>
        )}
      </div>

      {/* Bar aksi massal — muncul saat ada yang dipilih */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 backdrop-blur">
          <p className="text-sm font-semibold">
            {selected.size} vote dipilih
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={bulkBusy} onClick={bulkApprove}>
              {bulkBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Approve Terpilih
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={bulkBusy}
              onClick={() => {
                setRejectReason("");
                setRejectTarget({ mode: "bulk" });
              }}
            >
              <X className="h-4 w-4" />
              Tolak Terpilih
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => setSelected(new Set())}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <CardSkeletonGrid />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            tab === "pending"
              ? "Tidak ada vote menunggu review"
              : "Belum ada vote disetujui"
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((v) => {
              const busy = processing.has(v.id) || bulkBusy;
              const isSelected = selected.has(v.id);
              // Format baru: array URL. Data lama: object key tugas → URL.
              const proofs: { label: string; url: string }[] = Array.isArray(
                v.follow_proofs,
              )
                ? v.follow_proofs.map((url, i) => ({
                    label: `Bukti ${i + 1}`,
                    url,
                  }))
                : Object.entries(v.follow_proofs ?? {}).map(([key, url]) => ({
                    label: PROOF_LABELS[key] ?? key,
                    url,
                  }));
              return (
                <Card
                  key={v.id}
                  className={cn(
                    isSelected && "border-primary/60 ring-1 ring-primary/40",
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {v.status === "pending" && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(v.id)}
                            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {v.voter_name ?? "Tanpa nama"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {v.voter_email} · {v.voter_phone}
                          </p>
                          {(v.voter_school || v.voter_class) && (
                            <p className="truncate text-xs text-muted-foreground">
                              {[v.voter_school, v.voter_class]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      {v.status === "pending" ? (
                        <Badge variant="warning">Menunggu</Badge>
                      ) : (
                        <Badge variant="success">Disetujui</Badge>
                      )}
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-2 text-sm">
                      Vote untuk{" "}
                      <span className="font-semibold">
                        {v.participants.name}
                      </span>
                      {v.participants.schools?.name && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {v.participants.schools.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {proofs.map((pf) => (
                        <button
                          key={pf.label}
                          type="button"
                          onClick={() => setPreview(pf.url)}
                          className="space-y-1 text-left"
                        >
                          <p className="text-xs font-medium text-muted-foreground">
                            {pf.label}
                          </p>
                          <Image
                            src={pf.url}
                            alt={pf.label}
                            width={220}
                            height={140}
                            className="h-28 w-full cursor-zoom-in rounded-md border object-cover"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(v.created_at)}
                    </p>

                    {v.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={busy}
                          onClick={() => act(v.id, "approved")}
                        >
                          {processing.has(v.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive"
                          disabled={busy}
                          onClick={() => {
                            setRejectReason("");
                            setRejectTarget({ mode: "one", id: v.id });
                          }}
                        >
                          <X className="h-4 w-4" />
                          Tolak
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                Hal {safePage} / {pageCount} · {filtered.length} vote
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog tolak: alasan penolakan (masuk ke notifikasi voter) */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rejectTarget?.mode === "bulk"
                ? `Tolak ${selected.size} vote`
                : "Tolak vote"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Alasan ini dikirim ke voter sebagai pemberitahuan. Vote dihapus,
              voter bisa vote ulang dengan bukti yang benar.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REJECT_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRejectReason(t)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted",
                    rejectReason === t &&
                      "border-primary/50 bg-primary/10 text-primary",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Tulis alasan penolakan (opsional)..."
              rows={3}
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Batal
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              disabled={bulkBusy}
              onClick={confirmReject}
            >
              <X className="h-4 w-4" />
              Tolak &amp; Beri Tahu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview bukti ukuran penuh */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bukti Follow</DialogTitle>
          </DialogHeader>
          {preview && (
            <Image
              src={preview}
              alt="Bukti follow"
              width={800}
              height={800}
              className="max-h-[70vh] w-full rounded-lg border object-contain"
              unoptimized
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
