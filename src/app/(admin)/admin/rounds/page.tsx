"use client";

import * as React from "react";
import {
  Flag,
  Loader2,
  Play,
  Plus,
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
          Adu voting antar sekolah per kabupaten. Yang lolos lanjut; yang gugur
          bisa ikut gelombang berikutnya.
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
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManageTarget(r)}
                        >
                          <Settings2 className="h-4 w-4" /> Kelola
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStandingsTarget(r)}
                        >
                          <Trophy className="h-4 w-4" /> Klasemen
                        </Button>
                        {r.status !== "closed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPopulateTarget(r)}
                          >
                            <Users className="h-4 w-4" /> Isi Sekolah
                          </Button>
                        )}
                        {r.status === "draft" && (
                          <Button size="sm" onClick={() => activate(r)}>
                            <Play className="h-4 w-4" /> Aktifkan
                          </Button>
                        )}
                        {r.status === "active" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setCloseTarget(r)}
                          >
                            <Flag className="h-4 w-4" /> Tutup
                          </Button>
                        )}
                        {r.status !== "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => remove(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
            Tentukan sekolah mana yang ikut bertanding di gelombang ini.
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
      await api(`/api/admin/rounds/${round.id}/close`, {
        method: "POST",
        body: JSON.stringify({ top_n: topN }),
      });
      toast.success(
        `${round.name} ditutup. Top ${topN} per kabupaten lolos.`,
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
            Sekolah dengan poin vote terbanyak per kabupaten dinyatakan lolos;
            sisanya gugur (bisa ikut gelombang berikutnya). Tidak bisa
            dibatalkan.
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

function StandingsDialog({
  round,
  onClose,
}: {
  round: Round | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useRoundStandings(round?.id);

  // Kelompokkan per kabupaten.
  const groups = React.useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const row of data ?? []) {
      const arr = map.get(row.region_name) ?? [];
      arr.push(row);
      map.set(row.region_name, arr);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <Dialog open={!!round} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Klasemen: {round?.name}</DialogTitle>
          <DialogDescription>
            Poin vote per sekolah dalam gelombang ini, dikelompokkan per
            kabupaten.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState title="Belum ada sekolah di gelombang ini" />
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {groups.map(([region, rows]) => (
              <div key={region}>
                <p className="mb-1.5 text-sm font-semibold">{region}</p>
                <div className="space-y-1.5">
                  {(rows ?? []).map((row, i) => (
                    <div
                      key={row.school_id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">
                          {row.school_name}
                        </span>
                        {row.status === "lolos" && (
                          <Badge variant="success">Lolos</Badge>
                        )}
                        {row.status === "gugur" && (
                          <Badge variant="destructive">Gugur</Badge>
                        )}
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-primary">
                        {formatNumber(row.points)} poin
                      </span>
                    </div>
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
  points: number;
  participants: number;
};

function ManageDialog({
  round,
  onClose,
  onDone,
}: {
  round: (Round & { top_n?: number }) | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [topN, setTopN] = React.useState(1);
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
    setName(round.name);
    setTopN(round.top_n ?? 1);
    setEndsAt(
      round.ends_at
        ? new Date(
            new Date(round.ends_at).getTime() -
              new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    );
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
              <Label>Lolos / kabupaten</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value) || 1)}
                disabled={closed}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Berakhir (countdown + auto-stop vote)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={closed}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={saveSettings}
                disabled={busy || closed}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Pengaturan
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Kosongkan &quot;Berakhir&quot; = tanpa batas waktu. Nilai
            &quot;Lolos/kabupaten&quot; dipakai sebagai bawaan saat menutup
            gelombang.
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
