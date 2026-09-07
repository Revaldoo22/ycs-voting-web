"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  Clock,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Render teks jawaban model apa adanya, kecuali penebalan dan daftar.
 *
 * Model kadang membalas dengan markdown ringan. Menampilkannya mentah
 * membuat tanda bintang bertaburan di layar, tapi memasang pustaka markdown
 * lengkap terlalu berat untuk gelembung chat, jadi hanya dua pola yang
 * paling sering muncul yang diproses.
 */
function Jawaban({ text }: { text: string }) {
  const baris = text.split("\n").filter((b) => b.trim() !== "");
  return (
    <div className="space-y-1.5">
      {baris.map((b, i) => {
        const daftar = /^\s*(?:[-*]|\d+\.)\s+/.test(b);
        const isi = b.replace(/^\s*(?:[-*]|\d+\.)\s+/, "");
        const potong = isi.split(/(\*\*[^*]+\*\*)/g);
        const teks = potong.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <React.Fragment key={j}>{p}</React.Fragment>
          ),
        );
        return daftar ? (
          <div key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
            <span>{teks}</span>
          </div>
        ) : (
          <p key={i}>{teks}</p>
        );
      })}
    </div>
  );
}

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
  const areaRef = React.useRef<HTMLTextAreaElement>(null);

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

  React.useEffect(() => {
    if (tunggu <= 0) return;
    const t = setInterval(() => setTunggu((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [tunggu]);

  React.useEffect(() => {
    if (open) akhirRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open, busy]);

  // Esc menutup panel, kebiasaan yang diharapkan dari elemen melayang.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Kotak tanya tumbuh mengikuti isi, dibatasi supaya tidak menelan panel.
  function ukurUlang() {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || busy || tunggu > 0) return;

    const riwayat = turns;
    setTurns([...riwayat, { role: "user", content: isi }]);
    setDraft("");
    requestAnimationFrame(ukurUlang);
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
      <button
        onClick={() => setOpen(true)}
        aria-label="Tanya fitur halaman ini"
        className={cn(
          "group fixed right-5 bottom-5 z-40 flex items-center gap-2.5",
          "rounded-full bg-primary py-3 pr-5 pl-4 text-primary-foreground",
          "shadow-lg shadow-primary/25 ring-1 ring-white/15",
          "transition-all hover:-translate-y-0.5 hover:shadow-xl",
          "hover:shadow-primary/30 active:translate-y-0",
        )}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          {/* Lingkaran halus yang membesar saat disorot, bukan denyut terus
              menerus: animasi tanpa henti di sudut layar mengganggu panitia
              yang sedang membaca tabel. */}
          <span className="absolute inset-0 scale-0 rounded-full bg-white/20 transition-transform duration-300 group-hover:scale-150" />
          <Sparkles className="relative h-5 w-5" />
        </span>
        <span className="text-sm font-semibold">Tanya Fitur</span>
      </button>
    );
  }

  const kosong = turns.length === 0;

  return (
    <>
      {/* Lapisan gelap hanya di layar kecil: di sana panel menutupi hampir
          seluruh layar, jadi perlu jelas bahwa latar sedang tidak aktif. */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm sm:hidden"
      />

      <div
        className={cn(
          "fixed z-40 flex flex-col overflow-hidden",
          "rounded-2xl border bg-background/95 backdrop-blur-xl",
          "shadow-2xl shadow-black/10 ring-1 ring-black/5",
          "inset-x-3 bottom-3 max-h-[78vh]",
          "sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[27rem]",
        )}
      >
        {/* Kepala */}
        <div className="relative border-b bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">Tanya Fitur</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ctx ? ctx.title : "Memuat halaman..."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {!kosong && (
                <button
                  onClick={() => setTurns([])}
                  title="Mulai ulang percakapan"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Isi percakapan */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {kosong && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {ctx?.summary ??
                  "Tanya apa saja soal fitur di halaman yang sedang dibuka."}
              </p>
              {ctx && ctx.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Coba tanyakan
                  </p>
                  {ctx.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => kirim(s)}
                      disabled={busy || tunggu > 0}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-xl border",
                        "bg-card px-3 py-2.5 text-left text-sm transition-all",
                        "hover:border-primary/40 hover:bg-primary/5",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      <span className="flex-1">{s}</span>
                      <ArrowUp className="h-3.5 w-3.5 shrink-0 rotate-45 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {turns.map((t, i) =>
            t.role === "user" ? (
              <div
                key={i}
                className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm"
              >
                {t.content}
              </div>
            ) : (
              <div key={i} className="flex max-w-[92%] gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 text-sm leading-relaxed">
                  <Jawaban text={t.content} />
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-center gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-3.5 py-3">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={akhirRef} />
        </div>

        {/* Peringatan kuota */}
        {tunggu > 0 ? (
          <div className="flex items-center gap-2 border-t border-amber-200/60 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Kuota penuh. Bisa tanya lagi dalam{" "}
              <span className="font-semibold tabular-nums">{tunggu}</span> detik.
            </span>
          </div>
        ) : sisaToken !== null && sisaToken < AMBANG_TOKEN ? (
          <div className="border-t border-amber-200/60 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
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
          className="border-t p-3"
        >
          <div
            className={cn(
              "flex items-end gap-2 rounded-xl border bg-card p-1.5",
              "transition-colors focus-within:border-primary/50",
              "focus-within:ring-[3px] focus-within:ring-ring/25",
            )}
          >
            <textarea
              ref={areaRef}
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                ukurUlang();
              }}
              onKeyDown={(e) => {
                // Enter mengirim, Shift+Enter baris baru: pertanyaan panitia
                // hampir selalu satu baris.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  kirim(draft);
                }
              }}
              placeholder={
                tunggu > 0
                  ? `Tunggu ${tunggu} detik...`
                  : "Tanya fitur halaman ini"
              }
              disabled={busy || tunggu > 0}
              className={cn(
                "max-h-[120px] min-h-9 flex-1 resize-none bg-transparent",
                "px-2 py-1.5 text-sm outline-none",
                "placeholder:text-muted-foreground disabled:opacity-60",
              )}
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              disabled={busy || tunggu > 0 || !draft.trim()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            Jawaban dibuat AI, jadi periksa lagi kalau menyangkut keputusan
            penting.
          </p>
        </form>
      </div>
    </>
  );
}
