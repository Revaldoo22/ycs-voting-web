"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Settings,
  Ticket,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyProfile } from "@/lib/queries";
import { useTranslation } from "@/lib/i18n";

/** Login/account button for the public navbar (voter-aware). */
export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useMyProfile();
  const t = useTranslation("authNav");

  // Bawa halaman saat ini sebagai ?next= agar setelah login (dan onboarding,
  // bila perlu) user kembali ke halaman yang sedang dilihat.
  const loginHref =
    pathname && pathname !== "/"
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["profile", "me"] });
    toast.success(t.logoutSuccess);
    router.refresh();
  }

  if (isLoading) return null;

  if (!profile) {
    return (
      <Button size="sm" asChild>
        <Link href={loginHref}>
          <Heart className="h-4 w-4" /> {t.login}
        </Link>
      </Button>
    );
  }

  const initial = (profile.name || "P").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-background py-1 pl-1 pr-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            unoptimized
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initial}
            </span>
          )}
          <span className="hidden max-w-28 truncate sm:inline">
            {profile.name || t.supporterFallback}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <p className="truncate px-2 pt-1.5 text-sm font-semibold">
          {profile.name || t.supporterFallback}
        </p>
        {profile.is_participant && (
          <p className="px-2 pb-1.5">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {t.participantBadge}
            </span>
          </p>
        )}
        {profile.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> {t.adminDashboard}
            </Link>
          </DropdownMenuItem>
        )}
        {/* Voter biasa belum onboarding → lengkapi profil. Peserta (data dari
            web kedua) tak perlu onboarding. */}
        {profile.role === "voter" &&
          !profile.onboarded &&
          !profile.is_participant && (
            <DropdownMenuItem asChild>
              <Link
                href={
                  pathname && pathname !== "/"
                    ? `/onboarding?next=${encodeURIComponent(pathname)}`
                    : "/onboarding"
                }
                className="gap-2"
              >
                <UserRound className="h-4 w-4" /> {t.completeProfile}
              </Link>
            </DropdownMenuItem>
          )}
        {/* Kupon: voter onboarded ATAU peserta. */}
        {(profile.is_participant ||
          (profile.role === "voter" && profile.onboarded)) && (
          <DropdownMenuItem asChild>
            <Link href="/kupon" className="gap-2">
              <Ticket className="h-4 w-4" /> {t.myCoupons}
            </Link>
          </DropdownMenuItem>
        )}
        {/* Pengaturan Akun: hanya voter biasa. Peserta atur akun di web kedua. */}
        {profile.role === "voter" &&
          profile.onboarded &&
          !profile.is_participant && (
            <DropdownMenuItem asChild>
              <Link href="/akun" className="gap-2">
                <Settings className="h-4 w-4" /> {t.accountSettings}
              </Link>
            </DropdownMenuItem>
          )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={logout}
          className="gap-2 text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" /> {t.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
