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
import { SelectBox } from "@/components/ui/select-box";
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
  { title: "Survey", icon: MapPin },
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

const AWARENESS_OPTIONS = [
  { value: "belum_tahu", label: "Belum tahu sama sekali" },
  { value: "pernah_dengar", label: "Pernah dengar" },
  { value: "sudah_minat", label: "Sudah tahu & tertarik" },
];

const SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "WhatsApp / grup WA" },
  { value: "google", label: "Google / pencarian" },
  { value: "maps", label: "Google Maps" },
  { value: "teman", label: "Teman" },
  { value: "keluarga", label: "Keluarga" },
  { value: "duta_stekom", label: "Duta Universitas STEKOM" },
  { value: "pendaftar_ycs", label: "Pendaftar / peserta YCS" },
  { value: "alumni", label: "Alumni Universitas STEKOM" },
  { value: "guru_sekolah", label: "Guru / sekolah" },
  { value: "acara", label: "Acara / pameran / sosialisasi" },
  { value: "brosur", label: "Brosur / spanduk / baliho" },
  { value: "di_jalan", label: "Lihat di jalan / gedung kampus" },
  { value: "radio_tv", label: "Radio / TV" },
  { value: "koran", label: "Koran / majalah" },
  { value: "lainnya", label: "Lainnya" },
];

type ComboItem = { value: string; label: string; hint?: string };

/**
 * Dropdown searchable seragam: ketik untuk cari, klik untuk pilih. Dipakai
 * untuk provinsi, kabupaten, dan sekolah agar konsisten. `onQuery` opsional
 * untuk sumber data server-side (sekolah); tanpa itu, filter client-side.
 */
function Combobox({
  value,
  label,
  placeholder,
  items,
  disabled,
  onSelect,
  onQuery,
  emptyText = "Tidak ditemukan.",
}: {
  value: ComboItem | null;
  label: string;
  placeholder: string;
  items: ComboItem[];
  disabled?: boolean;
  onSelect: (item: ComboItem | null) => void;
  onQuery?: (q: string) => void;
  emptyText?: string;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const filtered = onQuery
    ? items // server sudah memfilter
    : items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()));

  if (value) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/5 p-2.5 text-sm">
          <span className="min-w-0 truncate font-medium">
            {value.label}
            {value.hint ? (
              <span className="ml-1 text-xs text-muted-foreground">
                {value.hint}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            className="shrink-0 text-xs text-primary hover:underline"
            onClick={() => {
              onSelect(null);
              setQ("");
              setOpen(true);
            }}
          >
            Ganti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={q}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onQuery?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled && filtered.length > 0 && (
        <div className="max-h-44 overflow-y-auto rounded-lg border">
          {filtered.map((i) => (
            <button
              key={i.value}
              type="button"
              onClick={() => {
                onSelect(i);
                setOpen(false);
                setQ("");
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="min-w-0 truncate">{i.label}</span>
              {i.hint && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {i.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && !disabled && q.trim() && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

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
  const [awareness, setAwareness] = React.useState("");
  const [stekomSource, setStekomSource] = React.useState("");

  // Wilayah bertingkat (kode BPS) + sekolah terpilih.
  const [provinces, setProvinces] = React.useState<Region[]>([]);
  const [regencies, setRegencies] = React.useState<Region[]>([]);
  const [provinceCode, setProvinceCode] = React.useState("");
  const [regencyCode, setRegencyCode] = React.useState("");
  const [schoolQ, setSchoolQ] = React.useState("");
  const [schoolHits, setSchoolHits] = React.useState<SchoolHit[]>([]);
  const [school, setSchool] = React.useState<SchoolHit | null>(null);
  // Guru/keluarga isi sekolah & kelas manual (opsional).
  const [schoolManual, setSchoolManual] = React.useState("");
  const [classManual, setClassManual] = React.useState("");

  // teman_sekolah = siswa SMA/SMK/MA → pilih sekolah master + kelas dropdown.
  // teman_luar bisa SMP dll → sekolah & kelas MANUAL (wajib).
  // guru/keluarga → sekolah & kelas manual (opsional).
  const fromMaster = status === "teman_sekolah";
  const manualRequired = status === "teman_luar";
  const manualOptional = status === "guru" || status === "keluarga";
  const showManual = manualRequired || manualOptional;

  const DRAFT_KEY = "onboarding_draft";
  const restored = React.useRef(false);

  // Pulihkan draft dari localStorage sekali (jaga-jaga refresh).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.name) setName(d.name);
      if (d.phone) setPhone(d.phone);
      if (d.provinceCode) setProvinceCode(d.provinceCode);
      if (d.regencyCode) setRegencyCode(d.regencyCode);
      if (d.school) setSchool(d.school);
      if (d.schoolManual) setSchoolManual(d.schoolManual);
      if (d.classManual) setClassManual(d.classManual);
      if (d.kelas) setKelas(d.kelas);
      if (d.status) setStatus(d.status);
      if (d.intent) setIntent(d.intent);
      if (d.awareness) setAwareness(d.awareness);
      if (d.stekomSource) setStekomSource(d.stekomSource);
      if (typeof d.step === "number") setStep(d.step);
    } catch {
      /* draft rusak — abaikan */
    } finally {
      restored.current = true;
    }
  }, []);

  // Simpan draft tiap perubahan (setelah restore, agar tak menimpa).
  React.useEffect(() => {
    if (!restored.current) return;
    const draft = {
      name, phone, provinceCode, regencyCode, school, schoolManual,
      classManual, kelas, status, intent, awareness, stekomSource, step,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage penuh — abaikan */
    }
  }, [
    name, phone, provinceCode, regencyCode, school, schoolManual, classManual,
    kelas, status, intent, awareness, stekomSource, step,
  ]);

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

  // Provinsi berubah → muat kabupaten. Reset pilihan di bawahnya HANYA saat
  // user benar-benar ganti provinsi (bukan saat restore draft awal).
  const prevProvince = React.useRef<string | null>(null);
  React.useEffect(() => {
    const isUserChange =
      prevProvince.current !== null && prevProvince.current !== provinceCode;
    prevProvince.current = provinceCode;
    if (isUserChange) {
      setRegencyCode("");
      setSchool(null);
    }
    setSchoolHits([]);
    if (!provinceCode) {
      setRegencies([]);
      return;
    }
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
      if (!status) return "Pilih statusmu.";
      if (fromMaster) {
        if (!school) return "Pilih sekolahmu dari daftar.";
        if (!kelas) return "Pilih kelas.";
      }
      if (manualRequired) {
        if (!schoolManual.trim()) return "Isi asal sekolahmu.";
        if (!classManual.trim()) return "Isi kelasmu.";
      }
      // Guru/keluarga: sekolah & kelas opsional — tak divalidasi.
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
          // Siswa: sekolah dari master (id) + kelas dropdown.
          // Guru/keluarga: sekolah & kelas manual (opsional).
          ...(fromMaster
            ? { school_id: school?.id, class: kelas }
            : {
                school_name: schoolManual.trim() || undefined,
                class: classManual.trim() || undefined,
              }),
          status,
          region_code: regencyCode,
          college_intent: intent,
          stekom_awareness: awareness || undefined,
          stekom_source:
            awareness === "pernah_dengar" || awareness === "sudah_minat"
              ? stekomSource.trim() || undefined
              : undefined,
        }),
      });
      toast.success("Profil lengkap. Selamat mendukung!");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* abaikan */
      }
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
              <Combobox
                label="Provinsi"
                placeholder="Cari provinsi…"
                value={
                  provinceCode
                    ? {
                        value: provinceCode,
                        label:
                          provinces.find((p) => p.code === provinceCode)?.name ??
                          provinceCode,
                      }
                    : null
                }
                items={provinces.map((p) => ({ value: p.code, label: p.name }))}
                onSelect={(it) => setProvinceCode(it?.value ?? "")}
                emptyText="Provinsi tak ditemukan."
              />
              <Combobox
                label="Kabupaten / Kota"
                placeholder={
                  provinceCode ? "Cari kabupaten/kota…" : "Pilih provinsi dulu"
                }
                disabled={!provinceCode}
                value={
                  regencyCode
                    ? {
                        value: regencyCode,
                        label:
                          regencies.find((r) => r.code === regencyCode)?.name ??
                          regencyCode,
                      }
                    : null
                }
                items={regencies.map((r) => ({ value: r.code, label: r.name }))}
                onSelect={(it) => setRegencyCode(it?.value ?? "")}
                emptyText="Kabupaten tak ditemukan."
              />
              <div className="space-y-1.5">
                <Label>Status Kamu</Label>
                <SelectBox
                  value={status}
                  onChange={setStatus}
                  placeholder="Pilih status"
                  options={STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </div>

              {/* teman_sekolah: sekolah dari master (SMA/SMK/MA) + kelas dropdown. */}
              {fromMaster ? (
                <>
                  <Combobox
                    label="Asal Sekolah"
                    placeholder={
                      regencyCode ? "Ketik nama sekolah…" : "Pilih kabupaten dulu"
                    }
                    disabled={!regencyCode}
                    value={
                      school
                        ? {
                            value: school.id,
                            label: school.name,
                            hint: school.jenjang ?? undefined,
                          }
                        : null
                    }
                    items={schoolHits.map((s) => ({
                      value: s.id,
                      label: s.name,
                      hint: s.jenjang ?? undefined,
                    }))}
                    onQuery={(q) => setSchoolQ(q)}
                    onSelect={(it) => {
                      const hit = schoolHits.find((s) => s.id === it?.value);
                      setSchool(hit ?? null);
                      setSchoolQ("");
                    }}
                    emptyText="Sekolah tak ditemukan. Coba kata kunci lain."
                  />
                  <div className="space-y-1.5">
                    <Label>Kelas</Label>
                    <SelectBox
                      value={kelas}
                      onChange={setKelas}
                      placeholder="Pilih kelas"
                      options={[
                        { value: "10", label: "Kelas 10" },
                        { value: "11", label: "Kelas 11" },
                        { value: "12", label: "Kelas 12" },
                        { value: "alumni", label: "Alumni" },
                      ]}
                    />
                  </div>
                </>
              ) : showManual ? (
                /* teman_luar (bisa SMP): manual & wajib. Guru/keluarga: opsional. */
                <>
                  <div className="space-y-1.5">
                    <Label>
                      Asal Sekolah{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {manualOptional ? "(opsional)" : ""}
                      </span>
                    </Label>
                    <Input
                      value={schoolManual}
                      onChange={(e) => setSchoolManual(e.target.value)}
                      placeholder={
                        manualOptional
                          ? "Ketik nama sekolah/instansi (boleh dikosongkan)"
                          : "Ketik nama sekolahmu"
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Kelas{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {manualOptional ? "(opsional)" : ""}
                      </span>
                    </Label>
                    <Input
                      value={classManual}
                      onChange={(e) => setClassManual(e.target.value)}
                      placeholder={
                        manualOptional ? "Boleh dikosongkan" : "Ketik kelasmu"
                      }
                    />
                  </div>
                </>
              ) : null}
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

              <div className="space-y-1.5">
                <Label>
                  Apakah kamu sudah mengenal Universitas STEKOM?{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </Label>
                <SelectBox
                  value={awareness}
                  onChange={setAwareness}
                  placeholder="Pilih salah satu"
                  options={AWARENESS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </div>

              {(awareness === "pernah_dengar" ||
                awareness === "sudah_minat") && (
                <div className="space-y-1.5">
                  <Label>
                    Tahu Universitas STEKOM dari mana?{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (opsional)
                    </span>
                  </Label>
                  <SelectBox
                    value={stekomSource}
                    onChange={setStekomSource}
                    placeholder="Pilih sumber"
                    options={SOURCE_OPTIONS}
                  />
                </div>
              )}
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
