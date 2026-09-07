"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Clock,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

type Ctx = {
  path: string;
  title: string;
  summary: string;
  suggestions: string[];
};

type Jawab = {
  answer: string;
  remaining_tokens: number;
  remaining_requests: number;
};

/** Ambang sisa token untuk memperingatkan sebelum benar-benar kena 429. */
const AMBANG_TOKEN = 1500;

/**
 * Asisten penjelas fitur panel admin.
 *
 * Konteks halaman datang dari server berdasarkan path, bukan disusun di
 * klien: teks itu membentuk prompt, jadi kalau klien boleh mengirimnya
 * sendiri, siapa pun bisa membuat asisten mengarang aturan lalu
 * menampilkannya seolah jawaban resmi.
 */
export function AdminAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [ctx, setCtx] = React.useState<Ctx | null>(null);
  const [sisaToken, setSisaToken] = React.useState<number | null>(null);
  /** Detik tersisa sampai boleh bertanya lagi setelah kena batas kuota. */
  const [tunggu, setTunggu] = React.useState(0);
  const akhirRef = React.useRef<HTMLDivElement>(null);

  // Konteks diminta ulang tiap pindah halaman, dan percakapan direset:
  // pertanyaan lanjutan tentang halaman lama jadi menyesatkan di halaman baru.
  React.useEffect(() => {
    let batal = false;
    setTurns([]);
    setCtx(null);
    api<Ctx>(
      `/api/admin/assistant/context?path=${encodeURIComponent(pathname)}`,
    )
      .then((d) => {
        if (!batal) setCtx(d);
      })
      .catch(() => {
        // Konteks gagal dimuat bukan alasan menyembunyikan asisten: panitia
        // masih bisa bertanya, hanya saran pertanyaannya yang tidak muncul.
      });
    return () => {
      batal = true;
    };
  }, [pathname]);

  // Hitungan mundur kuota.
  React.useEffect(() => {
    if (tunggu <= 0) return;
    const t = setInterval(() => setTunggu((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [tunggu]);

  React.useEffect(() => {
    if (open) akhirRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open, busy]);

  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || busy || tunggu > 0) return;

    const riwayat = turns;
    setTurns([...riwayat, { role: "user", content: isi }]);
    setDraft("");
    setBusy(true);
    try {
      const res = await api<Jawab>("/api/admin/assistant/ask", {
        method: "POST",
        body: JSON.stringify({ path: pathname, message: isi, history: riwayat }),
      });
      setTurns((t) => [...t, { role: "assistant", content: res.answer }]);
      setSisaToken(
        Number.isFinite(res.remaining_tokens) ? res.remaining_tokens : null,
      );
    } catch (e) {
      const pesan = e instanceof Error ? e.message : "Gagal menjawab.";
      // Batas kuota bukan kerusakan, jadi ditampilkan sebagai pemberitahuan
      // dengan hitungan mundur, bukan sebagai galat.
      const kena = /kuota|rate|limit|429/i.test(pesan);
      if (kena) setTunggu(60);
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: kena
            ? "Kuota tanya asisten sudah penuh. Tunggu 1 menit lagi lalu coba tanya kembali."
            : pesan,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 h-12 gap-2 rounded-full shadow-lg"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline">Tanya Fitur</span>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col rounded-xl border bg-background shadow-2xl",
        "inset-x-3 bottom-3 max-h-[80vh]",
        "sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]",
      )}
    >
      {/* Kepala */}
      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-bold">
            <Sparkles className="h-4 w-4 text-primary" />
            Tanya Fitur
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {ctx ? `Halaman: ${ctx.title}` : "Memuat konteks halaman..."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {turns.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              title="Bersihkan percakapan"
              onClick={() => setTurns([])}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Isi percakapan */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {ctx?.summary ??
                "Tanya apa saja soal fitur di halaman yang sedang dibuka."}
            </p>
            {ctx && ctx.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Pertanyaan untuk halaman ini
                </p>
                {ctx.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => kirim(s)}
                    disabled={busy || tunggu > 0}
                    className={cn(
                      "w-full rounded-lg border p-2.5 text-left text-sm",
                      "hover:bg-muted/60 disabled:opacity-50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              t.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "border bg-muted/40",
            )}
          >
            {t.content}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menyusun jawaban...
          </div>
        )}
        <div ref={akhirRef} />
      </div>

      {/* Peringatan kuota */}
      {tunggu > 0 ? (
        <div className="flex items-center gap-2 border-t bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Clock className="h-4 w-4 shrink-0" />
          Kuota penuh. Bisa tanya lagi dalam {tunggu} detik.
        </div>
      ) : sisaToken !== null && sisaToken < AMBANG_TOKEN ? (
        <div className="border-t bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Kuota menit ini hampir habis. Kalau nanti tertahan, tunggu 1 menit
          lalu coba lagi.
        </div>
      ) : null}

      {/* Kolom tanya */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          kirim(draft);
        }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            tunggu > 0 ? `Tunggu ${tunggu} detik...` : "Tanya fitur halaman ini"
          }
          disabled={busy || tunggu > 0}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || tunggu > 0 || !draft.trim()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
