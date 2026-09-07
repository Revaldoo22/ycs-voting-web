"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  Clock,
  Loader2,
  MessageCirclePlus,
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

/*
 * Catatan tata letak.
 *
 * Chip saran sebelumnya disebar melengkung mengelilingi tombol, meniru
 * tombol aksi melayang yang berisi ikon. Itu tidak berhasil di sini: chip
 * memuat pertanyaan penuh sehingga lebarnya ratusan piksel dan tingginya
 * berubah mengikuti pembungkusan teks, jadi penempatan absolut manapun
 * berakhir saling menabrak. Sekarang dipakai tumpukan biasa yang rata
 * kanan, dan biarkan browser mengatur tingginya sendiri.
 */

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
 * Tiga keadaan: tombol tertutup, kipas pertanyaan saran, dan kartu chat.
 * Menekan sebuah saran langsung membuka kartu chat dan mengirimkannya,
 * sedangkan "Tanya sendiri" membuka kartu dengan kolom kosong.
 *
 * Konteks halaman datang dari server berdasarkan path, bukan disusun di
 * klien: teks itu membentuk prompt, jadi kalau klien boleh mengirimnya
 * sendiri, siapa pun bisa membuat asisten mengarang aturan lalu
 * menampilkannya seolah jawaban resmi.
 */
export function AdminAssistant() {
  const pathname = usePathname();
  /** tutup: hanya tombol. kipas: saran melengkung. chat: kartu percakapan. */
  const [mode, setMode] = React.useState<"tutup" | "kipas" | "chat">("tutup");
  /**
   * Penunda penutupan kipas.
   *
   * Kursor melintasi celah antara tombol dan chip saat bergerak ke atas.
   * Tanpa jeda, kipas menutup tepat di celah itu dan chip tak pernah bisa
   * diklik.
   */
  const tutupRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setMode("tutup");
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
    if (mode === "chat") {
      akhirRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [turns, mode, busy]);

  // Esc menutup, kebiasaan yang diharapkan dari elemen melayang.
  React.useEffect(() => {
    if (mode === "tutup") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("tutup");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  React.useEffect(() => {
    return () => {
      if (tutupRef.current) clearTimeout(tutupRef.current);
    };
  }, []);

  function bukaKipas() {
    if (tutupRef.current) {
      clearTimeout(tutupRef.current);
      tutupRef.current = null;
    }
    // Kipas hanya menimpa keadaan tertutup: kartu chat yang sedang terbuka
    // tidak boleh tergeser hanya karena kursor melewati tombol.
    setMode((m) => (m === "tutup" ? "kipas" : m));
  }

  function tundaTutupKipas() {
    if (tutupRef.current) clearTimeout(tutupRef.current);
    tutupRef.current = setTimeout(() => {
      setMode((m) => (m === "kipas" ? "tutup" : m));
    }, 260);
  }

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

  /** Chip saran ditekan: buka kartu chat lalu kirim langsung. */
  function pilihSaran(s: string) {
    setMode("chat");
    void kirim(s);
  }

  /** "Tanya sendiri": buka kartu dengan kolom kosong dan fokus di situ. */
  function tanyaSendiri() {
    setMode("chat");
    requestAnimationFrame(() => areaRef.current?.focus());
  }

  const saran = ctx?.suggestions ?? [];

  return (
    <>
      {/* Lapisan penutup hanya untuk kartu chat. Kipas tidak memakainya:
          lapisan penuh layar akan menelan hover, sehingga chip tak bisa
          dijangkau kursor. */}
      {mode === "chat" && (
        <div
          onClick={() => setMode("tutup")}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
        />
      )}

      {/* Daftar pertanyaan saran */}
      {mode === "kipas" && (
        <div
          onMouseEnter={bukaKipas}
          onMouseLeave={tundaTutupKipas}
          className={cn(
            "fixed z-40 flex flex-col items-end gap-2",
            // Dibatasi lebarnya, bukan dibiarkan selebar teks: pertanyaan
            // yang panjang akan mendorong chip melewati tepi layar.
            "right-5 bottom-24 w-[min(20rem,calc(100vw-2.5rem))]",
          )}
        >
          {saran.map((s, i) => (
            <button
              key={s}
              onClick={() => pilihSaran(s)}
              disabled={tunggu > 0}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "w-full origin-bottom-right animate-in fade-in",
                "slide-in-from-bottom-2 duration-200",
                // Latar SOLID. Versi sebelumnya memakai bg-card/95 dan
                // teks halaman di belakangnya tembus, membuat chip tak
                // terbaca di atas tabel.
                "rounded-2xl border bg-card px-4 py-3 text-left",
                "text-[13px] leading-relaxed shadow-lg shadow-black/10",
                "transition-colors hover:border-primary/60 hover:bg-primary/5",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {s}
            </button>
          ))}

          {/* Pilihan terakhir: tanya sendiri. Penuh warna supaya jelas
              perannya berbeda dari pertanyaan saran. */}
          <button
            onClick={tanyaSendiri}
            style={{ animationDelay: `${saran.length * 40}ms` }}
            className={cn(
              "flex origin-bottom-right animate-in items-center gap-2",
              "slide-in-from-bottom-2 fade-in rounded-2xl duration-200",
              "bg-primary px-4 py-3 text-[13px] font-semibold",
              "text-primary-foreground shadow-lg shadow-primary/25",
              "transition-shadow hover:shadow-xl hover:shadow-primary/35",
            )}
          >
            <MessageCirclePlus className="h-4 w-4 shrink-0" />
            Tanya sendiri
          </button>
        </div>
      )}

      {/* Kartu chat */}
      {mode === "chat" && (
        <div
          className={cn(
            "fixed z-40 flex flex-col overflow-hidden",
            "rounded-2xl border bg-background/95 backdrop-blur-xl",
            "shadow-2xl shadow-black/10 ring-1 ring-black/5",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
            "inset-x-3 bottom-3 max-h-[78vh]",
            "sm:inset-x-auto sm:right-5 sm:bottom-24 sm:w-[27rem]",
          )}
        >
          {/* Kepala */}
          <div className="border-b bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-4 py-3">
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
                {turns.length > 0 && (
                  <button
                    onClick={() => {
                      setTurns([]);
                      setMode("kipas");
                    }}
                    title="Kembali ke pertanyaan saran"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setMode("tutup")}
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
            {turns.length === 0 && !busy && (
              <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCirclePlus className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium">Isi pertanyaan di bawah</p>
                <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">
                  {ctx?.summary ??
                    "Tanya apa saja soal fitur di halaman yang sedang dibuka."}
                </p>
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
                <span className="font-semibold tabular-nums">{tunggu}</span>{" "}
                detik.
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
                    : "Isi pertanyaan di sini"
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
      )}

      {/* Tombol utama. Selalu ada supaya jadi jangkar visual yang tetap.
          Hover membuka kipas saran, klik langsung membuka kartu chat. */}
      <button
        onMouseEnter={bukaKipas}
        onMouseLeave={tundaTutupKipas}
        onClick={() => setMode((m) => (m === "chat" ? "tutup" : "chat"))}
        aria-label={
          mode === "chat" ? "Tutup asisten" : "Tanya fitur halaman ini"
        }
        className={cn(
          "group fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center",
          "justify-center rounded-full bg-primary text-primary-foreground",
          "shadow-lg shadow-primary/25 ring-1 ring-white/15",
          "transition-all hover:shadow-xl hover:shadow-primary/30",
          "active:scale-95",
        )}
      >
        <span className="absolute inset-0 scale-0 rounded-full bg-white/15 transition-transform duration-300 group-hover:scale-100" />
        {mode === "chat" ? (
          <X className="relative h-6 w-6" />
        ) : (
          <Sparkles className="relative h-6 w-6" />
        )}
      </button>
    </>
  );
}
