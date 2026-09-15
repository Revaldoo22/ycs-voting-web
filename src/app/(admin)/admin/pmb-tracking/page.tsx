"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { SelectBox } from "@/components/ui/select-box";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";

type JobStatus = "running" | "stopped" | "done";

type Job = {
  id: string;
  status: JobStatus;
  filter_intent: string | null;
  filter_awareness: string | null;
  force: boolean;
  delay_ms: number;
  total: number;
  processed: number;
  ok: number;
  fail: number;
  skipped: number;
  started_by: string | null;
  created_at: string;
  updated_at: string;
};

type JobItem = {
  id: string;
  profile_id: string;
  name: string | null;
  status: "ok" | "fail" | "skipped";
  error: string | null;
  created_at: string;
};

type JobDetail = { job: Job; recent_items: JobItem[]; is_running: boolean };

const AWARE_LABEL: Record<string, string> = {
  belum_tahu: "Belum tahu",
  pernah_dengar: "Pernah dengar",
  sudah_minat: "Sudah tertarik",
};
const INTENT_LABEL: Record<string, string> = {
  ya: "Ya",
  ragu: "Ragu",
  tidak: "Tidak",
};

const STATUS_LABEL: Record<JobStatus, { label: string; variant: "success" | "warning" | "outline" }> = {
  running: { label: "Berjalan", variant: "warning" },
  done: { label: "Selesai", variant: "success" },
  stopped: { label: "Dihentikan", variant: "outline" },
};

function fmtEta(remaining: number, delayMs: number) {
  const ms = remaining * delayMs;
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} menit`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} jam ${m} menit`;
}

export default function AdminPmbTrackingPage() {
  const [intent, setIntent] = React.useState("");
  const [awareness, setAwareness] = React.useState("");
  const [force, setForce] = React.useState(false);
  const [delaySec, setDelaySec] = React.useState("1");
  const confirm = useConfirm();
  const qc = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["pmb-tracking-job"],
    queryFn: () => api<JobDetail | null>("/api/admin/leads/submit-pmb"),
    // Polling: job ini bisa jalan berjam-jam di server, halaman perlu terus
    // menampilkan progress terbaru tanpa admin harus reload manual.
    refetchInterval: (query) =>
      query.state.data?.job?.status === "running" ? 2000 : false,
  });

  const job = detail?.job ?? null;
  const running = job?.status === "running";
  const recentItems = detail?.recent_items ?? [];

  function startJob() {
    confirm({
      title: "Mulai backfill tracking PMB?",
      description: `Job akan berjalan di server, bisa berjam-jam tergantung jumlah data dan jeda ${delaySec} detik/data. Kamu bisa tutup halaman ini, job tetap lanjut.`,
      confirmText: "Mulai",
      onConfirm: doStart,
    });
  }

  async function doStart() {
    try {
      await api("/api/admin/leads/submit-pmb/start", {
        method: "POST",
        body: JSON.stringify({
          intent: intent || undefined,
          awareness: awareness || undefined,
          force,
          delay_ms: Math.round(Number(delaySec) * 1000),
        }),
      });
      toast.success("Job backfill dimulai.");
      qc.invalidateQueries({ queryKey: ["pmb-tracking-job"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai job.");
    }
  }

  function stopJob() {
    if (!job) return;
    confirm({
      title: "Hentikan job ini?",
      description: "Data yang sudah terkirim tetap tersimpan. Bisa dilanjut nanti (yang sudah terkirim otomatis dilewati kalau belum force).",
      confirmText: "Hentikan",
      onConfirm: async () => {
        try {
          await api(`/api/admin/leads/submit-pmb/${job.id}/stop`, { method: "POST" });
          toast.success("Job dihentikan.");
          qc.invalidateQueries({ queryKey: ["pmb-tracking-job"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal menghentikan job.");
        }
      },
    });
  }

  const remaining = job ? Math.max(job.total - job.processed, 0) : 0;
  const pct = job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submit Tracking PMB</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Backfill kirim data voter ke pmb.stekom.ac.id sebagai lead pendaftaran.
          Job berjalan di server, bisa dibiarkan berjam-jam tanpa perlu halaman ini tetap terbuka.
        </p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          {!running && (
            <div className="space-y-4 rounded-2xl border p-4">
              <h2 className="font-semibold">Mulai job baru</h2>
              <FilterBar>
                <FilterField label="Niat Kuliah">
                  <SelectBox
                    value={intent}
                    onChange={setIntent}
                    placeholder="Semua niat"
                    options={[
                      { value: "", label: "Semua niat" },
                      { value: "ya", label: "Ya" },
                      { value: "ragu", label: "Ragu" },
                      { value: "tidak", label: "Tidak" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Kenal Universitas STEKOM">
                  <SelectBox
                    value={awareness}
                    onChange={setAwareness}
                    placeholder="Semua"
                    options={[
                      { value: "", label: "Semua" },
                      { value: "belum_tahu", label: "Belum tahu" },
                      { value: "pernah_dengar", label: "Pernah dengar" },
                      { value: "sudah_minat", label: "Sudah tertarik" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Jeda antar data (detik)">
                  <SelectBox
                    value={delaySec}
                    onChange={setDelaySec}
                    options={[
                      { value: "0.25", label: "0,25 detik (cepat, lebih berisiko)" },
                      { value: "0.5", label: "0,5 detik" },
                      { value: "1", label: "1 detik (disarankan)" },
                      { value: "2", label: "2 detik (paling aman)" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Yang sudah pernah terkirim">
                  <SelectBox
                    value={force ? "force" : "skip"}
                    onChange={(v) => setForce(v === "force")}
                    options={[
                      { value: "skip", label: "Lewati (disarankan)" },
                      { value: "force", label: "Kirim ulang juga" },
                    ]}
                  />
                </FilterField>
              </FilterBar>
              <Button onClick={startJob}>
                <Play className="h-4 w-4" />
                Mulai Backfill
              </Button>
            </div>
          )}

          {job && (
            <div className="space-y-4 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Job Terakhir</h2>
                  <Badge variant={STATUS_LABEL[job.status].variant}>
                    {running && <Loader2 className="h-3 w-3 animate-spin" />}
                    {STATUS_LABEL[job.status].label}
                  </Badge>
                </div>
                {running && (
                  <Button variant="destructive" size="sm" onClick={stopJob}>
                    <Square className="h-4 w-4" />
                    Hentikan
                  </Button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Filter: niat {INTENT_LABEL[job.filter_intent ?? ""] ?? "semua"} ·
                {" "}kenal STEKOM {AWARE_LABEL[job.filter_awareness ?? ""] ?? "semua"} ·
                {" "}jeda {(job.delay_ms / 1000).toFixed(2)}d/data
                {job.force ? " · kirim ulang yang sudah pernah" : ""}
                {job.started_by ? ` · oleh ${job.started_by}` : ""}
              </p>

              <div className="space-y-1.5">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {job.processed}/{job.total} diproses ({pct}%)
                  </span>
                  {running && remaining > 0 && (
                    <span className="text-muted-foreground">
                      Sisa waktu: ± {fmtEta(remaining, job.delay_ms)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-lg font-bold text-emerald-600">{job.ok}</p>
                  <p className="text-muted-foreground">Sukses</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <p className="text-lg font-bold text-destructive">{job.fail}</p>
                  <p className="text-muted-foreground">Gagal</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-lg font-bold">{job.skipped}</p>
                  <p className="text-muted-foreground">Dilewati</p>
                </div>
              </div>
            </div>
          )}

          {recentItems.length > 0 && (
            <div className="overflow-hidden rounded-2xl border">
              <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
                Log terbaru (50 data terakhir diproses)
              </div>
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Waktu</th>
                      <th className="px-3 py-2 text-left font-medium">Nama</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentItems.map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(it.created_at).toLocaleTimeString("id-ID")}
                        </td>
                        <td className="px-3 py-2 font-medium">{it.name ?? "-"}</td>
                        <td className="px-3 py-2">
                          {it.status === "ok" ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Sukses
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3.5 w-3.5" /> Gagal
                            </Badge>
                          )}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-xs text-destructive">
                          {it.error ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
