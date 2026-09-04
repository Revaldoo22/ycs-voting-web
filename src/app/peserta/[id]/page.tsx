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
import { CheckCircle2, ExternalLink, Medal, Zap } from "lucide-react";
import { api } from "@/lib/api-client";
import { getFingerprint } from "@/lib/fingerprint";
import { compressImage } from "@/lib/image-compress";
import { cn, formatNumber, trackEvent } from "@/lib/utils";
import { voterInfoSchema } from "@/lib/validations";
import {
  VoterFormFields,
  useVoterForm,
  type VoterFormData,
} from "@/components/voter-form-fields";
import { useConfirm } from "@/components/confirm-dialog";
import { PhotoLightbox } from "@/components/photo-lightbox";
import {
  ClaimCouponDialog,
  useFollowTasks,
} from "@/components/claim-coupon-dialog";
import type { ParticipantWithSchool, Quest } from "@/types/database";
import { useTranslation } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/types";

export default function PublicParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation("peserta");
  // Pop-up zoom foto peserta (latar halaman diblur).
  const [photoOpen, setPhotoOpen] = React.useState(false);
  // Dialog klaim kupon undian (syarat follow + upload bukti).
  const [claimOpen, setClaimOpen] = React.useState(false);
  // Dialog penawaran ("teaser"), muncul dengan jeda setelah vote sukses,
  // sebelum syarat klaim ditampilkan. Kalau ditutup tanpa klaim, CTA
  // persisten di card (berbasis status followed, bukan state lokal) tetap
  // menawarkan klaim kapan saja, termasuk setelah reload halaman.
  const [teaserOpen, setTeaserOpen] = React.useState(false);
  const anonVoter = useVoterForm();
  const { data: me } = useMyProfile();
  const { data: quests } = useQuests(true);
  const { data: settings } = useSettings();
  const eventClosed = settings ? !settings.event_open : false;

  // Vote milik akun ini, untuk label "sudah kamu vote" di peserta terkait.
  const { data: myVotes } = useVoterToday(!!me);
  const myVote = (myVotes?.votes ?? []).find((v) => v.participant_id === id);
  const votedThis = !!myVote;
  const votePending = myVote?.status === "pending";

  const router = useRouter();

  // Aksi dukung/quest wajib login sebagai pendukung.
  // gate = null berarti boleh lanjut; selain itu fungsi pengalihan.
  // Peserta (voter yang email-nya cocok record peserta) TETAP boleh vote
  // peserta lain, yang diblok hanya vote ke DIRINYA sendiri. Akun admin
  // sungguhan tidak boleh vote sama sekali.
  const isSelf = !!me && me.self_participant_id === id;
  const gate: (() => void) | null = !me
    ? () => router.push(`/login?next=/peserta/${id}`)
    : me.role === "admin"
      ? () => toast.error(t.adminCannotVote)
      : me.role === "voter" && !me.onboarded
        ? () => router.push("/onboarding")
        : isSelf
          ? () => toast.error(t.cannotVoteSelf)
          : null;

  // Identitas voter otomatis (tanpa form manual) untuk:
  //  - voter yang sudah lengkapi wizard onboarding, ATAU
  //  - peserta (email akun cocok record peserta) → status "peserta".
  const isParticipant = !!me?.is_participant;
  const locked = !!me && ((me.role === "voter" && me.onboarded) || isParticipant);
  const followed = !!me?.followed;
  const waFollowed = !!me?.wa_followed;
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

  // Peserta yang sudah lolos gelombang atau Golden Buzzer berhenti
  // berkompetisi: vote & quest ditutup (backend juga menolaknya dengan
  // ALREADY_QUALIFIED / GOLDEN_BUZZER).
  const isGolden = !!participant?.golden_buzzer;
  const isQualified = !!participant?.qualified || isGolden;

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
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Button>

        {eventClosed && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm font-medium text-destructive">
            {settings?.closed_message ?? t.eventClosedDefault}
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
          <EmptyState title={t.notFound} />
        ) : (
          <>
            <Card className="overflow-hidden">
              {participant.photo_url && (
                <button
                  type="button"
                  onClick={() => setPhotoOpen(true)}
                  aria-label={t.zoomPhoto(participant.name)}
                  className="relative block aspect-video w-full cursor-zoom-in overflow-hidden bg-muted"
                >
                  <Image
                    src={participant.photo_url}
                    alt={participant.name}
                    fill
                    sizes="(max-width:768px) 100vw, 768px"
                    className="object-cover"
                    // Foto di-serve via redirect 302 ke signed URL storage
                    // (berbatas waktu), optimizer Next gagal; pakai apa adanya.
                    unoptimized
                  />
                </button>
              )}
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      participant.photo_url && setPhotoOpen(true)
                    }
                    className={participant.photo_url ? "cursor-zoom-in" : undefined}
                    aria-label={
                      participant.photo_url
                        ? t.zoomPhoto(participant.name)
                        : undefined
                    }
                  >
                    <Avatar className="h-16 w-16 border-2">
                      {participant.photo_url && (
                        <AvatarImage src={participant.photo_url} alt={participant.name} />
                      )}
                      <AvatarFallback className="text-lg">
                        {participant.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
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
                  {/* Poin gelombang berjalan diutamakan supaya angkanya sama
                      dengan klasemen; total poin event tetap ditampilkan
                      sebagai keterangan. */}
                  <div className="shrink-0 text-right">
                    <Badge variant="accent">
                      {formatNumber(
                        participant.round_points ?? participant.total_points,
                      )}{" "}
                      {t.points}
                    </Badge>
                    {participant.round_points != null && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {participant.round_name
                          ? t.pointsInRound(participant.round_name)
                          : null}
                        <span className="block">
                          {t.pointsTotal(
                            formatNumber(participant.total_points),
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {participant.description && (
                  <p className="text-sm">{participant.description}</p>
                )}

                <ShareButton name={participant.name} />

                {/* Peserta yang sudah aman: seluruh area vote diganti panel
                    perayaan, tak ada tombol dukung sama sekali. */}
                {isGolden || isQualified ? (
                  <WinnerBanner
                    kind={isGolden ? "golden" : "round"}
                    roundName={participant.qualified_round_name}
                  />
                ) : votedThis ? (
                  <>
                  {votePending ? (
                    /* Panel menetap, bukan bar satu baris: toast sukses cuma
                       muncul beberapa detik, padahal instruksinya (tunggu 24
                       jam, cek lonceng) justru perlu terbaca kapan saja voter
                       membuka halaman ini. */
                    <div className="w-full space-y-1.5 rounded-xl border border-amber-400/50 bg-amber-500/10 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        {t.pendingNoticeTitle}
                      </p>
                      <p className="text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                        {t.pendingNoticeBody}
                      </p>
                      <p className="text-xs leading-relaxed text-amber-900/70 dark:text-amber-200/70">
                        {t.pendingNoticeRejected}
                      </p>
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2.5 text-sm font-bold text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]">
                      <BadgeCheck className="h-4 w-4" />
                      {t.votedThanks}
                    </div>
                  )}
                  {/* CTA persisten: voter sudah vote tapi belum klaim kupon
                      undian (belum follow IG/TikTok), tetap tersedia walau
                      dialog penawaran sudah ditutup atau halaman di-reload. */}
                  {!isParticipant && !followed && (
                    <button
                      type="button"
                      onClick={() => setClaimOpen(true)}
                      className="group relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/60 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 p-4 text-center shadow-md shadow-amber-500/10 transition-transform active:scale-[0.98] dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 sm:flex-row sm:gap-3 sm:rounded-xl sm:p-3 sm:text-left sm:shadow-none sm:hover:scale-[1.01]"
                    >
                      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/20 blur-xl sm:hidden" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/hp.png"
                        alt=""
                        className="h-20 w-20 shrink-0 object-contain drop-shadow-sm sm:h-12 sm:w-12"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-extrabold leading-tight sm:truncate sm:text-sm">
                          {t.claimCtaCard}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground sm:truncate">
                          {t.claimCtaCardDesc}
                        </p>
                      </div>
                      <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm sm:mt-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-primary sm:shadow-none">
                        {t.claimTeaserCta} →
                      </span>
                    </button>
                  )}
                  </>
                ) : (
                  <VoteDialog
                    participantId={id}
                    participantName={participant.name}
                    voter={voter}
                    locked={locked}
                    waFollowed={waFollowed || isParticipant}
                    gate={gate}
                    disabled={eventClosed || isQualified}
                    disabledReason={
                      isGolden
                        ? t.goldenNoVote
                        : isQualified
                          ? t.qualifiedNoVote
                          : undefined
                    }
                    onVoted={() => {
                      refetch();
                      // Kupon undian sudah otomatis untuk peserta YCS / voter
                      // yang follow IG/TikTok-nya sudah terverifikasi, selain
                      // itu, tawarkan klaim kupon lewat dialog penawaran dulu
                      // (jeda sedikit biar tidak langsung menimpa toast sukses
                      // vote), baru syarat follow muncul kalau diklik klaim.
                      if (!isParticipant && !followed) {
                        setTimeout(() => setTeaserOpen(true), 800);
                      }
                    }}
                  />
                )}
                <p className="text-center text-xs text-muted-foreground">
                  {t.oneVotePerAccount}
                </p>
              </CardContent>
            </Card>

            {participant.photo_url && (
              <PhotoLightbox
                src={participant.photo_url}
                alt={participant.name}
                open={photoOpen}
                onClose={() => setPhotoOpen(false)}
              />
            )}

            <ClaimTeaserDialog
              open={teaserOpen}
              onOpenChange={setTeaserOpen}
              onClaim={() => {
                setTeaserOpen(false);
                setClaimOpen(true);
              }}
            />

            <ClaimCouponDialog
              open={claimOpen}
              onOpenChange={setClaimOpen}
              onClaimed={() => refetch()}
            />

            {quests && quests.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Trophy className="h-5 w-5 text-accent" />
                {t.questSectionTitle(participant.name)}
              </h3>
              {false ? (
                <EmptyState title={t.emptyActiveQuest} />
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
                      disabled={eventClosed || isQualified}
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
 * Tugas follow 2 saluran WhatsApp, syarat VOTE pertama (wajib sebelum vote
 * diterima). Key HARUS sinkron dengan REQUIRED_FOLLOW_TASKS di backend.
 */
const WA_FOLLOW_TASK_URLS = [
  "https://whatsapp.com/channel/0029VaYIG217oQhhUoA3a915",
  "https://whatsapp.com/channel/0029Vb5vVIaId7nEqecJ1I1G",
];
const WA_FOLLOW_TASK_KEYS = ["wa_stekom", "wa_ycs"];

function useWaFollowTasks(t: Dictionary["peserta"]) {
  return t.waFollowTasks.map((task, i) => ({
    key: WA_FOLLOW_TASK_KEYS[i],
    title: task.title,
    url: WA_FOLLOW_TASK_URLS[i],
    linkLabel: task.linkLabel,
  }));
}

function validateVoter(data: VoterFormData, t: Dictionary["peserta"]): string | null {
  const r = voterInfoSchema.safeParse(data);
  return r.success ? null : r.error.issues[0]?.message ?? t.incompleteData;
}

/**
 * Dialog penawaran ("teaser"), muncul dengan jeda setelah vote sukses,
 * SEBELUM syarat follow ditampilkan. Tujuannya membuat ajakan klaim kupon
 * terasa seperti hadiah, bukan langsung dibebani syarat. "Klaim Sekarang"
 * membuka ClaimCouponDialog (syarat follow); ditutup (X) tidak menghilangkan
 * kesempatan, CTA persisten tetap muncul di card peserta.
 */
function ClaimTeaserDialog({
  open,
  onOpenChange,
  onClaim,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaim: () => void;
}) {
  const t = useTranslation("peserta");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hp.png"
          alt=""
          className="mx-auto h-28 w-28 object-contain"
        />
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {t.claimTeaserTitle}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t.claimTeaserBody}
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full" onClick={onClaim}>
          {t.claimTeaserCta}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          {t.claimTeaserLater}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ShareButton({ name }: { name: string }) {
  const t = useTranslation("peserta");
  // Langsung buka WhatsApp dengan pesan siap kirim (saluran di baris atas),
  // lalu user tinggal memilih mau dikirim ke siapa.
  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const msg = [
      "https://whatsapp.com/channel/0029VaYIG217oQhhUoA3a915",
      "",
      t.shareMessage(name),
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
      <Share2 className="h-4 w-4" /> {t.shareProfile}
    </Button>
  );
}

/**
 * Panel perayaan untuk peserta yang sudah aman. Menggantikan seluruh area
 * vote & quest: peserta ini tidak menerima dukungan lagi, jadi menampilkan
 * tombol yang mati hanya bikin bingung.
 */
function WinnerBanner({
  kind,
  roundName,
}: {
  kind: "golden" | "round";
  roundName?: string | null;
}) {
  const t = useTranslation("peserta");
  const golden = kind === "golden";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-6 text-center",
        golden
          ? "border-amber-400/70 bg-gradient-to-b from-amber-50 to-amber-100/40 dark:from-amber-500/10 dark:to-amber-500/5"
          : "border-emerald-500/50 bg-gradient-to-b from-emerald-50 to-emerald-100/40 dark:from-emerald-500/10 dark:to-emerald-500/5",
      )}
    >
      {/* Cahaya latar, murni hiasan */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl",
          golden ? "bg-amber-400/30" : "bg-emerald-400/25",
        )}
      />

      <div className="relative space-y-3">
        <span
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg",
            golden
              ? "bg-gradient-to-br from-amber-400 to-yellow-300 shadow-amber-400/40"
              : "bg-gradient-to-br from-emerald-500 to-teal-400 shadow-emerald-500/40",
          )}
        >
          {golden ? (
            <Zap className="h-8 w-8 text-white" />
          ) : (
            <Medal className="h-8 w-8 text-white" />
          )}
        </span>

        <div>
          <p
            className={cn(
              "text-xl font-extrabold tracking-tight",
              golden
                ? "text-amber-700 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {golden ? t.goldenCelebrateTitle : t.qualifiedCelebrateTitle}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {golden
              ? t.goldenCelebrateDesc
              : t.qualifiedCelebrateDesc(roundName ?? "")}
          </p>
        </div>

        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold",
            golden
              ? "bg-amber-500 text-white"
              : "bg-emerald-600 text-white",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {golden ? t.goldenBadgeBig : t.qualifiedBadgeBig}
        </p>

      </div>
    </div>
  );
}

function VoteDialog({
  participantId,
  participantName,
  voter,
  locked,
  waFollowed,
  gate,
  disabled,
  disabledReason,
  onVoted,
}: {
  participantId: string;
  participantName: string;
  voter: VoterCtx;
  /** Voter login + onboarded: identitas dari profil, tanpa form/konfirmasi. */
  locked: boolean;
  /** Sudah pernah konfirmasi follow 2 saluran WA (sekali seumur event). */
  waFollowed: boolean;
  /** Belum boleh vote (belum login / belum wizard / bukan voter). */
  gate: (() => void) | null;
  disabled: boolean;
  /** Teks pengganti saat tombol mati bukan karena event ditutup. */
  disabledReason?: string;
  /** Vote sukses (terkirim, terlepas pending/approved bukti follow WA). */
  onVoted: () => void;
}) {
  const t = useTranslation("peserta");
  const waFollowTasks = useWaFollowTasks(t);
  const [open, setOpen] = React.useState(false);
  const [showWaFollow, setShowWaFollow] = React.useState(false);
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
      // Vote pertama: wajib follow 2 saluran WA dulu (sekali seumur event).
      if (!waFollowed) {
        setShowWaFollow(true);
        return;
      }
      void doSubmit();
      return;
    }
    const err = validateVoter(voter.data, t);
    if (err) {
      toast.error(err);
      return;
    }
    confirm({
      title: t.confirmDataTitle,
      description: t.confirmDataDescription(
        voter.data.name,
        voter.data.phone_number,
        voter.data.email,
      ),
      confirmText: t.confirmSend,
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
      // Follow WA pertama: upload semua screenshot bukti (satu tombol, multi).
      let followProofs: string[] | undefined;
      if (followConfirmed) {
        if (proofFiles.length === 0) {
          toast.error(t.uploadProofFirst);
          return;
        }
        try {
          followProofs = [];
          for (const f of proofFiles) {
            followProofs.push(await uploadProof(f));
          }
        } catch (err) {
          toast.error(
            t.uploadProofFailed(err instanceof Error ? err.message : ""),
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
        toast.error((Array.isArray(data.message) ? data.message[0] : data.message) ?? data.error ?? t.voteFailed);
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
        // Bukti follow WA direview admin dulu, poin masuk setelah di-approve.
        toast.success(t.votePendingSuccess);
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      } else {
        toast.success(t.voteSuccess(pts, participantName));
      }
      setOpen(false);
      setShowWaFollow(false);
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
        {disabled ? (disabledReason ?? t.eventClosed) : t.support}
      </Button>
    );
  }

  // Sudah login: satu klik langsung vote, tanpa dialog isi data.
  if (locked) {
    return (
      <>
      <Dialog open={showWaFollow} onOpenChange={setShowWaFollow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.waFollowDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.waFollowDialogDescription(waFollowTasks.length)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            {waFollowTasks.map((task, i) => (
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

          <Button
            onClick={() => doSubmit(true)}
            disabled={busy || proofFiles.length === 0}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.sendProofAndVoteWa(proofFiles.length)}
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
        {disabled ? (disabledReason ?? t.eventClosed) : t.support}
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
          {disabled ? (disabledReason ?? t.eventClosed) : t.support}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.supportName(participantName)}</DialogTitle>
          <DialogDescription>
            {t.oneVotePerAccount}
          </DialogDescription>
        </DialogHeader>
        <VoterFormFields data={voter.data} onChange={voter.setData} />
        <Button onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.sendSupport}
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
  /** Belum boleh mengerjakan quest, tombol mengalihkan. */
  gate: (() => void) | null;
  disabled: boolean;
}) {
  const t = useTranslation("peserta");
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
      toast.error(t.chooseContentFirst);
      return;
    }
    if (locked) {
      void doSubmit();
      return;
    }
    const err = validateVoter(voter.data, t);
    if (err) {
      toast.error(err);
      return;
    }
    confirm({
      title: t.confirmDataTitle,
      description: t.confirmDataDescription(
        voter.data.name,
        voter.data.phone_number,
        voter.data.email,
      ),
      confirmText: t.confirmSend,
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
          toast.error(t.invalidLink);
          return;
        }
        proofUrls = clean;
      } else {
        if (files.length === 0) {
          toast.error(t.chooseAtLeastOneFile);
          return;
        }
        for (const f of files) {
          // Proof cuma untuk verifikasi admin, kompres kecil (tekan egress).
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
              t.uploadFailed(err instanceof Error ? err.message : "")
            );
            return;
          }
        }
      }

      if (proofUrls.length > 5) {
        toast.error(t.maxProofs);
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
        toast.error((Array.isArray(data.message) ? data.message[0] : data.message) ?? data.error ?? t.submissionFailed);
        return;
      }
      voter.persist(voter.data);
      toast.success(t.submissionSuccess);
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
          <Badge variant="warning">{t.dailyBadge}</Badge>
        )}
        <p className="min-h-[2.5rem] whitespace-pre-line text-sm text-muted-foreground">
          {quest.description || t.defaultQuestDescription}
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
            unoptimized
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
            <LinkIcon className="h-4 w-4" /> {t.openReference}
          </a>
        )}
        {needsContent && allOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t.noContentYet}
          </p>
        )}
        {needsContent && allOptions.length > 0 && remaining.length === 0 && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-4 w-4" /> {t.allContentDone}
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
              {disabled ? t.eventClosed : t.doQuest}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{quest.name}</DialogTitle>
              <DialogDescription>
                {t.forParticipantPoints(participantName, quest.point)}
              </DialogDescription>
            </DialogHeader>

            {needsContent && (
              <div className="space-y-1.5">
                <Label>
                  {t.chooseParticipantContent}{" "}
                  {quest.content_kind === "sound"
                    ? t.forSoundSource
                    : t.forLikeCommentRepost}
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
                          {t.contentN(i + 1)}
                        </span>
                        {done ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t.done}
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
                              <ExternalLink className="h-4 w-4" /> {t.open}
                            </a>
                          </Button>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.openContentThen}{" "}
                  {quest.content_kind === "sound"
                    ? t.makeContentWithSound
                    : t.doLikeCommentRepost}
                </p>
              </div>
            )}

            {!locked && (
              <VoterFormFields data={voter.data} onChange={voter.setData} />
            )}
            {isLink ? (
              <div className="space-y-1.5">
                <Label>{t.postLinkLabel}</Label>
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
                    <Plus className="h-4 w-4" /> {t.addLink}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{t.proofFileLabel}</Label>
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
                      {files.length}/5 {t.files}
                    </li>
                  </ul>
                )}
              </div>
            )}
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.sendProof}
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
