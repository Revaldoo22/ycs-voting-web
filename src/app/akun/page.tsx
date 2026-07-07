"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBox } from "@/components/ui/select-box";
import { api } from "@/lib/api-client";
import { useMyProfile, useRegions, useSchools } from "@/lib/queries";

const STATUS_OPTIONS = [
  { value: "teman_sekolah", label: "Teman sekolah peserta" },
  { value: "guru", label: "Guru" },
  { value: "keluarga", label: "Keluarga peserta" },
  { value: "teman_luar", label: "Teman di luar sekolah" },
];

export default function AccountPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me, isLoading } = useMyProfile();
  const { data: schools } = useSchools();
  const { data: regions } = useRegions();

  const [name, setName] = React.useState("");
  const [schoolText, setSchoolText] = React.useState("");
  const [kelas, setKelas] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [intent, setIntent] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  // Guard + prefill sekali.
  React.useEffect(() => {
    if (isLoading) return;
    if (!me || me.role !== "voter") {
      router.replace("/login");
      return;
    }
    if (!me.onboarded) {
      router.replace("/onboarding");
      return;
    }
    if (!ready) {
      setName(me.name ?? "");
      setSchoolText(me.school ?? "");
      setKelas(me.class ?? "");
      setStatus(me.status ?? "");
      setRegion(me.region_id ?? "");
      setIntent(me.college_intent ?? "");
      setReady(true);
    }
  }, [me, isLoading, router, ready]);

  // Pilih sekolah terdaftar → kabupaten ikut otomatis.
  React.useEffect(() => {
    if (!ready) return;
    const match = (schools ?? []).find(
      (sc) => sc.name.trim().toLowerCase() === schoolText.trim().toLowerCase(),
    );
    const rid = (match as { region_id?: string | null } | undefined)?.region_id;
    if (rid) setRegion(rid);
  }, [schoolText, schools, ready]);

  async function save() {
    if (name.trim().length < 2) return void toast.error("Nama minimal 2 karakter.");
    if (schoolText.trim().length < 2) return void toast.error("Isi nama sekolah.");

    setBusy(true);
    try {
      const match = schools?.find(
        (s) => s.name.trim().toLowerCase() === schoolText.trim().toLowerCase(),
      );
      await api("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          ...(match
            ? { school_id: match.id }
            : { school_name: schoolText.trim() }),
          class: kelas || undefined,
          status: status || undefined,
          region_id: region || undefined,
          college_intent: intent || undefined,
        }),
      });
      toast.success("Akun diperbarui.");
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      qc.invalidateQueries({ queryKey: ["my-school-rank"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-xl space-y-6 py-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Identitas terkunci: foto (Google) + email + WA */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              {me?.avatar_url ? (
                <Image
                  src={me.avatar_url}
                  alt="Foto profil"
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {(me?.name || "P").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{me?.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  WA: {me?.phone_number ?? "-"} · Foto mengikuti akun Google
                  (login ulang untuk refresh)
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Ganti nama ikut memperbarui nama di riwayat dukunganmu.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Asal Sekolah</Label>
              <Input
                list="account-schools"
                value={schoolText}
                onChange={(e) => setSchoolText(e.target.value)}
                autoComplete="off"
              />
              <datalist id="account-schools">
                {(schools ?? []).map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kelas</Label>
                <SelectBox
                  value={kelas}
                  onChange={setKelas}
                  placeholder="Pilih"
                  options={[
                    { value: "10", label: "Kelas 10" },
                    { value: "11", label: "Kelas 11" },
                    { value: "12", label: "Kelas 12" },
                    { value: "alumni", label: "Alumni" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <SelectBox
                  value={status}
                  onChange={setStatus}
                  placeholder="Pilih"
                  options={STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kabupaten / Kota</Label>
                <SelectBox
                  value={region}
                  onChange={setRegion}
                  placeholder="Pilih"
                  options={(regions ?? []).map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Niat Kuliah</Label>
                <SelectBox
                  value={intent}
                  onChange={setIntent}
                  placeholder="Pilih"
                  options={[
                    { value: "ya", label: "Ya" },
                    { value: "ragu", label: "Masih ragu" },
                    { value: "tidak", label: "Tidak" },
                  ]}
                />
              </div>
            </div>

            <Button className="w-full" onClick={save} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
