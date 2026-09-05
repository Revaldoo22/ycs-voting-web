"use client";

import * as React from "react";
import {
  Coins,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Power,
  PowerOff,
  Scale,
  Search,
  Trash2,
} from "lucide-react";
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

type SpinCfg = {
  spin_enabled: boolean;
  spin_forced_prize_code: string | null;
  spin_forced_min_spins: number | null;
};

type SpinPrize = {
  id: string;
  code: string;
  label: string;
  weight: number;
  active: boolean;
  is_locked: boolean;
  is_empty: boolean;
  winner_quota: number | null;
  /** Peluang di undian acak, persen. Dihitung server dari bobot. */
  chance: number;
};

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
 * Bobot peluang satu hadiah di undian acak.
 *
 * Bobot bersifat RELATIF: peluang = bobot dibagi total bobot semua hadiah
 * yang ikut diundi. Jadi menaikkan satu bobot otomatis menurunkan peluang
 * hadiah lain. Karena itu persen hasilnya ditampilkan di sebelahnya, supaya
 * panitia melihat akibat sebenarnya, bukan menebak dari angka bobot.
 */
function WeightBox({ prize }: { prize: SpinPrize }) {
  const qc = useQueryClient();
  const server = String(prize.weight);
  const [draft, setDraft] = React.useState<string | null>(null);
  const val = draft ?? server;
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (val === server) return;
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0) {
      toast.error("Bobot harus bilangan bulat 0 atau lebih.");
      setDraft(null);
      return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/rewards/prizes/${prize.id}`, {
        method: "PATCH",
        body: JSON.stringify({ weight: n }),
      });
      toast.success(
        n === 0
          ? `${prize.label}: bobot 0, tidak ikut undian acak.`
          : `${prize.label}: bobot ${n}.`,
      );
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["spin-prizes-admin"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan bobot.");
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Bobot</span>
      <Input
        type="number"
        min={0}
        value={val}
        disabled={saving || prize.is_locked}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-8 w-20 text-center"
      />
      <span
        className={cn(
          "w-24 shrink-0 text-xs tabular-nums",
          prize.chance > 0 ? "text-foreground" : "text-muted-foreground",
        )}
        // Persen kecil sulit dirasakan, jadi ditemani bentuk "1 dari sekian"
        // yang lebih mudah dibayangkan panitia.
        title={
          prize.chance > 0
            ? `Sekitar 1 dari ${Math.round(100 / prize.chance)} putaran`
            : undefined
        }
      >
        {prize.is_locked
          ? "terkunci"
          : prize.chance > 0
            ? `${prize.chance}% (1:${Math.round(100 / prize.chance)})`
            : "0%"}
      </span>
    </div>
  );
}

/**
 * Jatah jumlah penerima satu hadiah. Kosong = tanpa batas.
 *
 * Penting untuk mode hadiah pasti: Tumbler dari seed dibatasi 8 penerima,
 * jadi "semua dapat Tumbler" hanya berlaku untuk 8 orang pertama kalau
 * jatahnya tidak dinaikkan.
 */
function QuotaBox({ prize }: { prize: SpinPrize }) {
  const qc = useQueryClient();
  const server = prize.winner_quota === null ? "" : String(prize.winner_quota);
  const [draft, setDraft] = React.useState<string | null>(null);
  const val = draft ?? server;
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (val === server) return;
    setSaving(true);
    try {
      await api(`/api/admin/rewards/prizes/${prize.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          winner_quota: val.trim() === "" ? null : Number(val),
        }),
      });
      toast.success(
        val.trim() === ""
          ? `${prize.label}: jatah dilepas, tanpa batas penerima.`
          : `${prize.label}: jatah ${val} penerima.`,
      );
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["spin-prizes-admin"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan jatah.");
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Jatah</span>
      <Input
        type="number"
        min={0}
        value={val}
        placeholder="∞"
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-8 w-20 text-center"
      />
    </div>
  );
}

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
    queryFn: () => api<SpinCfg>("/api/admin/rewards/spin-options"),
  });
  const { data: prizes } = useQuery({
    queryKey: ["spin-prizes-admin"],
    queryFn: () => api<SpinPrize[]>("/api/admin/rewards/prizes"),
  });
  const [togglingSpin, setTogglingSpin] = React.useState(false);
  const [savingMode, setSavingMode] = React.useState(false);

  // Hadiah terkunci tak boleh jadi hadiah paksa, jadi tidak ikut ditawarkan.
  const forceable = React.useMemo(
    () => (prizes ?? []).filter((p) => !p.is_locked && !p.is_empty),
    [prizes],
  );
  const forcedCode = spinCfg?.spin_forced_prize_code ?? "";
  const forcedMin = spinCfg?.spin_forced_min_spins ?? 0;

  // Draft form, disemai dari server begitu datanya masuk.
  const [modeCode, setModeCode] = React.useState<string | null>(null);
  const [modeMin, setModeMin] = React.useState<string | null>(null);
  const codeVal = modeCode ?? forcedCode;
  const minVal = modeMin ?? String(forcedMin);
  const modeDirty = codeVal !== forcedCode || minVal !== String(forcedMin);

  async function saveMode() {
    setSavingMode(true);
    try {
      await api("/api/admin/rewards/spin-options", {
        method: "PATCH",
        body: JSON.stringify({
          spin_forced_prize_code: codeVal || null,
          spin_forced_min_spins: codeVal ? Number(minVal || 0) : null,
        }),
      });
      toast.success(
        codeVal
          ? "Mode hadiah pasti disimpan."
          : "Roda kembali acak sesuai bobot.",
      );
      setModeCode(null);
      setModeMin(null);
      qc.invalidateQueries({ queryKey: ["spin-options-admin"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSavingMode(false);
    }
  }

  function toggleLock(p: SpinPrize) {
    const next = !p.is_locked;
    confirm({
      title: next ? `Kunci ${p.label}?` : `Buka kunci ${p.label}?`,
      description: next
        ? "Hadiah tetap tampil di roda web kedua sebagai pemikat, tapi dijamin tidak ada yang bisa mendapatkannya lewat jalur mana pun."
        : `${p.label} bisa keluar lagi. Pastikan hadiahnya benar-benar sudah siap dibagikan sebelum membuka kunci.`,
      confirmText: next ? "Kunci" : "Buka Kunci",
      variant: next ? "default" : "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/rewards/prizes/${p.id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_locked: next }),
          });
          toast.success(next ? `${p.label} dikunci.` : `${p.label} dibuka.`);
          qc.invalidateQueries({ queryKey: ["spin-prizes-admin"] });
          qc.invalidateQueries({ queryKey: ["spin-options-admin"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal mengubah.");
        }
      },
    });
  }

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

      {/* Hadiah pasti + kunci hadiah besar */}
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="font-bold">Hasil Spin</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Roda berputar di web kedua, tapi hadiahnya ditentukan di sini.
              Web kedua hanya menampilkan hasil yang kita kirim.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Hadiah yang selalu keluar</Label>
              <select
                value={codeVal}
                onChange={(e) => setModeCode(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-transparent",
                  "px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-[3px]",
                  "focus-visible:ring-ring/50",
                )}
              >
                <option value="">Acak sesuai bobot (normal)</option>
                {forceable.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Mulai spin ke-</Label>
              <Input
                type="number"
                min={0}
                value={minVal}
                onChange={(e) => setModeMin(e.target.value)}
                disabled={!codeVal}
                className="sm:w-28"
              />
            </div>
            <Button onClick={saveMode} disabled={savingMode || !modeDirty}>
              {savingMode && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {codeVal ? (
              <>
                Setiap spin dapat{" "}
                <span className="font-semibold text-foreground">
                  {forceable.find((p) => p.code === codeVal)?.label ?? codeVal}
                </span>
                {Number(minVal || 0) > 1 ? (
                  <>
                    {" "}
                    mulai spin ke-{minVal}. Sebelum itu hasilnya Dash, jadi
                    voter perlu {minVal} kali spin dulu.
                  </>
                ) : (
                  " sejak spin pertama."
                )}{" "}
                Jatah tetap berlaku: hadiah ini dibatasi{" "}
                {forceable.find((p) => p.code === codeVal)?.winner_quota ===
                null
                  ? "tanpa batas jumlah penerima"
                  : `${forceable.find((p) => p.code === codeVal)?.winner_quota} penerima`}
                , dan begitu habis sisanya dapat Dash. Naikkan jatahnya di
                bawah kalau semua peserta memang harus kebagian.
              </>
            ) : (
              "Roda berjalan normal: hadiah diundi sesuai bobot masing-masing."
            )}
          </p>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-semibold">Peluang & kunci per hadiah</p>
            <p className="text-sm text-muted-foreground">
              Bobot menentukan peluang di undian acak, dan sifatnya relatif:
              peluang = bobot dibagi total bobot semua hadiah. Jadi menaikkan
              satu bobot ikut menurunkan peluang hadiah lain. Persen di
              sebelahnya adalah hasil sebenarnya.
            </p>
            <p className="text-sm text-muted-foreground">
              Hadiah terkunci tetap tampil di roda sebagai pemikat, tapi
              dijamin tidak ada yang bisa mendapatkannya. Jatah kosong berarti
              tanpa batas penerima.
            </p>
            <div className="mt-3 space-y-2">
              {(prizes ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {p.is_empty ? (
                        <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : p.is_locked ? (
                        <Lock className="h-4 w-4 shrink-0 text-destructive" />
                      ) : (
                        <LockOpen className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                      <span className="truncate font-medium">
                        {p.is_empty ? "Dash (belum beruntung)" : p.label}
                      </span>
                      {p.is_empty ? (
                        <Badge variant="secondary">Penyeimbang</Badge>
                      ) : p.is_locked ? (
                        <Badge variant="destructive">Terkunci</Badge>
                      ) : p.code === codeVal ? (
                        <Badge>Hadiah pasti</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <WeightBox prize={p} />
                      {!p.is_empty && <QuotaBox prize={p} />}
                      {!p.is_empty && (
                        <Button
                          size="sm"
                          variant={p.is_locked ? "outline" : "ghost"}
                          onClick={() => toggleLock(p)}
                        >
                          {p.is_locked ? "Buka Kunci" : "Kunci"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              {prizes !== undefined && prizes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Belum ada hadiah spin. Seed dulu lewat menu hadiah.
                </p>
              )}
            </div>
          </div>
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
