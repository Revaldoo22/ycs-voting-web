"use client";

import { RegionHeatmap } from "@/components/region-heatmap";

export default function AdminDaerahPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daerah</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sebaran poin, vote, sekolah, dan peserta per kabupaten/kota. Hanya
          wilayah yang punya peserta yang muncul. Filter per provinsi.
        </p>
      </div>
      <RegionHeatmap />
    </div>
  );
}
