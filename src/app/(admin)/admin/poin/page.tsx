"use client";

import * as React from "react";
import { Coins, Loader2, Plus, Power, PowerOff, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import { cn, formatNumber } from "@/lib/utils";

type Balance = {
  email: string;
  name: string | null;
  points_earned: number;
  points_adjusted: number;
  points_spent: number;
  points_available: number;
  keys_available: number;
  spins_available: number;
};

type Adjustment = {
  id: string;
  email: string;
  account_name: string | null;
  points: number;
  reason: string;
  created_by: string | null;
  created_at: string;
};

/**
 * Tambah / kurangi saldo poin spin sebuah akun tanpa membuat vote.
 *
 * Sengaja bukan lewat vote: poin belanja dihitung dari vote approved, jadi
 * membuat vote palsu akan menaikkan statistik event, klasemen, dan Vote
 * Masuk. Penyesuaian di sini hanya menggeser saldo spin.
 */
export default function AdminPoinPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [email, setEmail] = React.useState("");
  const [lookup, setLookup] = React.useState("");
  const [points, setPoints] = React.useState(50);
  const [reason, setReason] = React.useState("Testing spin");
  const [busy, setBusy] = React.useState(false);

  const { data: balance, isFetching: loadingBalance } = useQuery({
    queryKey: ["reward-balance", lookup],
    enabled: lookup.length > 3,
    queryFn: () =>
      api<Balance>(`/api/admin/rewards/balance/${encodeURIComponent(lookup)}`),
  });

  const { data: log, isLoading: loadingLog } = useQuery({
    queryKey: ["point-adjustments"],
    queryFn: () =>
      api<Adjustment[]>("/api/admin/rewards/point-adjustments"),
  });

  const rows = React.useMemo(() => log ?? [], [log]);

  // Status roda spin. Dipakai panitia menutup spin saat hadiah belum siap.
  const { data: spinCfg } = useQuery({
    queryKey: ["spin-options-admin"],
    queryFn: () =>
      api<{ spin_enabled: boolean }>("/api/admin/rewards/spin-options"),
  });
  const [togglingSpin, setTogglingSpin] = React.useState(false);

  function toggleSpin(next: boolean) {
    confirm({
      title: next ? "Buka roda spin?" : "Tutup roda spin?",
      description: next
        ? "Voter di web kedua bisa memutar roda lagi."
        : "Roda spin ditutup untuk semua akun. Permintaan spin ditolak server, jadi tetap aman walau tombolnya masih tampil di web kedua.",
      confirmText: next ? "Buka" : "Tutup",
      variant: next ? "default" : "destructive",
      onConfirm: async () => {
        setTogglingSpin(true);
        try {
          await api("/api/admin/rewards/spin-options", {
            method: "PATCH",
            body: JSON.stringify({ spin_enabled: next }),
          });
          toast.success(next ? "Roda spin dibuka." : "Roda spin ditutup.");
          qc.invalidateQueries({ queryKey: ["spin-options-admin"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal mengubah.");
        } finally {
          setTogglingSpin(false);
        }
      },
    });
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["point-adjustments"] });
    qc.invalidateQueries({ queryKey: ["reward-balance"] });
  }

  function submit() {
    const mail = email.trim().toLowerCase();
    if (!mail) return void toast.error("Email akun belum diisi.");
    if (!Number.isInteger(points) || points === 0) {
      return void toast.error("Jumlah poin harus bilangan bulat bukan 0.");
    }
    if (reason.trim().length < 3) {
      return void toast.error("Alasan minimal 3 karakter.");
    }
    confirm({
      title:
        points > 0
          ? `Tambah ${formatNumber(points)} poin?`
          : `Kurangi ${formatNumber(Math.abs(points))} poin?`,
      description:
        `Saldo spin ${mail} disesuaikan. Vote dan klasemen tidak ` +
        "terpengaruh, jadi statistik event tetap akurat. Penyesuaian bisa " +
        "dibatalkan lewat riwayat di bawah.",
      confirmText: points > 0 ? "Tambah" : "Kurangi",
      variant: points > 0 ? "default" : "destructive",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await api<{ balance: Balance }>(
            "/api/admin/rewards/point-adjustments",
            {
              method: "POST",
              body: JSON.stringify({
                email: mail,
                points,
                reason: reason.trim(),
              }),
            },
          );
          toast.success(
            `Saldo ${mail} sekarang ${formatNumber(res.balance.points_available)} poin.`,
          );
          setLookup(mail);
          refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal menyesuaikan.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function remove(a: Adjustment) {
    confirm({
      title: "Batalkan penyesuaian ini?",
      description:
        `${a.points > 0 ? "+" : ""}${formatNumber(a.points)} poin untuk ` +
        `${a.email} akan ditarik kembali, saldo kembali seperti sebelumnya.`,
      confirmText: "Batalkan",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/rewards/point-adjustments/${a.id}`, {
            method: "DELETE",
          });
          toast.success("Penyesuaian dibatalkan.");
          refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal membatalkan.");
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Coins className="h-6 w-6 text-amber-500" />
          Penyesuaian Poin
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tambah atau kurangi saldo poin spin sebuah akun. Tidak membuat vote,
          jadi klasemen dan statistik event tetap akurat.
        </p>
      </div>

      {/* Status roda spin */}
      <Card
        className={cn(
          "border-l-4",
          spinCfg?.spin_enabled === false
            ? "border-l-destructive"
            : "border-l-emerald-500",
        )}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold">
              {spinCfg?.spin_enabled === false ? (
                <PowerOff className="h-4 w-4 text-destructive" />
              ) : (
                <Power className="h-4 w-4 text-emerald-600" />
              )}
              Roda Spin{" "}
              {spinCfg?.spin_enabled === false ? "Ditutup" : "Dibuka"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {spinCfg?.spin_enabled === false
                ? "Voter tidak bisa memutar roda di web kedua."
                : "Voter bisa memutar roda di web kedua."}
            </p>
          </div>
          <Button
            variant={spinCfg?.spin_enabled === false ? "default" : "destructive"}
            onClick={() => toggleSpin(spinCfg?.spin_enabled === false)}
            disabled={togglingSpin || spinCfg === undefined}
          >
            {togglingSpin && <Loader2 className="h-4 w-4 animate-spin" />}
            {spinCfg?.spin_enabled === false ? "Buka Spin" : "Tutup Spin"}
          </Button>
        </CardContent>
      </Card>

      {/* Cek saldo */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="space-y-1.5">
            <Label>Cek saldo akun</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setLookup(email.trim().toLowerCase());
                  }}
                  placeholder="email akun, mis. budi@sekolah.sch.id"
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setLookup(email.trim().toLowerCase())}
                disabled={email.trim().length < 4}
              >
                Cek
              </Button>
            </div>
          </div>

          {lookup.length > 3 &&
            (loadingBalance ? (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                Mengambil saldo...
              </div>
            ) : balance ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SaldoTile
                  label="Bisa dipakai"
                  value={balance.points_available}
                  tone
                />
                <SaldoTile label="Dari vote" value={balance.points_earned} />
                <SaldoTile
                  label="Penyesuaian"
                  value={balance.points_adjusted}
                />
                <SaldoTile label="Terpakai" value={balance.points_spent} />
              </div>
            ) : null)}
        </CardContent>
      </Card>

      {/* Form penyesuaian */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm font-semibold">Sesuaikan saldo</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email akun</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@sekolah.sch.id"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah poin</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value) || 0)}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Angka negatif mengurangi, mis. -20 untuk menarik kembali.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Alasan</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="mis. Testing spin di web kedua"
            />
            <p className="text-xs text-muted-foreground">
              Tercatat di riwayat bersama nama admin, supaya bisa
              dipertanggungjawabkan.
            </p>
          </div>

          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Terapkan Penyesuaian
          </Button>
        </CardContent>
      </Card>

      {/* Riwayat */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm font-semibold">Riwayat Penyesuaian</p>

          {loadingLog ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Belum ada penyesuaian"
              description="Riwayat muncul setelah penyesuaian pertama."
            />
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {rows.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={a.points > 0 ? "success" : "destructive"}
                        className="shrink-0"
                      >
                        {a.points > 0 ? "+" : ""}
                        {formatNumber(a.points)} poin
                      </Badge>
                      <span className="truncate font-medium">
                        {a.account_name ?? a.email}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {a.reason}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {a.created_by ? ` oleh ${a.created_by}` : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-destructive"
                    title="Batalkan penyesuaian"
                    onClick={() => remove(a)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SaldoTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3 text-center">
      <p
        className={cn(
          "text-xl font-bold tabular-nums",
          tone && "text-amber-600",
        )}
      >
        {formatNumber(value)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
