"use client";

import * as React from "react";
import {
  Flag,
  Loader2,
  MoreVertical,
  Play,
  Plus,
  Rocket,
  Settings2,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  useRounds,
  useRoundStandings,
  type Round,
  type RoundStanding,
} from "@/lib/queries";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

function statusBadge(s: Round["status"]) {
  if (s === "active") return <Badge variant="success">Berjalan</Badge>;
  if (s === "closed") return <Badge variant="secondary">Selesai</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

export default function AdminRoundsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: rounds, isLoading, isError, refetch } = useRounds();

  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [populateTarget, setPopulateTarget] = React.useState<Round | null>(null);
  const [closeTarget, setCloseTarget] = React.useState<Round | null>(null);
  const [standingsTarget, setStandingsTarget] = React.useState<Round | null>(null);
  const [manageTarget, setManageTarget] = React.useState<Round | null>(null);
  const [boostTarget, setBoostTarget] = React.useState<Round | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rounds"] });
    qc.invalidateQueries({ queryKey: ["active-round"] });
    qc.invalidateQueries({ queryKey: ["heatmap"] });
  };

  async function create() {
    if (name.trim().length < 2) return void toast.error("Isi nama gelombang.");
    setCreating(true);
    try {
      await api("/api/admin/rounds", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      toast.success("Gelombang dibuat.");
      setName("");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat gelombang.");
    } finally {
      setCreating(false);
    }
  }

  function activate(r: Round) {
    confirm({
      title: `Aktifkan ${r.name}?`,
      description:
        "Vote yang masuk mulai sekarang tercatat ke gelombang ini. Gelombang aktif lain otomatis dinonaktifkan.",
      confirmText: "Aktifkan",
      onConfirm: async () => {
        try {
          await api(`/api/admin/rounds/${r.id}/activate`, { method: "POST" });
          toast.success(`${r.name} aktif.`);
          invalidate();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal mengaktifkan.");
        }
      },
    });
  }

  function remove(r: Round) {
    confirm({
      title: `Hapus ${r.name}?`,
      description: "Daftar sekolah gelombang ini ikut terhapus.",
      confirmText: "Hapus",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/rounds/${r.id}`, { method: "DELETE" });
          toast.success("Gelombang dihapus.");
          invalidate();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gelombang</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Adu voting antar sekolah per kabupaten. Sekolah yang punya peserta
          otomatis ikut gelombang aktif. Saat ditutup, yang gugur otomatis
          lanjut ke gelombang berikutnya dengan poin dipotong 50%.
        </p>
      </div>

      {/* Create */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-1">
            <Label>Nama Gelombang</Label>
            <Input
              placeholder="mis. Gelombang 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={create} disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Buat Gelombang
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !rounds || rounds.length === 0 ? (
        <EmptyState
          title="Belum ada gelombang"
          description="Buat gelombang, isi sekolahnya, lalu aktifkan."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gelombang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sekolah</TableHead>
                  <TableHead className="text-right">Lolos</TableHead>
                  <TableHead className="text-right">Total Poin</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.starts_at
                          ? new Date(r.starts_at).toLocaleDateString("id-ID")
                          : "-"}
                        {r.ends_at &&
                          ` s/d ${new Date(r.ends_at).toLocaleDateString("id-ID")}`}
                      </p>
                      {r.scheduled_close_at && (
                        <p className="text-xs text-amber-600">
                          auto-tutup{" "}
                          {new Date(r.scheduled_close_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                          {r.select_mode === "global"
                            ? ` · top ${r.top_n} nasional`
                            : ` · top ${r.top_n}/kab`}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.school_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.lolos_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatNumber(r.total_points ?? 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Aksi"
                              aria-label="Aksi gelombang"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setManageTarget(r)}>
                              <Settings2 /> Kelola
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setStandingsTarget(r)}
                            >
                              <Trophy /> Klasemen
                            </DropdownMenuItem>
                            {r.status !== "closed" && (
                              <DropdownMenuItem
                                onClick={() => setPopulateTarget(r)}
                              >
                                <Users /> Isi Sekolah
                              </DropdownMenuItem>
                            )}
                            {r.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => setBoostTarget(r)}
                              >
                                <Rocket /> Boost Vote
                              </DropdownMenuItem>
                            )}

                            {r.status === "draft" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-primary focus:text-primary"
                                  onClick={() => activate(r)}
                                >
                                  <Play /> Aktifkan
                                </DropdownMenuItem>
                              </>
                            )}
                            {r.status === "active" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setCloseTarget(r)}
                                >
                                  <Flag /> Tutup Gelombang
                                </DropdownMenuItem>
                              </>
                            )}
                            {r.status !== "active" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => remove(r)}
                                >
                                  <Trash2 /> Hapus
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PopulateDialog
        round={populateTarget}
        rounds={rounds ?? []}
        onClose={() => setPopulateTarget(null)}
        onDone={invalidate}
      />
      <CloseDialog
        round={closeTarget}
        onClose={() => setCloseTarget(null)}
        onDone={invalidate}
      />
      <StandingsDialog
        round={standingsTarget}
        onClose={() => setStandingsTarget(null)}
      />
      <ManageDialog
        round={manageTarget}
        onClose={() => setManageTarget(null)}
        onDone={invalidate}
      />
      <BoostDialog
        round={boostTarget}
        onClose={() => setBoostTarget(null)}
        onDone={invalidate}
      />
    </div>
  );
}

function PopulateDialog({
  round,
  rounds,
  onClose,
  onDone,
}: {
  round: Round | null;
  rounds: Round[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [source, setSource] = React.useState<"all" | "gugur">("all");
  const [fromRound, setFromRound] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const closedRounds = rounds.filter(
    (r) => r.status === "closed" && r.id !== round?.id,
  );

  async function submit() {
    if (!round) return;
    if (source === "gugur" && !fromRound) {
      return void toast.error("Pilih gelombang sumber.");
    }
    setBusy(true);
    try {
      const res = await api<{ added: number }>(
        `/api/admin/rounds/${round.id}/populate`,
        {
          method: "POST",
          body: JSON.stringify({
            source,
            from_round_id: source === "gugur" ? fromRound : undefined,
          }),
        },
      );
      toast.success(`${res.added} sekolah dimasukkan.`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengisi sekolah.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!round} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Isi Sekolah: {round?.name}</DialogTitle>
          <DialogDescription>
            Opsional — sekolah yang punya peserta sudah otomatis ikut. Pakai ini
            hanya untuk menarik manual sekolah gugur dari gelombang lain.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
              source === "all" ? "border-primary bg-primary/5 font-medium" : ""
            }`}
          >
            <input
              type="radio"
              checked={source === "all"}
              onChange={() => setSource("all")}
            />
            Semua sekolah yang punya peserta aktif
          </label>
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
              source === "gugur" ? "border-primary bg-primary/5 font-medium" : ""
            }`}
          >
            <input
              type="radio"
              checked={source === "gugur"}
              onChange={() => setSource("gugur")}
            />
            Sekolah yang gugur dari gelombang sebelumnya
          </label>
          {source === "gugur" && (
            <div className="space-y-1.5">
              <Label>Gelombang sumber</Label>
              <select
                className="select-ui"
                value={fromRound}
                onChange={(e) => setFromRound(e.target.value)}
              >
                <option value="">Pilih gelombang selesai</option>
                {closedRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Masukkan Sekolah
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({
  round,
  onClose,
  onDone,
}: {
  round: Round | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [topN, setTopN] = React.useState(1);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (round) setTopN((round as Round & { top_n?: number }).top_n ?? 1);
  }, [round]);

  async function submit() {
    if (!round) return;
    setBusy(true);
    try {
      await api<{ next_round_id: string }>(
        `/api/admin/rounds/${round.id}/close`,
        {
          method: "POST",
          body: JSON.stringify({ top_n: topN }),
        },
      );
      toast.success(
        `${round.name} ditutup. Top ${topN}/kabupaten lolos. Gelombang lanjutan otomatis dibuat & diaktifkan (sekolah gugur + poin 50%).`,
      );
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menutup gelombang.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!round} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tutup {round?.name}</DialogTitle>
          <DialogDescription>
            Sekolah dengan poin terbanyak per kabupaten dinyatakan lolos.
            Sisanya gugur dan <b>otomatis masuk gelombang lanjutan</b> (dibuat
            &amp; diaktifkan langsung) dengan poin dipotong 50%. Sekolah lolos
            tidak ikut. Tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Berapa sekolah lolos per kabupaten?</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value) || 1)}
            />
          </div>
          <Button
            className="w-full"
            variant="destructive"
            onClick={submit}
            disabled={busy}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Tutup &amp; Umumkan Hasil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StandingRow({
  row,
  rank,
}: {
  row: RoundStanding;
  rank: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">
          {rank}
        </span>
        <span className="truncate font-medium">{row.school_name}</span>
        {row.status === "lolos" && <Badge variant="success">Lolos</Badge>}
        {row.status === "gugur" && <Badge variant="destructive">Gugur</Badge>}
      </div>
      <span className="shrink-0 text-right">
        <span className="font-semibold tabular-nums text-primary">
          {formatNumber(row.points)} poin
        </span>
        {row.carry_points > 0 && (
          <span className="block text-[11px] text-muted-foreground">
            bawaan {formatNumber(row.carry_points)} + vote{" "}
            {formatNumber(row.round_points)}
          </span>
        )}
      </span>
    </div>
  );
}

function StandingsDialog({
  round,
  onClose,
}: {
  round: Round | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useRoundStandings(round?.id);
  const [view, setView] = React.useState<"kabupaten" | "nasional">("kabupaten");

  // Kabupaten: kelompok per kabupaten, terurut poin di tiap grup.
  const groups = React.useMemo(() => {
    const map = new Map<string, RoundStanding[]>();
    for (const row of data ?? []) {
      const arr = map.get(row.region_name) ?? [];
      arr.push(row);
      map.set(row.region_name, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.points - a.points);
    return Array.from(map.entries());
  }, [data]);

  // Nasional: satu daftar peringkat lintas kabupaten.
  const nasional = React.useMemo(
    () => [...(data ?? [])].sort((a, b) => b.points - a.points),
    [data],
  );

  return (
    <Dialog open={!!round} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Klasemen: {round?.name}</DialogTitle>
          <DialogDescription>
            Poin per sekolah dalam gelombang ini.
          </DialogDescription>
        </DialogHeader>

        {/* Toggle Kabupaten / Nasional */}
        <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-0.5 text-sm">
          {(["kabupaten", "nasional"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-md px-3 py-1 font-medium capitalize transition-colors " +
                (view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {v}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState title="Belum ada sekolah di gelombang ini" />
        ) : view === "nasional" ? (
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {nasional.map((row, i) => (
              <StandingRow key={row.school_id} row={row} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {groups.map(([region, rows]) => (
              <div key={region}>
                <p className="mb-1.5 text-sm font-semibold">{region}</p>
                <div className="space-y-1.5">
                  {rows.map((row, i) => (
                    <StandingRow key={row.school_id} row={row} rank={i + 1} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RoundSchoolRow = {
  school_id: string;
  school_name: string;
  region_name: string;
  status: "active" | "lolos" | "gugur";
  carry_points: number;
  round_points: number;
  points: number;
  participants: number;
};

function BoostDialog({
  round,
  onClose,
  onDone,
}: {
  round: Round | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const confirm = useConfirm();
  const [schoolId, setSchoolId] = React.useState("");
  const [votes, setVotes] = React.useState(50);
  const [busy, setBusy] = React.useState(false);

  const { data: schools, refetch } = useQuery({
    queryKey: ["round-schools", round?.id],
    enabled: !!round,
    queryFn: () =>
      api<RoundSchoolRow[]>(`/api/admin/rounds/${round!.id}/schools`),
  });

  React.useEffect(() => {
    if (round) {
      setSchoolId("");
      setVotes(50);
    }
  }, [round]);

  async function submit() {
    if (!round) return;
    if (!schoolId) return void toast.error("Pilih sekolah target.");
    if (votes < 1) return void toast.error("Jumlah vote minimal 1.");
    setBusy(true);
    try {
      const res = await api<{ points: number; votes: number }>(
        `/api/admin/rounds/${round.id}/bot-boost`,
        {
          method: "POST",
          body: JSON.stringify({ school_id: schoolId, votes }),
        },
      );
      toast.success(
        `+${res.votes} vote (${formatNumber(res.points)} poin) ditambahkan.`,
      );
      refetch();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal boost.");
    } finally {
      setBusy(false);
    }
  }

  function rollback() {
    if (!round) return;
    confirm({
      title: "Hapus semua vote bot?",
      description:
        "Semua vote sintetis (boost) di gelombang ini dihapus dan poin peserta dikembalikan. Vote asli tidak terpengaruh.",
      confirmText: "Hapus Vote Bot",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await api<{ removed: number }>(
            `/api/admin/rounds/${round.id}/bot-boost`,
            { method: "DELETE" },
          );
          toast.success(`${res.removed} vote bot dihapus.`);
          refetch();
          onDone();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
        }
      },
    });
  }

  return (
    <Dialog open={!!round} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boost Vote: {round?.name}</DialogTitle>
          <DialogDescription>
            Tambah vote sintetis ke sekolah target. Tiap vote = +5 poin, dibagi
            acak ke peserta aktif sekolah itu. Ditandai sebagai bot dan bisa
            dihapus kapan saja.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Sekolah target</Label>
            <select
              className="select-ui"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">Pilih sekolah</option>
              {(schools ?? []).map((s) => (
                <option key={s.school_id} value={s.school_id}>
                  {s.school_name} ({s.participants} peserta)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Jumlah vote</Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={votes}
              onChange={(e) => setVotes(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              = {formatNumber((votes || 0) * 5)} poin
            </p>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <Rocket className="h-4 w-4" /> Boost Sekarang
          </Button>
          <Button
            variant="outline"
            className="w-full text-destructive"
            onClick={rollback}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" /> Hapus Semua Vote Bot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageDialog({
  round,
  onClose,
  onDone,
}: {
  round: Round | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [topN, setTopN] = React.useState(1);
  const [selectMode, setSelectMode] = React.useState<"per_region" | "global">(
    "per_region",
  );
  const [scheduledClose, setScheduledClose] = React.useState("");
  const [sequence, setSequence] = React.useState(0);
  const [addId, setAddId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const { data: roundSchools, refetch } = useQuery({
    queryKey: ["round-schools", round?.id],
    enabled: !!round,
    queryFn: () =>
      api<RoundSchoolRow[]>(`/api/admin/rounds/${round!.id}/schools`),
  });
  const { data: allSchools } = useQuery({
    queryKey: ["schools", "admin"],
    enabled: !!round,
    queryFn: () => api<{ id: string; name: string }[]>("/api/admin/schools"),
  });

  // Prefill saat round berganti.
  React.useEffect(() => {
    if (!round) return;
    const toLocalInput = (iso: string | null) =>
      iso
        ? new Date(
            new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "";
    setName(round.name);
    setTopN(round.top_n ?? 1);
    setSelectMode(round.select_mode ?? "per_region");
    setSequence(round.sequence ?? 0);
    setScheduledClose(toLocalInput(round.scheduled_close_at));
    setEndsAt(toLocalInput(round.ends_at));
    setAddId("");
  }, [round]);

  const memberIds = new Set((roundSchools ?? []).map((r) => r.school_id));
  const addable = (allSchools ?? []).filter((sc) => !memberIds.has(sc.id));
  const closed = round?.status === "closed";

  async function saveSettings() {
    if (!round) return;
    setBusy(true);
    try {
      await api(`/api/admin/rounds/${round.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          top_n: topN,
          select_mode: selectMode,
          sequence: sequence,
          scheduled_close_at: scheduledClose
            ? new Date(scheduledClose).toISOString()
            : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });
      toast.success("Pengaturan disimpan.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function addSchool() {
    if (!round || !addId) return;
    try {
      await api(`/api/admin/rounds/${round.id}/schools`, {
        method: "POST",
        body: JSON.stringify({ school_id: addId }),
      });
      setAddId("");
      refetch();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah sekolah.");
    }
  }

  async function removeSchool(schoolId: string) {
    if (!round) return;
    try {
      await api(`/api/admin/rounds/${round.id}/schools/${schoolId}`, {
        method: "DELETE",
      });
      refetch();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengeluarkan.");
    }
  }

  return (
    <Dialog open={!!round} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kelola: {round?.name}</DialogTitle>
          <DialogDescription>
            Jadwal, aturan lolos, dan sekolah peserta gelombang ini.
            {closed && " Gelombang sudah ditutup - hanya bisa dilihat."}
          </DialogDescription>
        </DialogHeader>

        {/* Pengaturan */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nama Gelombang</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={closed}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Urutan</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={sequence}
                onChange={(e) => setSequence(Number(e.target.value) || 0)}
                disabled={closed}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cara pilih yang lolos</Label>
              <select
                className="select-ui"
                value={selectMode}
                onChange={(e) =>
                  setSelectMode(e.target.value as "per_region" | "global")
                }
                disabled={closed}
              >
                <option value="per_region">Top per kabupaten</option>
                <option value="global">
                  Top nasional (mis. 200 semifinalis)
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>
                {selectMode === "global"
                  ? "Jumlah lolos (nasional)"
                  : "Lolos / kabupaten"}
              </Label>
              <Input
                type="number"
                min={1}
                max={selectMode === "global" ? 5000 : 100}
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value) || 1)}
                disabled={closed}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Auto-tutup terjadwal</Label>
              <Input
                type="datetime-local"
                value={scheduledClose}
                onChange={(e) => setScheduledClose(e.target.value)}
                disabled={closed}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Berakhir (countdown + auto-stop vote)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={closed}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={saveSettings}
            disabled={busy || closed}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Pengaturan
          </Button>
          <p className="text-xs text-muted-foreground">
            &quot;Auto-tutup terjadwal&quot; = gelombang ditutup otomatis saat
            waktu itu tiba (ambil yang lolos, gugur digulir ke gelombang
            berurutan berikutnya dengan poin 50%). Kosong = tutup manual.
            Gelombang tetap dibuka sampai waktu itu, tak peduli tanggal lewat.
          </p>
        </div>

        {/* Sekolah peserta */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Sekolah Peserta ({roundSchools?.length ?? 0})
            </p>
            {!closed && (
              <div className="flex gap-2">
                <select
                  className="select-ui h-8 w-56 pl-2 pr-8 text-xs"
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                >
                  <option value="">Tambah sekolah</option>
                  {addable.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={addSchool} disabled={!addId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {(roundSchools ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada sekolah - pakai &quot;Isi Sekolah&quot; untuk bulk,
              atau tambah satuan di atas.
            </p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {(roundSchools ?? []).map((r) => (
                <div
                  key={r.school_id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{r.school_name}</span>
                      {r.status === "lolos" && (
                        <Badge variant="success">Lolos</Badge>
                      )}
                      {r.status === "gugur" && (
                        <Badge variant="secondary">Gugur</Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.region_name} · {r.participants} peserta ·{" "}
                      {formatNumber(r.points)} poin
                    </p>
                  </div>
                  {!closed && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive"
                      title="Keluarkan dari gelombang"
                      onClick={() => removeSchool(r.school_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
