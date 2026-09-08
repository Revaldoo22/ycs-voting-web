"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ClipboardCheck,
  Database,
  Flag,
  Gift,
  History,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Medal,
  Menu,
  Coins,
  Megaphone,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  ScrollText,
  Settings,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  Vote,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; icon: typeof LayoutDashboard; items: NavLink[] };

/**
 * Sidebar sedang diringkas jadi ikon saja.
 *
 * Dibagi lewat konteks, bukan prop berantai, karena keadaan ini dibutuhkan
 * di tiga tingkat kedalaman (baris menu, blok grup, dan kerangkanya) dan
 * drawer mobile harus selalu lebar apa pun keadaan di desktop.
 */
const Ringkas = React.createContext(false);

/** Kunci localStorage, supaya pilihan panitia bertahan antar halaman. */
const KUNCI = "ycs.adminSidebar.ringkas";

type CtxSidebar = { ringkas: boolean; toggle: () => void };
const SidebarCtx = React.createContext<CtxSidebar>({
  ringkas: false,
  toggle: () => {},
});

/** Dipakai layout untuk menyesuaikan margin kontennya. */
export function useSidebarRingkas() {
  return React.useContext(SidebarCtx).ringkas;
}

/**
 * Pembungkus keadaan sidebar.
 *
 * Dipisah dari AdminSidebar supaya layout bisa membaca lebarnya tanpa
 * mengandalkan atribut pada elemen html, yang tak bisa dijangkau selektor
 * Tailwind dari elemen anak.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [ringkas, setRingkas] = React.useState(false);

  // Dibaca setelah render pertama, bukan sebagai nilai awal state: nilai
  // awal dipakai server saat render dan localStorage tak ada di sana.
  React.useEffect(() => {
    try {
      if (localStorage.getItem(KUNCI) === "1") setRingkas(true);
    } catch {
      // Penyimpanan diblokir browser: sidebar tetap jalan dengan lebar biasa.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setRingkas((r) => {
      const next = !r;
      try {
        localStorage.setItem(KUNCI, next ? "1" : "0");
      } catch {
        // Pilihan tidak bertahan, tapi sidebar tetap berfungsi.
      }
      return next;
    });
  }, []);

  const nilai = React.useMemo(() => ({ ringkas, toggle }), [ringkas, toggle]);
  return <SidebarCtx.Provider value={nilai}>{children}</SidebarCtx.Provider>;
}

// Item tunggal (tanpa grup) di paling atas.
const TOP: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
];

// Grup accordion.
const GROUPS: NavGroup[] = [
  {
    label: "Kompetisi",
    icon: LayoutGrid,
    items: [
      { href: "/admin/rounds", label: "Gelombang", icon: Flag },
      { href: "/admin/hasil", label: "Hasil Lolos", icon: Medal },
      { href: "/admin/golden-buzzer", label: "Golden Buzzer", icon: Zap },
      { href: "/admin/quests", label: "Quest", icon: Trophy },
      { href: "/admin/submissions", label: "Submission", icon: ClipboardCheck },
      { href: "/admin/votes", label: "Verifikasi Vote", icon: Vote },
      { href: "/admin/kupon-klaim", label: "Verifikasi Klaim Kupon", icon: Ticket },
    ],
  },
  {
    label: "Data",
    icon: Database,
    items: [
      { href: "/admin/participants", label: "Peserta", icon: GraduationCap },
      { href: "/admin/schools", label: "Sekolah", icon: School },
      { href: "/admin/voters", label: "Voter", icon: Users },
      { href: "/admin/daerah", label: "Daerah", icon: MapPin },
      { href: "/admin/leads", label: "Leads PMB", icon: UserPlus },
    ],
  },
  {
    label: "Lainnya",
    icon: MoreHorizontal,
    items: [
      { href: "/admin/kupon", label: "Daftar Kupon", icon: Ticket },
      { href: "/admin/undian", label: "Undian", icon: Gift },
      { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
      { href: "/admin/poin", label: "Penyesuaian Poin", icon: Coins },
      { href: "/admin/spin-log", label: "Log Spin", icon: History },
      { href: "/admin/klaim-hadiah", label: "Klaim Hadiah", icon: Package },
      { href: "/admin/setting", label: "Pengaturan", icon: Settings },
      { href: "/admin/log", label: "Log Aktivitas", icon: ScrollText },
    ],
  },
];

const ALL_LINKS: NavLink[] = [...TOP, ...GROUPS.flatMap((g) => g.items)];

function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Berhasil keluar.");
    router.push("/login");
    router.refresh();
  };
}

function NavLinkRow({
  link,
  active,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;
  const ringkas = React.useContext(Ringkas);
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      // title dipakai sebagai tooltip saat label disembunyikan: itu satu
      // satunya cara panitia tahu ikon mana yang mana.
      title={ringkas ? link.label : undefined}
      className={cn(
        "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
        ringkas ? "justify-center px-2" : "gap-3 px-3",
        active
          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!ringkas && link.label}
    </Link>
  );
}

function NavGroupBlock({
  group,
  activeHref,
  onNavigate,
}: {
  group: NavGroup;
  activeHref: string;
  onNavigate?: () => void;
}) {
  const hasActive = group.items.some((i) => i.href === activeHref);
  const [open, setOpen] = React.useState(hasActive);
  const GroupIcon = group.icon;
  const ringkas = React.useContext(Ringkas);

  // Buka grup otomatis saat halaman aktif pindah ke dalamnya.
  React.useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  // Saat ringkas, keadaan buka/tutup grup tetap dihormati: yang sudah
  // terbuka sebelum diringkas tetap menampilkan isinya, yang tertutup tetap
  // menyisakan ikon grupnya saja. Memaksa semuanya tertutup membuat panitia
  // kehilangan menu yang sengaja dia biarkan terbuka.
  if (ringkas) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          title={
            open ? `${group.label} (tutup)` : `${group.label} (buka)`
          }
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-center rounded-lg px-2 py-2",
            "transition-colors",
            hasActive
              ? "text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <GroupIcon className="h-4 w-4 shrink-0" />
        </button>
        {open &&
          group.items.map((l) => (
            <NavLinkRow
              key={l.href}
              link={l}
              active={l.href === activeHref}
              onNavigate={onNavigate}
            />
          ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-1 pl-2">
          {group.items.map((l) => (
            <NavLinkRow
              key={l.href}
              link={l}
              active={l.href === activeHref}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // Link aktif = match terpanjang, batas segmen (cegah /admin nyala di /admin/x).
  const matchLen = (href: string) => {
    if (pathname === href) return href.length;
    if (pathname.startsWith(href + "/")) return href.length;
    return -1;
  };
  const activeHref = ALL_LINKS.reduce(
    (best, l) => (matchLen(l.href) > matchLen(best) ? l.href : best),
    "",
  );

  return (
    <nav className="flex-1 space-y-2 overflow-y-auto p-3">
      <div className="space-y-1">
        {TOP.map((l) => (
          <NavLinkRow
            key={l.href}
            link={l}
            active={l.href === activeHref}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      {GROUPS.map((g) => (
        <NavGroupBlock
          key={g.label}
          group={g}
          activeHref={activeHref}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function SidebarInner({
  onNavigate,
  onToggleRingkas,
}: {
  onNavigate?: () => void;
  /** Hanya diisi di desktop: drawer mobile selalu lebar. */
  onToggleRingkas?: () => void;
}) {
  const logout = useLogout();
  const ringkas = React.useContext(Ringkas);

  return (
    <div className="flex h-full flex-col">
      {/* Kepala: logo, dan tombol ringkas di ujung kanannya. */}
      <div
        className={cn(
          "flex items-center border-b border-border/60 py-4",
          ringkas ? "flex-col gap-3 px-2" : "gap-2 px-4",
        )}
      >
        <Link
          href="/"
          title={ringkas ? "Youth Character Summit" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={onNavigate}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          {!ringkas && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight">
                Youth Character Summit
              </span>
              <span className="block text-xs text-muted-foreground">
                Panel Admin
              </span>
            </span>
          )}
        </Link>
        {onToggleRingkas && (
          <button
            onClick={onToggleRingkas}
            aria-label={ringkas ? "Perlebar sidebar" : "Ringkas sidebar"}
            title={ringkas ? "Perlebar sidebar" : "Ringkas sidebar"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "text-muted-foreground transition-colors hover:bg-muted",
              "hover:text-foreground",
            )}
          >
            {ringkas ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <NavItems onNavigate={onNavigate} />

      <div className={cn("border-t border-border/60", ringkas ? "p-2" : "p-3")}>
        <Button
          variant="outline"
          title={ringkas ? "Keluar" : undefined}
          className={cn(
            "w-full text-destructive hover:bg-destructive/5",
            ringkas ? "justify-center px-2" : "justify-start",
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!ringkas && "Keluar"}
        </Button>
      </div>
    </div>
  );
}

/** Sidebar admin: tetap di desktop, drawer di mobile. */
export function AdminSidebar() {
  const [open, setOpen] = React.useState(false);
  const { ringkas, toggle } = React.useContext(SidebarCtx);

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/60",
          "bg-card transition-[width] duration-200 lg:block",
          ringkas ? "w-16" : "w-60",
        )}
      >
        <Ringkas.Provider value={ringkas}>
          <SidebarInner onToggleRingkas={toggle} />
        </Ringkas.Provider>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur lg:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Buka menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-bold">Panel Admin</span>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border/60 bg-card shadow-2xl">
            <button
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            {/* Drawer selalu lebar: di mobile tidak ada ruang yang perlu
                dihemat, dan ikon tanpa label lebih sulit disentuh. */}
            <Ringkas.Provider value={false}>
              <SidebarInner onNavigate={() => setOpen(false)} />
            </Ringkas.Provider>
          </div>
        </div>
      )}
    </>
  );
}
