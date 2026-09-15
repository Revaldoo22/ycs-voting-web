"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { SelectBox } from "@/components/ui/select-box";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";

type Lead = {
  id: string;
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
  pmb_tracked_at: string | null;
  created_at: string;
};

type SubmitResult = {
  total: number;
  skipped: number;
  ok: number;
  fail: number;
  failed: { id: string; error: string }[];
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

/**
 * Body yang dikirim ke pmb.stekom.ac.id/api/tracking/submit-direct untuk
 * SETIAP lead terpilih (dieksekusi di server, bukan browser). Ditampilkan
 * di sini hanya sebagai referensi, bukan yang benar-benar dikirim dari sini.
 */
function previewBody(l: Lead) {
  return {
    source_page: "Idola Voter",
    nama: l.name ?? "",
    email: l.email ?? "",
    phone: l.phone_number ?? "",
    data: "admin_leads_submit",
  };
}

export default function AdminPmbTrackingPage() {
  const [intent, setIntent] = React.useState("");
  const [awareness, setAwareness] = React.useState("sudah_minat");
  const [status, setStatus] = React.useState<"" | "belum" | "sudah">("belum");
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<SubmitResult | null>(null);
  const confirm = useConfirm();
  const qc = useQueryClient();

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
    return (data ?? []).filter((l) => {
      if (status === "belum" && l.pmb_tracked_at) return false;
      if (status === "sudah" && !l.pmb_tracked_at) return false;
      if (!kw) return true;
      return (
        l.name?.toLowerCase().includes(kw) ||
        l.phone_number?.toLowerCase().includes(kw) ||
        l.email?.toLowerCase().includes(kw) ||
        l.school_name?.toLowerCase().includes(kw)
      );
    });
  }, [data, q, status]);

  const allChecked = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected(() => {
      if (allChecked) return new Set();
      return new Set(filtered.map((l) => l.id));
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      toast.error("Pilih minimal satu data dulu.");
      return;
    }
    confirm({
      title: "Kirim ke tracking PMB?",
      description: `${selected.size} data akan dikirim ke pmb.stekom.ac.id sebagai lead. Yang sudah pernah terkirim otomatis dilewati.`,
      confirmText: "Kirim",
      onConfirm: doSubmit,
    });
  }

  async function doSubmit() {
    setSubmitting(true);
    setLastResult(null);
    try {
      const result = await api<SubmitResult>("/api/admin/leads/submit-pmb", {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      setLastResult(result);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (result.fail > 0) {
        toast.error(`${result.ok} sukses, ${result.fail} gagal, ${result.skipped} dilewati (sudah pernah).`);
      } else {
        toast.success(`${result.ok} data terkirim ke tracking PMB. ${result.skipped} dilewati (sudah pernah).`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Tracking PMB</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kirim data voter yang sudah onboarding ke pmb.stekom.ac.id sebagai
            lead pendaftaran. {data ? `${filtered.length} data tampil.` : ""}
          </p>
        </div>
        <Button onClick={submit} disabled={submitting || selected.size === 0}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
      </div>

      {lastResult && (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium">
            Hasil kirim terakhir: {lastResult.ok} sukses, {lastResult.fail} gagal,{" "}
            {lastResult.skipped} dilewati (sudah pernah terkirim), dari{" "}
            {lastResult.total} dipilih.
          </p>
          {lastResult.failed.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-destructive">
              {lastResult.failed.map((f) => (
                <li key={f.id}>{f.id}: {f.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
        <FilterField label="Status Tracking">
          <SelectBox
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            placeholder="Semua"
            options={[
              { value: "", label: "Semua" },
              { value: "belum", label: "Belum terkirim" },
              { value: "sudah", label: "Sudah terkirim" },
            ]}
          />
        </FilterField>
      </FilterBar>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState title="Tidak ada data" />
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Nama</th>
                  <th className="px-3 py-2 text-left font-medium">Kontak</th>
                  <th className="px-3 py-2 text-left font-medium">Sekolah</th>
                  <th className="px-3 py-2 text-left font-medium">Niat</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Kenal Universitas STEKOM
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Status Tracking</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{l.name ?? "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="block">{l.phone_number ?? "-"}</span>
                      <span className="block text-xs">{l.email ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {l.school_name ?? "-"}
                      {l.voter_class ? ` · ${l.voter_class}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {INTENT_LABEL[l.college_intent ?? ""] ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {AWARE_LABEL[l.stekom_awareness ?? ""] ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {l.pmb_tracked_at ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {new Date(l.pmb_tracked_at).toLocaleDateString("id-ID")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Belum</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Referensi payload, membantu debugging kalau ada yang gagal. */}
      {filtered[0] && (
        <details className="rounded-xl border bg-muted/20 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Contoh body yang dikirim per data
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(previewBody(filtered[0]), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
