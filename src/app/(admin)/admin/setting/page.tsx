"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  Gift,
  Globe,
  Loader2,
  Lock,
  Save,
  Settings2,
  Shield,
  Smartphone,
  Sparkles,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/states";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SettingsData = {
  id: boolean;
  event_open: boolean;
  closed_message: string;
  ip_daily_limit: number;
  spin_wheel_mode: string; // "ALWAYS_TUMBLER" | "ALWAYS_E_MONEY" | "ALWAYS_HP" | "RANDOM"
};

const SPIN_MODES = [
  {
    id: "ALWAYS_TUMBLER",
    title: "Selalu Tumbler",
    badge: "5 Segmen",
    description: "Roda spin akan selalu mendarat pada segmen Tumbler.",
    icon: Gift,
    accent: "from-amber-500/10 to-orange-500/10 border-orange-500/30 text-orange-600",
  },
  {
    id: "ALWAYS_E_MONEY",
    title: "Selalu E-Money",
    badge: "4 Segmen",
    description: "Roda spin akan selalu mendarat pada segmen E-Money (Saldo).",
    icon: Ticket,
    accent: "from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-600",
  },
  {
    id: "ALWAYS_HP",
    title: "Selalu HP",
    badge: "1 Segmen",
    description: "Roda spin akan selalu mendarat pada segmen Utama (Handphone).",
    icon: Smartphone,
    accent: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/30 text-fuchsia-600",
  },
  {
    id: "RANDOM",
    title: "Acak (Random)",
    badge: "Berdasarkan Segmen",
    description: "Roda spin mendarat secara acak di antara 10 segmen.",
    icon: Sparkles,
    accent: "from-violet-500/10 to-purple-500/10 border-purple-500/30 text-purple-600",
  },
] as const;

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = React.useState(false);
  // Tertutup dulu: mode aktif sudah terbaca di ringkasan header.
  const [spinOpen, setSpinOpen] = React.useState(false);

  const { data, isLoading } = useQuery<SettingsData>({
    queryKey: ["admin-settings"],
    queryFn: () => api<SettingsData>("/api/admin/settings"),
  });

  const [form, setForm] = React.useState<{
    event_open: boolean;
    closed_message: string;
    ip_daily_limit: number;
    spin_wheel_mode: string;
  }>({
    event_open: true,
    closed_message: "",
    ip_daily_limit: 5,
    spin_wheel_mode: "ALWAYS_TUMBLER",
  });

  React.useEffect(() => {
    if (data) {
      setForm({
        event_open: data.event_open ?? true,
        closed_message: data.closed_message ?? "",
        ip_daily_limit: data.ip_daily_limit ?? 5,
        spin_wheel_mode: data.spin_wheel_mode ?? "ALWAYS_TUMBLER",
      });
    }
  }, [data]);

  const activeMode = SPIN_MODES.find((m) => m.id === form.spin_wheel_mode);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Pengaturan berhasil disimpan.");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" /> Pengaturan Sistem & Spin Wheel
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Kelola hasil Spin Wheel hadiah undian serta konfigurasi event publik.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Spin Wheel Setting */}
        <Card className="border-primary/20 shadow-sm">
          <button
            type="button"
            onClick={() => setSpinOpen((o) => !o)}
            aria-expanded={spinOpen}
            className="flex w-full items-start gap-3 p-6 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold flex items-center gap-2 text-primary">
                <Gift className="h-5 w-5 shrink-0" /> Mode Hasil Spin Wheel Hadiah
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {spinOpen
                  ? "Tentukan hasil yang akan didapatkan pemenang saat Spin Wheel (Roda 10 Bagian: 1 HP, 4 E-Money, 5 Tumbler) berputar."
                  : `Mode aktif: ${activeMode?.title ?? "-"}.`}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                spinOpen && "rotate-180",
              )}
            />
          </button>
          <CardContent
            className={cn("grid gap-3 sm:grid-cols-2", !spinOpen && "hidden")}
          >
            {SPIN_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = form.spin_wheel_mode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, spin_wheel_mode: mode.id }))}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br border", mode.accent)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-sm leading-snug">{mode.title}</p>
                        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground mt-0.5">
                          {mode.badge}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Section 2: Event & System Settings */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" /> Status Event & Batas Akses
            </CardTitle>
            <CardDescription>
              Atur ketersediaan event untuk umum dan pembatasan vote harian.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Toggle Status Event */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-4 gap-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Status Event Publik</Label>
                <p className="text-xs text-muted-foreground">
                  Jika ditutup, pengunjung akan melihat pesan penutupan event.
                </p>
              </div>
              <Button
                type="button"
                variant={form.event_open ? "default" : "destructive"}
                onClick={() => setForm((f) => ({ ...f, event_open: !f.event_open }))}
                className="shrink-0 font-bold"
              >
                {form.event_open ? (
                  <>
                    <Globe className="mr-2 h-4 w-4" /> Event Terbuka
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Event Ditutup
                  </>
                )}
              </Button>
            </div>

            {/* Pesan Ditutup */}
            {!form.event_open && (
              <div className="space-y-2">
                <Label htmlFor="closed_message">Pesan Ketika Event Ditutup</Label>
                <Textarea
                  id="closed_message"
                  value={form.closed_message}
                  onChange={(e) => setForm((f) => ({ ...f, closed_message: e.target.value }))}
                  placeholder="Event Youth Character Summit saat ini sedang ditutup."
                  rows={3}
                />
              </div>
            )}

            {/* IP Daily Limit */}
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="ip_daily_limit" className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-muted-foreground" /> Batas Vote per IP (Harian)
              </Label>
              <Input
                id="ip_daily_limit"
                type="number"
                min={1}
                max={1000}
                value={form.ip_daily_limit}
                onChange={(e) => setForm((f) => ({ ...f, ip_daily_limit: parseInt(e.target.value, 10) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">
                Jumlah maksimal vote yang diizinkan dari satu alamat IP setiap harinya.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tombol Simpan */}
        <div className="flex justify-end">
          <Button size="lg" type="submit" disabled={saving} className="font-bold min-w-[160px]">
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
