"use client";

import * as React from "react";
import { useHeatmap, type HeatmapRow } from "@/lib/queries";
import { EmptyState } from "@/components/states";
import { SelectBox } from "@/components/ui/select-box";
import { formatNumber } from "@/lib/utils";

/** Warna intensitas berdasarkan rasio poin terhadap maksimum (heatmap). */
function heatColor(ratio: number): string {
  if (ratio >= 0.8) return "#0e7490";
  if (ratio >= 0.55) return "#0891b2";
  if (ratio >= 0.3) return "#22d3ee";
  if (ratio >= 0.1) return "#67e8f9";
  if (ratio > 0) return "#cffafe";
  return "#e2e8f0";
}

/**
 * Heatmap wilayah berbasis tabel (nasional). Hanya kabupaten yang punya
 * peserta yang muncul. Filter provinsi + cari kabupaten. Ringan, tanpa peta.
 */
export function RegionHeatmap({ compact = false }: { compact?: boolean }) {
  const { data: rows, isLoading } = useHeatmap();
  const [province, setProvince] = React.useState("");
  const [q, setQ] = React.useState("");

  const provinces = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows ?? []) {
      if (r.province_code && r.province_name)
        m.set(r.province_code, r.province_name);
    }
    return Array.from(m, ([code, name]) => ({ code, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [rows]);

  const max = Math.max(1, ...(rows ?? []).map((r) => r.points));

  const filtered = React.useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => !province || r.province_code === province)
      .filter((r) => !kw || r.region_name.toLowerCase().includes(kw));
  }, [rows, province, q]);

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <div className="w-56">
            <SelectBox
              value={province}
              onChange={setProvince}
              placeholder="Semua provinsi"
              options={[
                { value: "", label: "Semua provinsi" },
                ...provinces.map((p) => ({ value: p.code, label: p.name })),
              ]}
            />
          </div>
          <input
            className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm"
            placeholder="Cari kabupaten/kota…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada data wilayah dengan peserta" />
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <div className="max-h-[65vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Kabupaten / Kota</th>
                  {!compact && (
                    <th className="px-3 py-2 text-left font-medium">Provinsi</th>
                  )}
                  <th className="px-3 py-2 text-right font-medium">Sekolah</th>
                  <th className="px-3 py-2 text-right font-medium">Peserta</th>
                  <th className="px-3 py-2 text-right font-medium">Vote</th>
                  <th className="px-3 py-2 text-right font-medium">Poin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: HeatmapRow) => (
                  <tr key={r.region_id} className="border-t">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ background: heatColor(r.points / max) }}
                          aria-hidden
                        />
                        <span className="font-medium">{r.region_name}</span>
                      </span>
                    </td>
                    {!compact && (
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.province_name ?? "-"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(r.schools)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(r.participants)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(r.votes)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-primary">
                      {formatNumber(r.points)}
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
