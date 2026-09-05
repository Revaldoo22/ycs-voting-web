"use client";

import * as React from "react";
import {
  Gift,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Wind,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/states";
import { api } from "@/lib/api-client";
import { cn, formatNumber } from "@/lib/utils";

type Hasil = {
  prize_label: string;
  prize_code: string;
  is_empty: boolean;
  is_bonus: boolean;
  source: "random" | "guaranteed" | "auto" | "targeted";
};

type Baris = {
  batch_id: string | null;
  email: string;
  name: string | null;
  created_at: string;
  total_spin: number;
  bonus_spin: number;
  dapat_hadiah: number;
  poin_ditagih: number;
  hasil: Hasil[];
};

type LogResp = {
  ringkasan: {
    total_permintaan: number;
    total_spin: number;
    total_hadiah: number;
    total_akun: number;
  };
  rows: Baris[];
};

type Tally = {
  prize_code: string;
  prize_label: string;
  keluar: number;
  penerima: number;
  pertama: string;
  terakhir: string;
};

type Target = {
  id: string;
  email: string | null;
  phone: string | null;
  prize_code: string;
  prize_label: string | null;
  account_name: string | null;
  at_spin: number | null;
  reason: string;
  created_by: string | null;
  used_at: string | null;
  used_by_email: string | null;
  created_at: string;
};

type PrizeOpt = {
  id: string;
  code: string;
  label: string;
  is_locked: boolean;
  is_empty: boolean;
};

const PER_HAL = 50;

/** Dari mana hadiah itu datang, supaya panitia bisa menelusuri sengketa. */
const SUMBER: Record<Hasil["source"], string> = {
  random: "undian",
  guaranteed: "jaminan",
  auto: "ambang otomatis",
  targeted: "ditandai panitia",
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

/**
 * Penandaan hadiah untuk akun tertentu.
 *
 * Dipakai saat pemenang ditetapkan di luar sistem: hadiah panggung,
 * kompensasi keluhan, atau tamu undangan. Berbeda dari bobot dan ambang yang
 * berlaku untuk semua orang, ini hanya mengenai satu akun dan sekali pakai.
 */
function PanelTarget() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [prize, setPrize] = React.useState("");
  const [atSpin, setAtSpin] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const { data: targets, isLoading } = useQuery({
    queryKey: ["spin-targets"],
    queryFn: () => api<Target[]>("/api/admin/rewards/spin-targets"),
  });
  const { data: prizes } = useQuery({
    queryKey: ["spin-prizes-admin"],
    queryFn: () => api<PrizeOpt[]>("/api/admin/rewards/prizes?all=1"),
  });

  // Hadiah terkunci dan Dash tidak masuk pilihan: yang pertama ditolak
  // server, yang kedua tidak masuk akal ditetapkan sebagai hadiah.
  const pilihan = React.useMemo(
    () => (prizes ?? []).filter((p) => !p.is_locked && !p.is_empty),
    [prizes],
  );

  async function submit() {
    if (!email.trim() && !phone.trim()) {
      return void toast.error("Isi email atau nomor WA akunnya.");
    }
    if (!prize) return void toast.error("Pilih hadiahnya dulu.");
    if (reason.trim().length < 3) {
      return void toast.error("Alasan minimal 3 karakter.");
    }
    setBusy(true);
    try {
      await api("/api/admin/rewards/spin-targets", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          prize_code: prize,
          at_spin: atSpin.trim() ? Number(atSpin) : undefined,
          reason: reason.trim(),
        }),
      });
      toast.success("Penandaan disimpan.");
      setEmail("");
      setPhone("");
      setAtSpin("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["spin-targets"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  function hapus(t: Target) {
    confirm({
      title: "Batalkan penandaan ini?",
      description: `${t.email ?? t.phone} tidak jadi mendapat ${t.prize_label ?? t.prize_code}.`,
      confirmText: "Batalkan",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/rewards/spin-targets/${t.id}`, {
            method: "DELETE",
          });
          toast.success("Penandaan dibatalkan.");
          qc.invalidateQueries({ queryKey: ["spin-targets"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal membatalkan.");
        }
      },
    });
  }

  const rows = targets ?? [];

  return (
    <Card>
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div>
          <p className="flex items-center gap-2 font-bold">
            <Target className="h-4 w-4 text-primary" />
            Tandai Akun Dapat Hadiah
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Untuk pemenang yang sudah ditetapkan panitia. Akun dicocokkan lewat
            email atau nomor WA, cukup salah satu. Sekali pakai, dan hasilnya
            tercatat di log sebagai ditandai panitia.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Email akun</Label>
            <Input
              value={email}
              placeholder="budi@sekolah.sch.id"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>atau Nomor WA</Label>
            <Input
              value={phone}
              placeholder="0812xxxxxxx"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hadiah</Label>
            <select
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border border-input bg-transparent",
                "px-3 text-sm shadow-xs outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px]",
                "focus-visible:ring-ring/50",
              )}
            >
              <option value="">Pilih hadiah</option>
              {pilihan.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Di spin ke- (kosongkan = berikutnya)</Label>
            <Input
              type="number"
              min={1}
              value={atSpin}
              placeholder="mis. 10"
              onChange={(e) => setAtSpin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Alasan</Label>
            <Input
              value={reason}
              placeholder="mis. pemenang lomba yel-yel"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          <Plus className="h-4 w-4" />
          Tandai
        </Button>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-semibold">
            Penandaan aktif &amp; riwayat ({rows.length})
          </p>
          {isLoading ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada akun yang ditandai.
            </p>
          ) : (
            rows.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5",
                  t.used_at && "bg-muted/40",
                )}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {t.account_name ?? t.email ?? t.phone}
                    </span>
                    <Badge variant={t.used_at ? "secondary" : "default"}>
                      {t.prize_label ?? t.prize_code}
                    </Badge>
                    {t.at_spin !== null && (
                      <Badge variant="outline">spin ke-{t.at_spin}</Badge>
                    )}
                    {t.used_at && (
                      <Badge variant="secondary">
                        sudah diberikan {waktu(t.used_at)}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {t.email ?? t.phone} &middot; {t.reason}
                    {t.created_by ? ` oleh ${t.created_by}` : ""}
                  </p>
                </div>
                {!t.used_at && (
                  <Button size="sm" variant="ghost" onClick={() => hapus(t)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Riwayat permintaan spin dari web kedua.
 *
 * Satu baris = satu permintaan, bukan satu hadiah: paket 5x + 1 bonus
 * menghasilkan 6 hadiah tapi hanya sekali ditagih poin. Menampilkannya per
 * hadiah membuat "poin ditagih" seolah terhitung enam kali.
 */
export default function AdminSpinLogPage() {
  const qc = useQueryClient();
  const [cari, setCari] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [hal, setHal] = React.useState(0);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["spin-log", email, hal],
    queryFn: () => {
      const q = new URLSearchParams({
        limit: String(PER_HAL),
        offset: String(hal * PER_HAL),
      });
      if (email) q.set("email", email);
      return api<LogResp>(`/api/admin/rewards/spin-log?${q}`);
    },
    placeholderData: (prev) => prev,
  });

  const { data: tally } = useQuery({
    queryKey: ["spin-tally"],
    queryFn: () => api<Tally[]>("/api/admin/rewards/spin-tally"),
  });

  const rows = data?.rows ?? [];
  const ring = data?.ringkasan;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["spin-log"] });
    qc.invalidateQueries({ queryKey: ["spin-tally"] });
  }

  function submitCari() {
    setEmail(cari.trim().toLowerCase());
    setHal(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <History className="h-6 w-6 text-primary" />
            Log Spin
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permintaan spin dari web kedua: siapa, bayar berapa poin, dan dapat
            hadiah apa. Satu baris satu permintaan, jadi paket 5x tercatat
            sekali.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Muat Ulang
        </Button>
      </div>

      {/* Ringkasan */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Permintaan", v: ring?.total_permintaan, i: History },
          { l: "Total putaran", v: ring?.total_spin, i: Sparkles },
          { l: "Hadiah keluar", v: ring?.total_hadiah, i: Gift },
          { l: "Akun ikut spin", v: ring?.total_akun, i: Search },
        ].map((s) => (
          <Card key={s.l}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.i className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{s.l}</p>
                <p className="text-xl font-bold tabular-nums">
                  {s.v === undefined ? "-" : formatNumber(s.v)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rekap per hadiah */}
      {tally !== undefined && tally.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div>
              <p className="font-bold">Hadiah yang sudah keluar</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Dipakai memeriksa apakah jatah sudah terpakai habis. Penerima
                dihitung per orang, jadi bisa lebih kecil dari jumlah keluar.
              </p>
            </div>
            <div className="space-y-2">
              {tally.map((t) => (
                <div
                  key={t.prize_code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
                >
                  <span className="font-medium">{t.prize_label}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="tabular-nums">
                      {formatNumber(t.keluar)} keluar
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(t.penerima)} orang
                    </span>
                    <span className="hidden text-muted-foreground sm:inline">
                      terakhir {waktu(t.terakhir)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <PanelTarget />

      {/* Pencarian */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <Label>Cari per akun</Label>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={cari}
                placeholder="email akun"
                onChange={(e) => setCari(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCari();
                }}
                className="pl-9"
              />
            </div>
            <Button onClick={submitCari}>Cari</Button>
            {email && (
              <Button
                variant="ghost"
                onClick={() => {
                  setCari("");
                  setEmail("");
                  setHal(0);
                }}
              >
                <X className="h-4 w-4" />
                Semua
              </Button>
            )}
          </div>
          {email && (
            <p className="text-sm text-muted-foreground">
              Menampilkan spin milik <span className="font-medium">{email}</span>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daftar */}
      {isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada spin"
          description={
            email
              ? "Akun ini belum pernah memutar roda."
              : "Belum ada permintaan spin dari web kedua."
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.batch_id ?? r.created_at}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.name ?? "Tanpa nama"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {r.email}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">
                      {waktu(r.created_at)}
                    </p>
                    <p className="tabular-nums">
                      {r.poin_ditagih > 0 ? (
                        <>
                          <span className="font-semibold">
                            {formatNumber(r.poin_ditagih)}
                          </span>{" "}
                          poin
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          pakai jatah gratis
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {r.total_spin}x putar
                    {r.bonus_spin > 0 ? ` (${r.bonus_spin} bonus)` : ""}
                  </Badge>
                  {r.dapat_hadiah > 0 ? (
                    <Badge>
                      {r.dapat_hadiah} hadiah
                    </Badge>
                  ) : (
                    <Badge variant="outline">tidak dapat hadiah</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.hasil.map((h, i) => (
                    <span
                      key={i}
                      title={`Dari ${SUMBER[h.source]}${h.is_bonus ? ", putaran bonus" : ""}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                        h.is_empty
                          ? "text-muted-foreground"
                          : "border-primary/30 bg-primary/5 font-medium",
                      )}
                    >
                      {h.is_empty ? (
                        <Wind className="h-3 w-3" />
                      ) : (
                        <Gift className="h-3 w-3" />
                      )}
                      {h.is_empty ? "Dash" : h.prize_label}
                      {!h.is_empty && h.source !== "random" && (
                        <span className="text-muted-foreground">
                          ({SUMBER[h.source]})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="outline"
              disabled={hal === 0 || isFetching}
              onClick={() => setHal((h) => Math.max(0, h - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
              Halaman {hal + 1}
            </span>
            <Button
              variant="outline"
              disabled={rows.length < PER_HAL || isFetching}
              onClick={() => setHal((h) => h + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
