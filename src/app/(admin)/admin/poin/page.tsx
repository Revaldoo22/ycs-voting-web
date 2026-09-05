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
  max_per_account: number | null;
  is_guaranteed: boolean;
  /** Ambang pemberian otomatis. null = tidak ada jalur otomatis. */
  auto_at_points: number | null;
  auto_at_spins: number | null;
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
 * Ambang pemberian otomatis satu hadiah: sekian poin ATAU sekian kali spin,
 * mana yang lebih dulu tercapai. Kosong = jalur otomatis dimatikan.
 *
 * Berbeda dari mode hadiah pasti. Ambang ini menjamin peserta rajin PALING
 * LAMBAT dapat di titik itu, tapi dia masih bisa dapat lebih awal lewat roda.
 * Mode hadiah pasti sebaliknya: menahan hadiah sampai ambangnya, dan
 * mematikan semua hadiah lain selama aktif.
 */
function AutoBox({ prize }: { prize: SpinPrize }) {
  const qc = useQueryClient();
  const sPts = prize.auto_at_points === null ? "" : String(prize.auto_at_points);
  const sSpn = prize.auto_at_spins === null ? "" : String(prize.auto_at_spins);
  const [dPts, setDPts] = React.useState<string | null>(null);
  const [dSpn, setDSpn] = React.useState<string | null>(null);
  const pts = dPts ?? sPts;
  const spn = dSpn ?? sSpn;
  const [saving, setSaving] = React.useState(false);

  async function save(field: "points" | "spins") {
    const val = field === "points" ? pts : spn;
    const server = field === "points" ? sPts : sSpn;
    if (val === server) return;
    const n = val.trim() === "" ? null : Number(val);
    if (n !== null && (!Number.isInteger(n) || n < 0)) {
      toast.error("Ambang harus bilangan bulat 0 atau lebih.");
      setDPts(null);
      setDSpn(null);
      return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/rewards/prizes/${prize.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          field === "points" ? { auto_at_points: n } : { auto_at_spins: n },
        ),
      });
      toast.success(
        n === null
          ? `${prize.label}: jalur otomatis ${field === "points" ? "poin" : "spin"} dimatikan.`
          : `${prize.label}: otomatis di ${n} ${field === "points" ? "poin" : "kali spin"}.`,
      );
      setDPts(null);
      setDSpn(null);
      qc.invalidateQueries({ queryKey: ["spin-prizes-admin"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan ambang.");
      setDPts(null);
      setDSpn(null);
    } finally {
      setSaving(false);
    }
  }

  const box = "h-8 w-16 text-center";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Otomatis</span>
      <Input
        type="number"
        min={0}
        value={pts}
        placeholder="-"
        disabled={saving || prize.is_locked}
        onChange={(e) => setDPts(e.target.value)}
        onBlur={() => save("points")}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={box}
        title="Diberikan otomatis begitu akun mencapai poin ini"
      />
      <span className="text-xs text-muted-foreground">poin atau</span>
      <Input
        type="number"
        min={0}
        value={spn}
        placeholder="-"
        disabled={saving || prize.is_locked}
        onChange={(e) => setDSpn(e.target.value)}
        onBlur={() => save("spins")}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={box}
        title="Diberikan otomatis begitu akun mencapai jumlah spin ini"
      />
      <span className="text-xs text-muted-foreground">x spin</span>
    </div>
  );
}

/**
 * Bobot peluang satu hadiah di undian acak.
 *
 * Bobot bersifat RELATIF: peluang = bobot dibagi total bobot semua hadiah
 * yang ikut diundi. Jadi menaikkan satu bobot otomatis menurunkan peluang
 * hadiah lain. Karena itu persen hasilnya ditampilkan di sebelahnya, supaya
 * panitia melihat akibat sebenarnya, bukan menebak dari angka bobot.
 */
function WeightBox({
  prize,
  totalWeight,
}: {
  prize: SpinPrize;
  totalWeight: number;
}) {
  const qc = useQueryClient();
  const server = String(prize.weight);
  const [draft, setDraft] = React.useState<string | null>(null);
  const val = draft ?? server;
  const [saving, setSaving] = React.useState(false);

  // Dibulatkan hanya untuk tampilan, hitungannya dari bobot asli.
  const ratio =
    !prize.is_locked && prize.weight > 0 && totalWeight > 0
      ? Math.round(totalWeight / prize.weight)
      : null;

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
        // Rasio dihitung dari bobot mentah, BUKAN dari chance yang sudah
        // dibulatkan 2 desimal. Lewat chance, 1 dari 600 terbaca 1:588
        // karena 0.1667 dibulatkan jadi 0.17.
        title={
          ratio !== null ? `Sekitar 1 dari ${ratio} putaran` : undefined
        }
      >
        {prize.is_locked
          ? "terkunci"
          : ratio !== null
            ? `${prize.chance}% (1:${ratio})`
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

  // Total bobot hadiah yang benar-benar ikut diundi. Dipakai menghitung
  // rasio "1 dari sekian" dari bobot asli, bukan dari persen yang sudah
  // dibulatkan.
  const totalWeight = React.useMemo(
    () =>
      (prizes ?? [])
        .filter((p) => !p.is_locked && p.active && p.weight > 0)
        .reduce((sum, p) => sum + p.weight, 0),
    [prizes],
  );



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

      {/* Peluang, ambang otomatis, kunci hadiah */}
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="font-bold">Hasil Spin</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Roda berputar di web kedua, tapi hadiahnya ditentukan di sini.
              Web kedua hanya menampilkan hasil yang kita kirim.
            </p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-semibold">Peluang & kunci per hadiah</p>
            <p className="text-sm text-muted-foreground">
              Bobot menentukan peluang di undian acak, dan sifatnya relatif:
              peluang = bobot dibagi total bobot semua hadiah. Jadi menaikkan
              satu bobot ikut menurunkan peluang hadiah lain. Persen di
              sebelahnya adalah hasil sebenarnya, dan tidak berlaku selama
              hadiahnya masih ditahan ambang otomatis.
            </p>
            <p className="text-sm text-muted-foreground">
              Hadiah terkunci tetap tampil di roda sebagai pemikat, tapi
              dijamin tidak ada yang bisa mendapatkannya. Jatah kosong berarti
              tanpa batas penerima.
            </p>
            <p className="text-sm text-muted-foreground">
              Satu akun hanya boleh menerima{" "}
              <span className="font-medium text-foreground">
                satu barang seumur hidup
              </span>
              . Yang sudah dapat Tumbler tidak bisa dapat Kaos juga, dan
              seterusnya selalu Dash. Kunci dan Dash tidak ikut dihitung.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Otomatis</span>{" "}
              menahan sekaligus menjamin. Diisi 10 kali spin berarti hadiah itu{" "}
              <span className="font-medium text-foreground">
                tidak bisa didapat sebelum spin ke-10
              </span>{" "}
              walau beruntung, lalu diberikan tepat di spin ke-10. Kalau dua
              kolom diisi, yang lebih dulu tercapai yang berlaku. Kosongkan
              keduanya supaya hadiah murni diundi lewat bobot.
            </p>
            <div className="mt-3 space-y-2">
              {(prizes ?? []).map((p) => (
                  <div key={p.id} className="rounded-lg border p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
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
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <WeightBox prize={p} totalWeight={totalWeight} />
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
                    {/* Ambang otomatis di baris sendiri: barisnya jadi terlalu
                        penuh kalau disejajarkan dengan bobot dan jatah. Dash
                        dan hadiah jaminan tak punya jalur ini. */}
                    {!p.is_empty && !p.is_guaranteed && (
                      <div className="mt-2 border-t pt-2">
                        <AutoBox prize={p} />
                      </div>
                    )}
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
