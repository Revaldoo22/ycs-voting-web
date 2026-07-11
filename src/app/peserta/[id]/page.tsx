"use client";

import * as React from "react";
import { use } from "react";
import Image from "next/image";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  Link as LinkIcon,
  Loader2,
  Plus,
  Share2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDoneContentIds,
  useMyProfile,
  useParticipantContents,
  useQuests,
  useSettings,
  useVoterToday,
} from "@/lib/queries";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api-client";
import { getFingerprint } from "@/lib/fingerprint";
import { compressImage } from "@/lib/image-compress";
import { formatNumber, trackEvent } from "@/lib/utils";
import { voterInfoSchema } from "@/lib/validations";
import {
  VoterFormFields,
  useVoterForm,
  type VoterFormData,
} from "@/components/voter-form-fields";
import { useConfirm } from "@/components/confirm-dialog";
import type { ParticipantWithSchool, Quest } from "@/types/database";

export default function PublicParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const anonVoter = useVoterForm();
  const { data: me } = useMyProfile();
  const { data: quests } = useQuests(true);
  const { data: settings } = useSettings();
  const eventClosed = settings ? !settings.event_open : false;

  // Vote milik akun ini — untuk label "sudah kamu vote" di peserta terkait.
  const { data: myVotes } = useVoterToday(!!me);
  const myVote = (myVotes?.votes ?? []).find((v) => v.participant_id === id);
  const votedThis = !!myVote;
  const votePending = myVote?.status === "pending";

  const router = useRouter();

  // Aksi dukung/quest wajib login sebagai pendukung.
  // gate = null berarti boleh lanjut; selain itu fungsi pengalihan.
  // Peserta (voter yang email-nya cocok record peserta) TETAP boleh vote
  // peserta lain — yang diblok hanya vote ke DIRINYA sendiri. Akun admin
  // sungguhan tidak boleh vote sama sekali.
  const isSelf = !!me && me.self_participant_id === id;
  const gate: (() => void) | null = !me
    ? () => router.push(`/login?next=/peserta/${id}`)
    : me.role === "admin"
      ? () => toast.error("Akun admin tidak bisa memberi dukungan.")
      : me.role === "voter" && !me.onboarded
        ? () => router.push("/onboarding")
        : isSelf
          ? () => toast.error("Kamu tidak bisa mendukung dirimu sendiri.")
          : null;

  // Identitas voter otomatis (tanpa form manual) untuk:
  //  - voter yang sudah lengkapi wizard onboarding, ATAU
  //  - peserta (email akun cocok record peserta) → status "peserta".
  const isParticipant = !!me?.is_participant;
  const locked = !!me && ((me.role === "voter" && me.onboarded) || isParticipant);
  const followed = !!me?.followed;
  const voter: VoterCtx = locked
    ? {
        ...anonVoter,
        data: {
          name: me.name ?? "",
          phone_number: me.phone_number ?? "",
          email: me.email ?? "",
          status: (isParticipant
            ? "peserta"
            : me.status ?? "teman_luar") as VoterFormData["status"],
          school: me.school ?? "",
          class: (me.class ?? "") as VoterFormData["class"],
        },
        setData: () => {},
        persist: () => {},
      }
    : anonVoter;

  const {
    data: participant,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["participant", id],
    queryFn: () =>
      api<ParticipantWithSchool | null>(`/api/public/participants/${id}`),
  });

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />
      <main className="container max-w-3xl space-y-6 py-8">
        {/* Kembali ke halaman sebelumnya (scroll & state utuh via history);
            fallback ke beranda kalau dibuka langsung dari link. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            window.history.length > 1 ? router.back() : router.push("/")
          }
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        {eventClosed && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm font-medium text-destructive">
            {settings?.closed_message ?? "Event sedang ditutup."}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !participant ? (
          <EmptyState title="Peserta tidak ditemukan" />
        ) : (
          <>
            <Card className="overflow-hidden">
              {participant.photo_url && (
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <Image
                    src={participant.photo_url}
                    alt={participant.name}
                    fill
                    sizes="(max-width:768px) 100vw, 768px"
                    className="object-cover"
                    // Foto di-serve via redirect 302 ke signed URL storage
                    // (berbatas waktu) — optimizer Next gagal; pakai apa adanya.
                    unoptimized
                  />
                </div>
              )}
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2">
                    {participant.photo_url && (
                      <AvatarImage src={participant.photo_url} alt={participant.name} />
                    )}
                    <AvatarFallback className="text-lg">
                      {participant.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{participant.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {participant.schools?.name}
                    </p>
                    {(participant.schools?.kabupaten ||
                      participant.schools?.provinsi) && (
                      <p className="text-xs text-muted-foreground">
                        {[
                          participant.schools?.kabupaten,
                          participant.schools?.provinsi,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge variant="accent" className="shrink-0">
                    {formatNumber(participant.total_points)} poin
                  </Badge>
                </div>
                {participant.description && (
                  <p className="text-sm">{participant.description}</p>
                )}

                <ShareButton name={participant.name} />

                {votedThis ? (
                  votePending ? (
                    <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sudah vote — bukti follow menunggu review admin. Poin
                      masuk setelah di-approve.
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2.5 text-sm font-bold text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]">
                      <BadgeCheck className="h-4 w-4" />
                      Kamu sudah vote peserta ini. Terima kasih!
                    </div>
                  )
                ) : (
                  <VoteDialog
                    participantId={id}
                    participantName={participant.name}
                    voter={voter}
                    locked={locked}
                    followed={followed || isParticipant}
                    gate={gate}
                    disabled={eventClosed}
                    onVoted={() => refetch()}
                  />
                )}
                <p className="text-center text-xs text-muted-foreground">
                  Setiap akun hanya bisa memberi 1 vote seumur event.
                </p>
              </CardContent>
            </Card>

            {quests && quests.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Trophy className="h-5 w-5 text-accent" />
                Kerjakan quest untuk memberikan poin tambahan ke{" "}
                {participant.name}
              </h3>
              {false ? (
                <EmptyState title="Belum ada quest aktif" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {quests.map((q) => (
                    <QuestCard
                      key={q.id}
                      quest={q}
                      participantId={id}
                      participantName={participant.name}
                      voter={voter}
                      locked={locked}
                      gate={gate}
                      disabled={eventClosed}
                    />
                  ))}
                </div>
              )}
            </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type VoterCtx = ReturnType<typeof useVoterForm>;

/**
 * Tugas follow wajib sebelum vote pertama — masing-masing upload bukti.
 * Key HARUS sinkron dengan REQUIRED_FOLLOW_TASKS di backend.
 */
const FOLLOW_TASKS: { key: string; title: string; url: string; linkLabel: string }[] = [
  {
    key: "stekom_tiktok",
    title: "Follow TikTok Univ STEKOM",
    url: "https://tiktok.com/@stekomuniversity",
    linkLabel: "@stekomuniversity",
  },
  {
    key: "stekom_ig",
    title: "Follow Instagram Univ STEKOM",
    url: "https://instagram.com/universitasstekom",
    linkLabel: "@universitasstekom",
  },
  {
    key: "toploker_tiktok",
    title: "Follow TikTok TopLoker.com",
    url: "https://tiktok.com/@toploker.com",
    linkLabel: "@toploker.com",
  },
  {
    key: "toploker_ig",
    title: "Follow Instagram TopLoker.com",
    url: "https://instagram.com/toplokercom",
    linkLabel: "@toplokercom",
  },
  {
    key: "wa_stekom",
    title: "Ikuti Saluran WhatsApp UnivSTEKOM",
    url: "https://whatsapp.com/channel/0029VaYIG217oQhhUoA3a915",
    linkLabel: "Saluran UnivSTEKOM",
  },
  {
    key: "wa_ycs",
    title: "Ikuti Saluran WhatsApp YCS 2026",
    url: "https://whatsapp.com/channel/0029Vb5vVIaId7nEqecJ1I1G",
    linkLabel: "Saluran YCS 2026",
  },
];

function validateVoter(data: VoterFormData): string | null {
  const r = voterInfoSchema.safeParse(data);
  return r.success ? null : r.error.issues[0]?.message ?? "Data tidak lengkap";
}

function ShareButton({ name }: { name: string }) {
  // Langsung buka WhatsApp dengan pesan siap kirim (saluran di baris atas),
  // lalu user tinggal memilih mau dikirim ke siapa.
  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const msg = [
      "https://whatsapp.com/channel/0029VaYIG217oQhhUoA3a915",
      "",
      `Dukung ${name} di Youth Character Summit Universitas STEKOM! 🔥`,
      url,
    ].join("\n");
    trackEvent("share_profile", { participant: name });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <Button variant="outline" className="w-full" onClick={share}>
      <Share2 className="h-4 w-4" /> Bagikan Profil
    </Button>
  );
}

function VoteDialog({
  participantId,
  participantName,
  voter,
  locked,
  followed,
  gate,
  disabled,
  onVoted,
}: {
  participantId: string;
  participantName: string;
  voter: VoterCtx;
  /** Voter login + onboarded: identitas dari profil, tanpa form/konfirmasi. */
  locked: boolean;
  /** Sudah pernah konfirmasi follow akun STEKOM (sekali seumur event). */
  followed: boolean;
  /** Belum boleh vote (belum login / belum wizard / bukan voter). */
  gate: (() => void) | null;
  disabled: boolean;
  onVoted: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [showFollow, setShowFollow] = React.useState(false);
  // Screenshot bukti follow — satu tombol upload, boleh banyak sekaligus.
  const MAX_PROOFS = 12;
  const [proofFiles, setProofFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const pts = 1;

  function submit() {
    // Locked = identitas dari akun/record peserta (backend sumber kebenaran),
    // tak perlu validasi form manual.
    if (locked) {
      // Vote pertama (harian / favorit): wajib follow akun Univ STEKOM dulu (sekali).
      if (!followed) {
        setShowFollow(true);
        return;
      }
      void doSubmit();
      return;
    }
    const err = validateVoter(voter.data);
    if (err) {
      toast.error(err);
      return;
    }
    confirm({
      title: "Pastikan data kamu benar",
      description: `Nama: ${voter.data.name}\nNomor WhatsApp: ${voter.data.phone_number}\nEmail: ${voter.data.email}\n\nData ini dipakai panitia untuk menghubungimu jika kamu mendapatkan reward. Pastikan benar - tidak bisa diubah setelah dikirim.`,
      confirmText: "Saya Yakin, Kirim",
      onConfirm: doSubmit,
    });
  }

  /** Upload satu screenshot bukti → URL absolut. */
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

  async function doSubmit(followConfirmed = false) {
    setBusy(true);
    try {
      // Follow pertama: upload semua screenshot bukti (satu tombol, multi).
      let followProofs: string[] | undefined;
      if (followConfirmed) {
        if (proofFiles.length === 0) {
          toast.error("Upload screenshot bukti tugas follow dulu.");
          return;
        }
        try {
          followProofs = [];
          for (const f of proofFiles) {
            followProofs.push(await uploadProof(f));
          }
        } catch (err) {
          toast.error(
            "Gagal mengunggah bukti: " +
              (err instanceof Error ? err.message : ""),
          );
          return;
        }
      }
      const fingerprint = await getFingerprint();
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...voter.data,
          participant_id: participantId,
          fingerprint,
          ...(followConfirmed
            ? { follow_confirmed: true, follow_proofs: followProofs }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error((Array.isArray(data.message) ? data.message[0] : data.message) ?? data.error ?? "Gagal memberikan dukungan.");
        return;
      }
      voter.persist(voter.data);
      trackEvent("vote_submit", {
        participant_id: participantId,
        points: pts,
      });
      // Refresh label "sudah kamu vote" di card & halaman peserta.
      qc.invalidateQueries({ queryKey: ["voter-today"] });
      if (data.pending) {
        // Bukti follow direview admin dulu — poin & kupon menyusul.
        toast.success(
          "Vote terkirim! Bukti follow kamu sedang direview admin — poin masuk setelah di-approve.",
        );
        trackEvent("follow_confirmed");
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      } else if (followConfirmed) {
        toast.success("Vote terkirim. Kupon undian handphone masuk ke akunmu!");
        trackEvent("follow_confirmed");
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
        qc.invalidateQueries({ queryKey: ["my-coupons"] });
      } else {
        toast.success(`+${pts} terkirim untuk ${participantName}`);
      }
      setOpen(false);
      setShowFollow(false);
      onVoted();
    } finally {
      setBusy(false);
    }
  }

  // Belum siap vote (anon/wizard/bukan voter): tombol mengalihkan.
  if (gate) {
    return (
      <Button
        className="w-full"
        variant="default"
        disabled={disabled}
        onClick={gate}
      >
        <Heart className="h-4 w-4" />
        {disabled ? "Event ditutup" : "Dukung"}
      </Button>
    );
  }

  // Sudah login: satu klik langsung vote, tanpa dialog isi data.
  if (locked) {
    return (
      <>
      <Dialog open={showFollow} onOpenChange={setShowFollow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kerjakan tugas follow, dapat kupon undian</DialogTitle>
            <DialogDescription>
              Sekali saja untuk seluruh event. Kerjakan {FOLLOW_TASKS.length}{" "}
              tugas di bawah, upload bukti per tugas, lalu kirim. Bukti
              direview admin — vote &amp; kupon undianmu sah setelah
              di-approve.
            </DialogDescription>
          </DialogHeader>

          {/* Daftar tugas: klik untuk membuka akun/saluran yang harus di-follow. */}
          <div className="max-h-[35vh] space-y-1.5 overflow-y-auto pr-1">
            {FOLLOW_TASKS.map((t, i) => (
              <a
                key={t.key}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="min-w-0 truncate font-medium">
                  {i + 1}. {t.title}
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>

          {/* Satu tombol upload untuk semua bukti — boleh pilih banyak sekaligus. */}
          <div className="space-y-1.5">
            <Label>Screenshot Bukti (boleh pilih banyak sekaligus)</Label>
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
                  {proofFiles.length}/{MAX_PROOFS} file
                </li>
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Upload screenshot yang menunjukkan kamu sudah follow/mengikuti
            semua akun di atas. Poin vote masuk ke peserta setelah bukti
            di-approve admin.
          </p>
          <Button
            onClick={() => doSubmit(true)}
            disabled={busy || proofFiles.length === 0}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Kirim bukti &amp; vote ({proofFiles.length} file)
          </Button>
        </DialogContent>
      </Dialog>
      <Button
        className="w-full"
        variant="default"
        disabled={disabled || busy}
        onClick={submit}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
        {disabled ? "Event ditutup" : "Dukung"}
      </Button>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          variant="default"
          disabled={disabled}
        >
          <Heart className="h-4 w-4" />
          {disabled ? "Event ditutup" : "Dukung"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dukung {participantName}</DialogTitle>
          <DialogDescription>
            Setiap akun hanya bisa memberi 1 vote seumur event.
          </DialogDescription>
        </DialogHeader>
        <VoterFormFields data={voter.data} onChange={voter.setData} />
        <Button onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirim Dukungan
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function QuestCard({
  quest,
  participantId,
  participantName,
  voter,
  locked,
  gate,
  disabled,
}: {
  quest: Quest;
  participantId: string;
  participantName: string;
  voter: VoterCtx;
  /** Voter login + onboarded: dialog hanya untuk bukti, tanpa form data. */
  locked: boolean;
  /** Belum boleh mengerjakan quest — tombol mengalihkan. */
  gate: (() => void) | null;
  disabled: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [links, setLinks] = React.useState<string[]>([""]);
  const [contentId, setContentId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const isLink = quest.proof_type === "link";
  const needsContent = !!quest.content_kind;

  // Participant contents to choose from (only for content-kind quests).
  const { data: contents } = useParticipantContents(
    needsContent ? participantId : undefined
  );
  const allOptions = (contents ?? []).filter(
    (c) => c.kind === quest.content_kind
  );
  // Which of those this voter already completed (by email).
  const { data: doneIds } = useDoneContentIds(
    needsContent ? participantId : "",
    needsContent ? quest.id : "",
    voter.data.email
  );
  const doneSet = new Set(doneIds ?? []);
  const remaining = allOptions.filter((c) => !doneSet.has(c.id));

  function submit() {
    if (needsContent && !contentId) {
      toast.error("Pilih konten peserta dulu.");
      return;
    }
    if (locked) {
      void doSubmit();
      return;
    }
    const err = validateVoter(voter.data);
    if (err) {
      toast.error(err);
      return;
    }
    confirm({
      title: "Pastikan data kamu benar",
      description: `Nama: ${voter.data.name}\nNomor WhatsApp: ${voter.data.phone_number}\nEmail: ${voter.data.email}\n\nData ini dipakai panitia untuk menghubungimu jika kamu mendapatkan reward. Pastikan benar - tidak bisa diubah setelah dikirim.`,
      confirmText: "Saya Yakin, Kirim",
      onConfirm: doSubmit,
    });
  }

  async function doSubmit() {
    setBusy(true);
    try {
      let proofUrls: string[] = [];
      if (isLink) {
        const clean = links.map((l) => l.trim()).filter(Boolean);
        if (clean.length === 0 || clean.some((l) => !/^https?:\/\/.+/i.test(l))) {
          toast.error("Masukkan link postingan yang valid (mulai http).");
          return;
        }
        proofUrls = clean;
      } else {
        if (files.length === 0) {
          toast.error("Pilih minimal 1 file bukti.");
          return;
        }
        for (const f of files) {
          // Proof cuma untuk verifikasi admin — kompres kecil (tekan egress).
          const upFile = await compressImage(f, { maxSize: 900, quality: 0.7 });
          const fd = new FormData();
          fd.append("file", upFile);
          try {
            const up = await api<{ url: string }>("/api/upload-proof", {
              method: "POST",
              body: fd,
            });
            proofUrls.push(new URL(up.url, window.location.origin).toString());
          } catch (err) {
            toast.error(
              "Gagal mengunggah: " + (err instanceof Error ? err.message : "")
            );
            return;
          }
        }
      }

      if (proofUrls.length > 5) {
        toast.error("Maksimal 5 bukti.");
        return;
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...voter.data,
          participant_id: participantId,
          quest_id: quest.id,
          proof_urls: proofUrls,
          content_id: needsContent ? contentId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error((Array.isArray(data.message) ? data.message[0] : data.message) ?? data.error ?? "Gagal mengirim submission.");
        return;
      }
      voter.persist(voter.data);
      toast.success("Bukti terkirim! Akan direview admin sebelum poin masuk.");
      setOpen(false);
      setFiles([]);
      setLinks([""]);
      setContentId("");
      qc.invalidateQueries({ queryKey: ["done-content"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="truncate">{quest.name}</span>
          <Badge variant="accent">+{quest.point}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quest.frequency === "daily" && (
          <Badge variant="warning">Harian · bisa diulang tiap hari</Badge>
        )}
        <p className="min-h-[2.5rem] whitespace-pre-line text-sm text-muted-foreground">
          {quest.description || "Selesaikan quest untuk poin tambahan."}
        </p>
        {quest.ref_image && (
          <a href={quest.ref_image} target="_blank" rel="noopener noreferrer">
            <Image
              src={quest.ref_image}
              alt="Referensi"
              width={400}
              height={160}
              sizes="400px"
              className="max-h-40 w-full rounded-md border object-cover"
            />
          </a>
        )}
        {quest.ref_link && (
          <a
            href={quest.ref_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <LinkIcon className="h-4 w-4" /> Buka arahan / akun
          </a>
        )}
        {needsContent && allOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Peserta belum menambahkan konten untuk quest ini.
          </p>
        )}
        {needsContent && allOptions.length > 0 && remaining.length === 0 && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-4 w-4" /> Semua konten sudah dikerjakan
          </Badge>
        )}
        <Dialog open={open} onOpenChange={(o) => !gate && setOpen(o)}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="accent"
              className="w-full"
              onClick={(e) => {
                if (gate) {
                  e.preventDefault();
                  gate();
                }
              }}
              disabled={
                disabled ||
                (needsContent &&
                  (allOptions.length === 0 || remaining.length === 0))
              }
            >
              {isLink ? <LinkIcon className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {disabled ? "Event ditutup" : "Kerjakan Quest"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{quest.name}</DialogTitle>
              <DialogDescription>
                Untuk {participantName} · +{quest.point} poin. Direview admin
                dulu sebelum poin masuk.
              </DialogDescription>
            </DialogHeader>

            {needsContent && (
              <div className="space-y-1.5">
                <Label>
                  Pilih konten peserta{" "}
                  {quest.content_kind === "sound"
                    ? "(sumber sound)"
                    : "(untuk like/komen/repost)"}
                </Label>
                <div className="space-y-2">
                  {allOptions.map((c, i) => {
                    const done = doneSet.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                          done
                            ? "opacity-60"
                            : contentId === c.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name={`content-${quest.id}`}
                          disabled={done}
                          checked={contentId === c.id}
                          onChange={() => setContentId(c.id)}
                        />
                        <span className="min-w-0 flex-1 font-medium">
                          Konten {i + 1}
                        </span>
                        {done ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sudah
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" /> Buka
                            </a>
                          </Button>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Buka kontennya,{" "}
                  {quest.content_kind === "sound"
                    ? "buat konten pakai sound itu, lalu kirim link kontenmu."
                    : "lakukan like/komen/repost, lalu upload screenshot."}
                </p>
              </div>
            )}

            {!locked && (
              <VoterFormFields data={voter.data} onChange={voter.setData} />
            )}
            {isLink ? (
              <div className="space-y-1.5">
                <Label>Link Postingan (boleh lebih dari 1, maks 5)</Label>
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://www.instagram.com/p/..."
                      value={l}
                      onChange={(e) =>
                        setLinks((arr) =>
                          arr.map((x, j) => (j === i ? e.target.value : x))
                        )
                      }
                    />
                    {links.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-destructive"
                        onClick={() =>
                          setLinks((arr) => arr.filter((_, j) => j !== i))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {links.length < 5 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLinks((arr) => [...arr, ""])}
                  >
                    <Plus className="h-4 w-4" /> Tambah link
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>File Bukti (boleh lebih dari 1, maks 5)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={files.length >= 5}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    setFiles((prev) => {
                      const merged = [...prev];
                      for (const f of picked) {
                        if (
                          merged.length < 5 &&
                          !merged.some(
                            (x) => x.name === f.name && x.size === f.size
                          )
                        )
                          merged.push(f);
                      }
                      return merged;
                    });
                    e.target.value = ""; // reset agar bisa pilih lagi / file sama
                  }}
                />
                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                      >
                        <span className="min-w-0 truncate">{f.name}</span>
                        <button
                          type="button"
                          className="shrink-0 text-destructive"
                          onClick={() =>
                            setFiles((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                    <li className="text-xs text-muted-foreground">
                      {files.length}/5 file
                    </li>
                  </ul>
                )}
              </div>
            )}
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim Bukti
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
