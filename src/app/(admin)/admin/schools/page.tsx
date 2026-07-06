"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { useRegions, type Region } from "@/lib/queries";
import { api } from "@/lib/api-client";
import { schoolSchema, type SchoolInput } from "@/lib/validations";
import type { School } from "@/types/database";

type SchoolRow = School & { region?: { id: string; name: string } | null };

export default function AdminSchoolsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["schools", "admin"],
    queryFn: () => api<SchoolRow[]>("/api/admin/schools"),
  });
  const { data: regions } = useRegions();
  const [open, setOpen] = React.useState(false);
  const [manageRegions, setManageRegions] = React.useState(false);
  const [editing, setEditing] = React.useState<School | null>(null);

  async function setRegion(schoolId: string, regionId: string | null) {
    try {
      await api("/api/admin/schools/" + schoolId + "/region", {
        method: "PATCH",
        body: JSON.stringify({ region_id: regionId ?? undefined }),
      });
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["heatmap"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal set kabupaten.");
    }
  }

  // participant count per school (to guard deletion)
  const { data: counts } = useQuery({
    queryKey: ["school-participant-counts"],
    queryFn: () =>
      api<Record<string, number>>("/api/admin/schools/participant-counts"),
  });

  const form = useForm<SchoolInput>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { name: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "" });
    setOpen(true);
  }

  function openEdit(s: School) {
    setEditing(s);
    form.reset({ name: s.name });
    setOpen(true);
  }

  async function onSubmit(values: SchoolInput) {
    try {
      if (editing) {
        await api(`/api/admin/schools/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: values.name }),
        });
      } else {
        await api("/api/admin/schools", {
          method: "POST",
          body: JSON.stringify({ name: values.name }),
        });
      }
    } catch (err) {
      toast.error(
        "Gagal menyimpan: " + (err instanceof Error ? err.message : "")
      );
      return;
    }
    toast.success(editing ? "Sekolah diperbarui." : "Sekolah ditambahkan.");
    setOpen(false);
    setEditing(null);
    form.reset({ name: "" });
    qc.invalidateQueries({ queryKey: ["schools"] });
    qc.invalidateQueries({ queryKey: ["participants"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  function remove(s: School) {
    const n = counts?.[s.id] ?? 0;
    if (n > 0) {
      toast.error(
        `Tidak bisa dihapus: masih ada ${n} peserta di sekolah ini. Pindah/hapus pesertanya dulu.`
      );
      return;
    }
    confirm({
      title: `Hapus sekolah ${s.name}?`,
      confirmText: "Hapus",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/schools/${s.id}`, { method: "DELETE" });
        } catch (err) {
          toast.error(
            "Gagal menghapus: " + (err instanceof Error ? err.message : "")
          );
          return;
        }
        toast.success("Sekolah dihapus.");
        qc.invalidateQueries({ queryKey: ["schools"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Sekolah</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Daftar sekolah asal peserta.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageRegions(true)}>
            <MapPin className="h-4 w-4" /> Kelola Kabupaten
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah Sekolah
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Belum ada sekolah" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Sekolah</TableHead>
                  <TableHead>Kabupaten</TableHead>
                  <TableHead className="text-right">Peserta</TableHead>
                  <TableHead>Ditambahkan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <select
                        className="select-ui h-8 w-44 pl-2 pr-8 text-xs"
                        value={(s as SchoolRow).region?.id ?? ""}
                        onChange={(e) => setRegion(s.id, e.target.value || null)}
                      >
                        <option value="">Tanpa kabupaten</option>
                        {(regions ?? []).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      {counts?.[s.id] ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          title="Hapus"
                          onClick={() => remove(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sekolah" : "Tambah Sekolah"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Sekolah</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editing ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <RegionManager
        open={manageRegions}
        onClose={() => setManageRegions(false)}
        regions={regions ?? []}
      />
    </div>
  );
}

function RegionManager({
  open,
  onClose,
  regions,
}: {
  open: boolean;
  onClose: () => void;
  regions: Region[];
}) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [province, setProvince] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["regions"] });
    qc.invalidateQueries({ queryKey: ["heatmap"] });
  };

  async function add() {
    if (name.trim().length < 2) return void toast.error("Isi nama kabupaten.");
    setBusy(true);
    try {
      await api("/api/admin/regions", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          province: province.trim() || undefined,
        }),
      });
      toast.success("Kabupaten ditambahkan.");
      setName("");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: Region) {
    try {
      await api("/api/admin/regions/" + r.id, { method: "DELETE" });
      toast.success("Kabupaten dihapus.");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Kabupaten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label>Nama Kabupaten/Kota</Label>
              <Input
                placeholder="mis. Kab. Semarang"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="w-36 space-y-1">
              <Label>Provinsi</Label>
              <Input
                placeholder="opsional"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
            <Button onClick={add} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {regions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada kabupaten.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {regions.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{r.name}</span>
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-destructive"
                    onClick={() => remove(r)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
