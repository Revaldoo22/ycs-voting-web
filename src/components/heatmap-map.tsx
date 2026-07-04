"use client";

import * as React from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useHeatmap, type HeatmapRow } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

/** "Kab. Semarang" / "Kota Semarang" → kunci cocok dengan GeoJSON. */
function regionKey(name: string): string {
  const isKota = /^kota/i.test(name.trim());
  const core = name.replace(/^(kab\.?|kota)\s*/i, "").toLowerCase();
  return (isKota ? "kota" : "kab") + core.replace(/[^a-z]/g, "");
}

/** Skala warna 5 tingkat berdasarkan rasio poin terhadap maksimum. */
function fillColor(ratio: number): string {
  if (ratio >= 0.8) return "#0e7490";
  if (ratio >= 0.55) return "#0891b2";
  if (ratio >= 0.3) return "#22d3ee";
  if (ratio >= 0.1) return "#a5f3fc";
  if (ratio > 0) return "#e0f7fa";
  return "#f1f5f9";
}

export default function HeatmapMap() {
  const { data: rows } = useHeatmap();
  const [geo, setGeo] = React.useState<FeatureCollection | null>(null);

  React.useEffect(() => {
    fetch("/geo/jateng.json")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const byKey = React.useMemo(() => {
    const m = new Map<string, HeatmapRow>();
    for (const r of rows ?? []) m.set(regionKey(r.region_name), r);
    return m;
  }, [rows]);

  const max = Math.max(1, ...(rows ?? []).map((r) => r.points));

  const style = React.useCallback(
    (feature?: Feature): PathOptions => {
      const key = (feature?.properties as { key?: string })?.key ?? "";
      const row = byKey.get(key);
      return {
        fillColor: fillColor((row?.points ?? 0) / max),
        fillOpacity: 0.75,
        color: "#64748b",
        weight: 1,
      };
    },
    [byKey, max],
  );

  const onEach = React.useCallback(
    (feature: Feature, layer: Layer) => {
      const props = feature.properties as { key: string; name: string };
      const row = byKey.get(props.key);
      const html = row
        ? `<strong>${props.name}</strong><br/>${formatNumber(row.points)} poin · ${formatNumber(row.votes)} vote<br/>${row.schools} sekolah · ${row.participants} peserta`
        : `<strong>${props.name}</strong><br/>Belum ada data`;
      layer.bindTooltip(html, { sticky: true });
    },
    [byKey],
  );

  // Re-render GeoJSON layer saat data berubah (leaflet tak reactive).
  const layerKey = `${rows?.length ?? 0}-${max}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
      <MapContainer
        center={[-7.25, 110.2]}
        zoom={8}
        style={{ height: 520, width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geo && (
          <GeoJSON key={layerKey} data={geo} style={style} onEachFeature={onEach} />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Poin:</span>
        {[
          ["#f1f5f9", "0"],
          ["#e0f7fa", "rendah"],
          ["#22d3ee", "sedang"],
          ["#0891b2", "tinggi"],
          ["#0e7490", "terpanas"],
        ].map(([c, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-border/60"
              style={{ background: c }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
