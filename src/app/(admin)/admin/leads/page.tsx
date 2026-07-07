"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { SelectBox } from "@/components/ui/select-box";
import { EmptyState, LoadingState } from "@/components/states";
import { api } from "@/lib/api-client";
import { dateStamp, exportToExcel } from "@/lib/export-excel";

type Lead = {
  name: string | null;
  phone_number: string | null;
  email: string | null;
  school_name: string | null;
  voter_class: string | null;
  voter_status: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  college_intent: string | null;
  stekom_awareness: string | null;
  stekom_source: string | null;
  created_at: string;
};

const INTENT_LABEL: Record<string, string> = {
  ya: "Ya",
  ragu: "Ragu",
  tidak: "Tidak",
};
const AWARE_LABEL: Record<string, string> = {
  belum_tahu: "Belum tahu",
  pernah_dengar: "Pernah dengar",
  sudah_minat: "Sudah tertarik",
};

export default function AdminLeadsPage() {
  const [intent, setIntent] = React.useState("");
  const [awareness, setAwareness] = React.useState("");
  const [q, setQ] = React.useState("");
  const [exporting, setExporting] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", intent, awareness],
    queryFn: () => {
      const p = new URLSearchParams();
      if (intent) p.set("intent", intent);
      if (awareness) p.set("awareness", awareness);
      return api<Lead[]>(`/api/admin/leads?${p}`);
    },
  });

  const filtered = React.useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (data ?? []).filter(
      (l) =>
        !kw ||
        l.name?.toLowerCase().includes(kw) ||
        l.phone_number?.toLowerCase().includes(kw) ||
        l.email?.toLowerCase().includes(kw) ||
        l.school_name?.toLowerCase().includes(kw),
    );
  }, [data, q]);

  function handleExport() {
    if (!filtered.length) return void toast.error("Tidak ada data untuk diexport.");
    setExporting(true);
    try {
      exportToExcel(
        filtered.map((l) => ({
          Nama: l.name ?? "",
          "Nomor WA": l.phone_number ?? "",
          Email: l.email ?? "",
          Sekolah: l.school_name ?? "",
          Kelas: l.voter_class ?? "",
          Status: l.voter_status ?? "",
          Kabupaten: l.kabupaten ?? "",
          Provinsi: l.provinsi ?? "",
          "Niat Kuliah": INTENT_LABEL[l.college_intent ?? ""] ?? "",
          "Kenal Universitas STEKOM": AWARE_LABEL[l.stekom_awareness ?? ""] ?? "",
          "Sumber Tahu": l.stekom_source ?? "",
          Terdaftar: new Date(l.created_at).toLocaleString("id-ID"),
        })),
        { fileName: `leads-pmb-${dateStamp()}.xlsx`, sheetName: "Leads PMB" },
      );
      toast.success(`${filtered.length} leads diexport.`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads PMB</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Voter yang sudah lengkapi profil — calon prospek Penerimaan Mahasiswa
            Baru. {data ? `${filtered.length} data.` : ""}
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting || !filtered.length}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Excel
        </Button>
      </div>

      <FilterBar>
        <FilterField label="Cari" span={2}>
          <Input
            placeholder="Nama, WA, email, sekolah…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </FilterField>
        <FilterField label="Niat Kuliah">
          <SelectBox
            value={intent}
            onChange={setIntent}
            placeholder="Semua niat"
            options={[
              { value: "", label: "Semua niat" },
              { value: "ya", label: "Ya" },
              { value: "ragu", label: "Ragu" },
              { value: "tidak", label: "Tidak" },
            ]}
          />
        </FilterField>
        <FilterField label="Kenal Universitas STEKOM">
          <SelectBox
            value={awareness}
            onChange={setAwareness}
            placeholder="Semua"
            options={[
              { value: "", label: "Semua" },
              { value: "belum_tahu", label: "Belum tahu" },
              { value: "pernah_dengar", label: "Pernah dengar" },
              { value: "sudah_minat", label: "Sudah tertarik" },
            ]}
          />
        </FilterField>
      </FilterBar>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada leads" />
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nama</th>
                  <th className="px-3 py-2 text-left font-medium">Kontak</th>
                  <th className="px-3 py-2 text-left font-medium">Sekolah</th>
                  <th className="px-3 py-2 text-left font-medium">Wilayah</th>
                  <th className="px-3 py-2 text-left font-medium">Niat</th>
                  <th className="px-3 py-2 text-left font-medium">Sumber</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-medium">{l.name ?? "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="block">{l.phone_number ?? "-"}</span>
                      <span className="block text-xs">{l.email ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {l.school_name ?? "-"}
                      {l.voter_class ? ` · ${l.voter_class}` : ""}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[l.kabupaten, l.provinsi].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {INTENT_LABEL[l.college_intent ?? ""] ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {l.stekom_source ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
