"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import {
  useAdminParticipants,
  useGoldenBuzzers,
  type GoldenBuzzer,
} from "@/lib/queries";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

/**
 * Pilih peserta sebagai Golden Buzzer: langsung lolos tanpa menunggu hasil
 * gelombang. Konsekuensinya sama dengan peserta lolos, yaitu berhenti
 * menerima vote dan tidak ikut gelombang berikutnya.
 */
export default function AdminGoldenBuzzerPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: chosen, isLoading } = useGoldenBuzzers();
  const { data: allParticipants } = useAdminParticipants();
  const [q, setQ] = React.useState("");

  const list = React.useMemo(() => chosen ?? [], [chosen]);
  const chosenIds = React.useMemo(
    () => new Set(list.map((g) => g.id)),
    [list],
  );

  // Kandidat: peserta aktif yang belum jadi Golden Buzzer. Butuh kata kunci
  // dulu supaya daftar 1600+ peserta tidak dirender semua.
  const candidates = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return (allParticipants ?? [])
      .filter(
        (p) =>
          !chosenIds.has(p.id) &&
          (p.name.toLowerCase().includes(needle) ||
            (p.schools?.name ?? "").toLowerCase().includes(needle)),
      )
      .slice(0, 20);
  }, [allParticipants, chosenIds, q]);

  const setBuzzer = useMutation({
    mutationFn: (v: { id: string; on: boolean }) =>
      api(`/api/admin/participants/${v.id}/golden-buzzer`, {
        method: "PATCH",
        body: JSON.stringify({ on: v.on }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golden-buzzer"] });
      qc.invalidateQueries({ queryKey: ["participants"] });
      qc.invalidateQueries({ queryKey: ["rounds"] });
    },
  });

  function add(id: string, name: string) {
    confirm({
      title: `Jadikan ${name} Golden Buzzer?`,
      description:
        "Peserta ini langsung lolos: vote ke dia ditutup dan dia tidak ikut gelombang berikutnya. Tandanya muncul di halaman publik.",
      confirmText: "Jadikan Golden Buzzer",
      onConfirm: async () => {
        try {
          await setBuzzer.mutateAsync({ id, on: true });
          toast.success(`${name} jadi Golden Buzzer.`);
          setQ("");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal menandai.");
        }
      },
    });
  }

  function remove(g: GoldenBuzzer) {
    confirm({
      title: `Lepas Golden Buzzer ${g.name}?`,
      description:
        "Peserta kembali ikut kompetisi: vote ke dia terbuka lagi dan dia masuk gelombang berjalan.",
      confirmText: "Lepas",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await setBuzzer.mutateAsync({ id: g.id, on: false });
          toast.success(`${g.name} bukan Golden Buzzer lagi.`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal melepas.");
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Zap className="h-6 w-6 text-amber-500" />
          Golden Buzzer
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Peserta pilihan panitia yang langsung lolos tanpa menunggu hasil
          gelombang. Vote ke mereka ditutup dan mereka tidak ikut gelombang
          berikutnya.
        </p>
      </div>

      {/* Tambah */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Tambah Golden Buzzer</p>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama peserta atau sekolah (minimal 2 huruf)"
            />
          </div>
          {q.trim().length >= 2 && (
            <div className="space-y-1.5">
              {candidates.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  Tidak ada peserta yang cocok.
                </p>
              ) : (
                candidates.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.schools?.name ?? "Tanpa Sekolah"} &middot;{" "}
                        {formatNumber(p.total_points)} poin
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={setBuzzer.isPending}
                      onClick={() => add(p.id, p.name)}
                    >
                      {setBuzzer.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Pilih
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daftar terpilih */}
      {isLoading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState
          title="Belum ada Golden Buzzer"
          description="Cari peserta di atas lalu pilih."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Terpilih ({list.length})
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((g) => (
              <Card
                key={g.id}
                className="border-amber-400/60 bg-amber-50/40 dark:bg-amber-500/5"
              >
                <CardContent className="flex items-start gap-3 p-3">
                  {g.photo_url ? (
                    <Image
                      src={g.photo_url}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className="bg-amber-500/15 text-sm font-semibold text-amber-700">
                        {g.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      <span className="truncate">{g.name}</span>
                      <Badge variant="warning" className="shrink-0">
                        <Zap className="h-3 w-3" />
                        Golden
                      </Badge>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.school_name} &middot; {g.region_name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-500">
                      {formatNumber(g.total_points)} poin
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-destructive"
                    title="Lepas Golden Buzzer"
                    disabled={setBuzzer.isPending}
                    onClick={() => remove(g)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
