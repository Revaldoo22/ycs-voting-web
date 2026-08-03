"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { submitCouponClaim } from "@/lib/queries";
import { api } from "@/lib/api-client";
import { compressImage } from "@/lib/image-compress";
import type { Dictionary } from "@/lib/i18n/types";

/**
 * Tugas follow IG/TikTok, syarat KLAIM KUPON undian HP (setelah vote sukses,
 * terpisah dari vote itu sendiri).
 */
const FOLLOW_TASK_URLS = [
  "https://tiktok.com/@stekomuniversity",
  "https://instagram.com/universitasstekom",
  "https://tiktok.com/@toploker.com",
  "https://instagram.com/toplokercom",
];
const FOLLOW_TASK_KEYS = [
  "stekom_tiktok",
  "stekom_ig",
  "toploker_tiktok",
  "toploker_ig",
];

export function useFollowTasks(t: Dictionary["peserta"]) {
  return t.followTasks.map((task, i) => ({
    key: FOLLOW_TASK_KEYS[i],
    title: task.title,
    url: FOLLOW_TASK_URLS[i],
    linkLabel: task.linkLabel,
  }));
}

/**
 * Klaim kupon undian handphone: follow akun Univ STEKOM/TopLoker + upload
 * bukti, TERPISAH dari vote (vote sudah sukses sebelum dialog ini muncul).
 * Dipakai dari halaman peserta (setelah vote) maupun beranda (langsung,
 * kalau voter sudah pernah vote sebelumnya).
 */
export function ClaimCouponDialog({
  open,
  onOpenChange,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: () => void;
}) {
  const t = useTranslation("peserta");
  const followTasks = useFollowTasks(t);
  const MAX_PROOFS = 12;
  const [proofFiles, setProofFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const qc = useQueryClient();

  async function uploadProof(file: File): Promise<string> {
    const img = await compressImage(file, { maxSize: 900, quality: 0.7 });
    const fd = new FormData();
    fd.append("file", img);
    const up = await api<{ url: string }>("/api/upload-proof", {
      method: "POST",
      body: fd,
    });
    return new URL(up.url, window.location.origin).toString();
  }

  async function submitClaim() {
    if (proofFiles.length === 0) {
      toast.error(t.uploadProofFirst);
      return;
    }
    setBusy(true);
    try {
      const proofs: string[] = [];
      try {
        for (const f of proofFiles) proofs.push(await uploadProof(f));
      } catch (err) {
        toast.error(
          t.uploadProofFailed(err instanceof Error ? err.message : ""),
        );
        return;
      }
      await submitCouponClaim(proofs);
      toast.success(t.claimSubmitted);
      qc.invalidateQueries({ queryKey: ["coupon-claim"] });
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      setProofFiles([]);
      onOpenChange(false);
      onClaimed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.voteFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.followTaskDialogTitle}</DialogTitle>
          <DialogDescription>
            {t.followTaskDialogDescription(followTasks.length)}
          </DialogDescription>
        </DialogHeader>

        {/* Daftar tugas: klik untuk membuka akun/saluran yang harus di-follow. */}
        <div className="max-h-[35vh] space-y-1.5 overflow-y-auto pr-1">
          {followTasks.map((task, i) => (
            <a
              key={task.key}
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="min-w-0 truncate font-medium">
                {i + 1}. {task.title}
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>

        {/* Satu tombol upload untuk semua bukti, boleh pilih banyak sekaligus. */}
        <div className="space-y-1.5">
          <Label>{t.screenshotProofLabel}</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={proofFiles.length >= MAX_PROOFS}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              setProofFiles((prev) => {
                const merged = [...prev];
                for (const f of picked) {
                  if (
                    merged.length < MAX_PROOFS &&
                    !merged.some((x) => x.name === f.name && x.size === f.size)
                  )
                    merged.push(f);
                }
                return merged;
              });
              e.target.value = ""; // reset agar bisa pilih lagi
            }}
          />
          {proofFiles.length > 0 && (
            <ul className="space-y-1">
              {proofFiles.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                >
                  <span className="min-w-0 truncate">{f.name}</span>
                  <button
                    type="button"
                    className="shrink-0 text-destructive"
                    onClick={() =>
                      setProofFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              <li className="text-xs text-muted-foreground">
                {proofFiles.length}/{MAX_PROOFS} {t.files}
              </li>
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t.proofNote}</p>
        <Button onClick={submitClaim} disabled={busy || proofFiles.length === 0}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.sendProofAndVote(proofFiles.length)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
