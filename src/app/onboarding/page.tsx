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
import { cn } from "@/lib/utils";

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

type Region = { id: string; name: string; code: string };
type SchoolHit = {
  id: string;
  name: string;
  npsn: string | null;
  jenjang: string | null;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [me, setMe] = React.useState<Me | null>(null);
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [kelas, setKelas] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [intent, setIntent] = React.useState("");

  // Wilayah bertingkat (kode BPS) + sekolah terpilih.
  const [provinces, setProvinces] = React.useState<Region[]>([]);
  const [regencies, setRegencies] = React.useState<Region[]>([]);
  const [provinceCode, setProvinceCode] = React.useState("");
  const [regencyCode, setRegencyCode] = React.useState("");
  const [schoolQ, setSchoolQ] = React.useState("");
  const [schoolHits, setSchoolHits] = React.useState<SchoolHit[]>([]);
  const [school, setSchool] = React.useState<SchoolHit | null>(null);

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
        setProvinces(
          await api<Region[]>("/api/public/regions?level=province"),
        );
      } catch {
        /* dropdown kosong tidak fatal */
      }
    })();
  }, [router]);

  // Provinsi berubah → muat kabupaten, reset pilihan di bawahnya.
  React.useEffect(() => {
    setRegencyCode("");
    setRegencies([]);
    setSchool(null);
    setSchoolHits([]);
    if (!provinceCode) return;
    api<Region[]>(`/api/public/regions?level=regency&parent_code=${provinceCode}`)
      .then(setRegencies)
      .catch(() => {});
  }, [provinceCode]);

  // Cari sekolah (debounce) dalam kabupaten terpilih.
  React.useEffect(() => {
    if (!regencyCode) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams({ regency_code: regencyCode });
      if (schoolQ.trim()) params.set("q", schoolQ.trim());
      api<SchoolHit[]>(`/api/public/schools/search?${params}`)
        .then(setSchoolHits)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [schoolQ, regencyCode]);

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (name.trim().length < 2) return "Nama minimal 2 karakter.";
      if (!/^[0-9+\-\s().]{8,20}$/.test(phone.trim()))
        return "Nomor WhatsApp tidak valid (min. 8 digit).";
    }
    if (s === 1) {
      if (!provinceCode) return "Pilih provinsi.";
      if (!regencyCode) return "Pilih kabupaten/kota.";
      if (!school) return "Pilih sekolahmu dari daftar.";
      if (!kelas) return "Pilih kelas.";
      if (!status) return "Pilih statusmu.";
    }
    if (s === 2) {
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
      await api("/api/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone_number: phone.trim(),
          school_id: school?.id,
          class: kelas,
          status,
          region_code: regencyCode,
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
                <Label>Provinsi</Label>
                <select
                  className="select-ui"
                  value={provinceCode}
                  onChange={(e) => setProvinceCode(e.target.value)}
                >
                  <option value="">Pilih provinsi</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Kabupaten / Kota</Label>
                <select
                  className="select-ui"
                  value={regencyCode}
                  onChange={(e) => setRegencyCode(e.target.value)}
                  disabled={!provinceCode}
                >
                  <option value="">
                    {provinceCode ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}
                  </option>
                  {regencies.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Asal Sekolah</Label>
                {school ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/5 p-2.5 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      {school.name}
                      {school.jenjang ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {school.jenjang}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-primary hover:underline"
                      onClick={() => setSchool(null)}
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={schoolQ}
                      onChange={(e) => setSchoolQ(e.target.value)}
                      placeholder={
                        regencyCode
                          ? "Ketik nama sekolah…"
                          : "Pilih kabupaten dulu"
                      }
                      disabled={!regencyCode}
                      autoComplete="off"
                    />
                    {regencyCode && schoolHits.length > 0 && (
                      <div className="max-h-44 overflow-y-auto rounded-lg border">
                        {schoolHits.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSchool(s);
                              setSchoolQ("");
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <span className="min-w-0 truncate">{s.name}</span>
                            {s.jenjang && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {s.jenjang}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {regencyCode && schoolQ.trim() && schoolHits.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Sekolah tak ditemukan. Coba kata kunci lain.
                      </p>
                    )}
                  </>
                )}
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
