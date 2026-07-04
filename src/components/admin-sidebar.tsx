"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Flag,
  Gift,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Medal,
  Menu,
  School,
  ScrollText,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/participants", label: "Peserta", icon: GraduationCap },
  { href: "/admin/voters", label: "Voter", icon: Users },
  { href: "/admin/submissions", label: "Submission", icon: ClipboardCheck },
  { href: "/admin/log", label: "Log Aktivitas", icon: ScrollText },
  { href: "/admin/quests", label: "Quest", icon: Trophy },
  { href: "/admin/rounds", label: "Gelombang", icon: Flag },
  { href: "/admin/hasil", label: "Hasil Lolos", icon: Medal },
  { href: "/admin/undian", label: "Undian", icon: Gift },
  { href: "/admin/schools", label: "Sekolah", icon: School },
];

function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Berhasil keluar.");
    router.push("/login");
    router.refresh();
  };
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // Link aktif = match terpanjang, batas segmen (cegah /admin nyala di /admin/x).
  const matchLen = (href: string) => {
    if (pathname === href) return href.length;
    if (pathname.startsWith(href + "/")) return href.length;
    return -1;
  };
  const activeHref = NAV.reduce(
    (best, l) => (matchLen(l.href) > matchLen(best) ? l.href : best),
    "",
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.map((l) => {
        const active = l.href === activeHref;
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const logout = useLogout();
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 border-b border-border/60 px-4 py-4"
        onClick={onNavigate}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight">
            Youth Character Summit
          </span>
          <span className="block text-xs text-muted-foreground">
            Panel Admin
          </span>
        </span>
      </Link>

      <NavItems onNavigate={onNavigate} />

      <div className="border-t border-border/60 p-3">
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:bg-destructive/5"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" /> Keluar
        </Button>
      </div>
    </div>
  );
}

/** Sidebar admin: tetap di desktop, drawer di mobile. */
export function AdminSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border/60 bg-card lg:block">
        <SidebarInner />
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
            <SidebarInner onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
