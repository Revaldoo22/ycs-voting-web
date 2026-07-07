"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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
import { SelectBox } from "@/components/ui/select-box";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, EmptyState, ErrorState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { useAdminQuests } from "@/lib/queries";
import { api } from "@/lib/api-client";
import { compressImage } from "@/lib/image-compress";
import { questSchema, type QuestInput } from "@/lib/validations";
import type { Quest } from "@/types/database";

const empty: QuestInput = {
  name: "",
  description: "",
  point: 10,
  status: "active",
  proof_type: "file",
  frequency: "once",
  ref_link: "",
  ref_image: "",
};


export default function AdminQuestsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading, isError, refetch } = useAdminQuests();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quest | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [refImageFile, setRefImageFile] = React.useState<File | null>(null);

  const filtered = React.useMemo(
    () =>
      (data ?? []).filter((q) =>
        statusFilter === "all" ? true : q.status === statusFilter
      ),
    [data, statusFilter]
  );

  const form = useForm<QuestInput>({
    resolver: zodResolver(questSchema),
    defaultValues: empty,
  });

  function openCreate() {
    setEditing(null);
    form.reset(empty);
    setRefImageFile(null);
    setOpen(true);
  }

  function openEdit(q: Quest) {
    setEditing(q);
    form.reset({
      name: q.name,
      description: q.description ?? "",
      point: q.point,
      status: q.status,
      proof_type: q.proof_type,
      frequency: q.frequency,
      ref_link: q.ref_link ?? "",
      ref_image: q.ref_image ?? "",
    });
    setRefImageFile(null);
    setOpen(true);
  }

  async function onSubmit(values: QuestInput) {
    // Upload a new reference image if one was chosen.
    let refImage = values.ref_image || undefined;
    if (refImageFile) {
      try {
        const img = await compressImage(refImageFile);
        const fd = new FormData();
        fd.append("file", img);
        const up = await api<{ url: string }>("/api/upload", {
          method: "POST",
          body: fd,
        });
        refImage = new URL(up.url, window.location.origin).toString();
      } catch (err) {
        toast.error(
          "Gagal upload gambar referensi: " +
            (err instanceof Error ? err.message : "")
        );
        return;
      }
    }

    const payload = {
      name: values.name,
      description: values.description || undefined,
      point: values.point,
      status: values.status,
      proof_type: values.proof_type,
      frequency: values.frequency,
      ref_link: values.ref_link || undefined,
      ref_image: refImage,
    };
    try {
      if (editing) {
        await api(`/api/admin/quests/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/admin/quests", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      toast.error(
        "Gagal menyimpan quest: " + (err instanceof Error ? err.message : "")
      );
      return;
    }
    toast.success(editing ? "Quest diperbarui." : "Quest ditambahkan.");
    setOpen(false);
    setEditing(null);
    form.reset(empty);
    setRefImageFile(null);
    qc.invalidateQueries({ queryKey: ["quests"] });
  }

  async function toggleStatus(id: string, current: string, quest: Quest) {
    const next = current === "active" ? "inactive" : "active";
    try {
      await api(`/api/admin/quests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: quest.name, point: quest.point, status: next }),
      });
    } catch {
      toast.error("Gagal mengubah status.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["quests"] });
  }

  function remove(q: Quest) {
    confirm({
      title: `Hapus quest ${q.name}?`,
      description: "Submission terkait quest ini ikut terhapus.",
      confirmText: "Hapus",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/quests/${q.id}`, { method: "DELETE" });
        } catch (err) {
          toast.error(
            "Gagal menghapus: " + (err instanceof Error ? err.message : "")
          );
          return;
        }
        toast.success("Quest dihapus.");
        qc.invalidateQueries({ queryKey: ["quests"] });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Quest</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Atur quest, poin, dan frekuensinya.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Quest
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="active">Aktif</TabsTrigger>
          <TabsTrigger value="inactive">Nonaktif</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            data && data.length > 0
              ? "Tidak ada quest pada filter ini"
              : "Belum ada quest"
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quest</TableHead>
                  <TableHead className="text-right">Poin</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Frekuensi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <p className="font-medium">{q.name}</p>
                      <p className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                        {q.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      +{q.point}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {q.proof_type === "link" ? "Link" : "File"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          q.frequency === "daily"
                            ? "warning"
                            : q.frequency === "global"
                              ? "accent"
                              : "outline"
                        }
                      >
                        {q.frequency === "daily"
                          ? "Harian"
                          : q.frequency === "global"
                            ? "Global (1x)"
                            : "Sekali"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={q.status === "active" ? "success" : "secondary"}
                      >
                        {q.status === "active" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus(q.id, q.status, q)}
                        >
                          {q.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(q)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => remove(q)}
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
            <DialogTitle>{editing ? "Edit Quest" : "Tambah Quest"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Quest</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea rows={3} {...form.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Poin</Label>
                <Input type="number" {...form.register("point")} />
                {form.formState.errors.point && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.point.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Frekuensi</Label>
                <SelectBox
                  value={form.watch("frequency") ?? "once"}
                  onChange={(v) =>
                    form.setValue(
                      "frequency",
                      v as "once" | "daily" | "global",
                    )
                  }
                  options={[
                    { value: "once", label: "Sekali per peserta (permanen)" },
                    { value: "daily", label: "Harian (ulang tiap hari)" },
                    {
                      value: "global",
                      label: "Global - sekali untuk semua peserta (mis. follow)",
                    },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Bukti</Label>
              <SelectBox
                value={form.watch("proof_type") ?? "file"}
                onChange={(v) =>
                  form.setValue("proof_type", v as "file" | "link")
                }
                options={[
                  { value: "file", label: "Upload File (screenshot)" },
                  { value: "link", label: "Link Postingan (video / poster)" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <SelectBox
                value={form.watch("status") ?? "active"}
                onChange={(v) =>
                  form.setValue("status", v as "active" | "inactive")
                }
                options={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Arahan / Referensi (opsional)</p>
              <div className="space-y-1.5">
                <Label>Link Arahan (akun sosmed / contoh postingan)</Label>
                <Input
                  type="url"
                  placeholder="https://instagram.com/stekom"
                  {...form.register("ref_link")}
                />
                {form.formState.errors.ref_link && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.ref_link.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Gambar Referensi (mis. contoh poster)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRefImageFile(e.target.files?.[0] ?? null)}
                />
                {editing?.ref_image && !refImageFile && (
                  <p className="text-xs text-muted-foreground">
                    Sudah ada gambar. Pilih file baru untuk mengganti.
                  </p>
                )}
              </div>
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
    </div>
  );
}
