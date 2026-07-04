"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  School as SchoolIcon,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { useRegions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { School } from "@/types/database";

type SchoolRow = School & { region_id?: string | null };

type Me = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  onboarded: boolean;
};

const STEPS = [
  { title: "Akun", icon: UserRound },
  { title: "Sekolah", icon: SchoolIcon },
  { title: "Lainnya", icon: MapPin },
];

const STATUS_OPTIONS = [
  { value: "teman_sekolah", label: "Teman sekolah peserta" },
  { value: "guru", label: "Guru" },
  { value: "keluarga", label: "Keluarga peserta" },
  { value: "teman_luar", label: "Teman di luar sekolah" },
];

const INTENT_OPTIONS = [
  { value: "ya", label: "Ya, ada rencana kuliah" },
  { value: "ragu", label: "Masih ragu / belum tahu" },
  { value: "tidak", label: "Tidak" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: regions } = useRegions();
  const [me, setMe] = React.useState<Me | null>(null);
  const [schools, setSchools] = React.useState<SchoolRow[]>([]);
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [schoolText, setSchoolText] = React.useState("");
  const [kelas, setKelas] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [intent, setIntent] = React.useState("");

  // Guard: must be logged in; already-onboarded users go home.
  React.useEffect(() => {
    (async () => {
      try {
        const { user } = await api<{ user: Me }>("/api/auth/me");
        if (user.onboarded) {
          router.replace("/");
          return;
        }
        setMe(user);
        setName(user.name ?? "");
      } catch {
        router.replace("/login");
      }
      try {
        setSchools(await api<SchoolRow[]>("/api/public/schools"));
      } catch {
        /* datalist kosong tidak fatal */
      }
    })();
  }, [router]);

  // Sekolah terdaftar sudah punya kabupaten → isi otomatis (tetap bisa diubah).
  React.useEffect(() => {
    const match = schools.find(
      (sc) => sc.name.trim().toLowerCase() === schoolText.trim().toLowerCase(),
    );
    if (match?.region_id) setRegion(match.region_id);
  }, [schoolText, schools]);

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (name.trim().length < 2) return "Nama minimal 2 karakter.";
      if (!/^[0-9+\-\s().]{8,20}$/.test(phone.trim()))
        return "Nomor WhatsApp tidak valid (min. 8 digit).";
    }
    if (s === 1) {
      if (schoolText.trim().length < 2) return "Isi nama sekolah.";
      if (!kelas) return "Pilih kelas.";
      if (!status) return "Pilih statusmu.";
    }
    if (s === 2) {
      if (!region) return "Pilih kabupaten asalmu.";
      if (!intent) return "Pilih niat kuliahmu.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) return void toast.error(err);
    setStep((v) => Math.min(v + 1, STEPS.length - 1));
  }

  async function submit() {
    const err = validateStep(2);
    if (err) return void toast.error(err);
    setBusy(true);
    try {
      const match = schools.find(
        (sc) => sc.name.trim().toLowerCase() === schoolText.trim().toLowerCase(),
      );
      await api("/api/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone_number: phone.trim(),
          ...(match ? { school_id: match.id } : { school_name: schoolText.trim() }),
          class: kelas,
          status,
          region_id: region,
          college_intent: intent,
        }),
      });
      toast.success("Profil lengkap. Selamat mendukung!");
      router.replace("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan profil.");
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center gap-2 font-bold">
            <GraduationCap className="h-6 w-6 text-primary" />
            Youth Character Summit
          </div>
          <div>
            <h1 className="text-xl font-bold">Lengkapi Profilmu</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sekali saja - biar vote &amp; quest-mu tercatat atas namamu.
              {me.email && (
                <>
                  {" "}
                  Masuk sebagai <strong>{me.email}</strong>.
                </>
              )}
            </p>
          </div>

          {/* Stepper */}
          <ol className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.title} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && "border-primary bg-primary/10 text-primary",
                      !done && !active && "border-border text-muted-foreground",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.title}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="h-px w-6 bg-border" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama sesuai identitas"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nomor WhatsApp</Label>
                <Input
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Dipakai sebagai identitas vote-mu (1 nomor = 1 nama).
                </p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label>Asal Sekolah</Label>
                <Input
                  list="onboarding-schools"
                  value={schoolText}
                  onChange={(e) => setSchoolText(e.target.value)}
                  placeholder="Pilih dari daftar atau ketik sekolahmu"
                  autoComplete="off"
                />
                <datalist id="onboarding-schools">
                  {schools.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Kelas</Label>
                <select
                  className="select-ui"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                >
                  <option value="">Pilih kelas</option>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                  <option value="alumni">Alumni</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status Kamu</Label>
                <select
                  className="select-ui"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Pilih status</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label>Kabupaten / Kota Asal</Label>
                <select
                  className="select-ui"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">Pilih kabupaten</option>
                  {(regions ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Apakah kamu berniat melanjutkan kuliah?</Label>
                <div className="grid gap-2">
                  {INTENT_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                        intent === o.value
                          ? "border-primary bg-primary/5 font-medium"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="intent"
                        value={o.value}
                        checked={intent === o.value}
                        onChange={() => setIntent(o.value)}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              disabled={step === 0 || busy}
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Lanjut <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Selesai
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
