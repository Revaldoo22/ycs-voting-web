"use client";

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkNotificationsRead,
  useMyNotifications,
  useMyProfile,
  type NotificationRow,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Waktu relatif ringkas dalam bahasa umum (contoh: "3 jam lalu"). */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

/** Lonceng pemberitahuan voter — hanya tampil untuk voter yang sudah login. */
export function NotificationBell() {
  const { data: me } = useMyProfile();
  const enabled = !!me && me.role === "voter";
  const { data } = useMyNotifications(enabled);
  const markRead = useMarkNotificationsRead();

  if (!enabled) return null;

  const items: NotificationRow[] = data?.items ?? [];
  const unread = data?.unread ?? 0;

  // Buka lonceng → tandai semua sudah dibaca (badge hilang), tapi daftar tetap.
  function onOpenChange(open: boolean) {
    if (open && unread > 0) markRead.mutate(undefined);
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Pemberitahuan"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Pemberitahuan</p>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Belum ada pemberitahuan.
            </p>
          </div>
        ) : (
          <ul className="max-h-[22rem] overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "border-b px-3 py-2.5 last:border-b-0",
                  n.read_at === null && "bg-primary/[0.04]",
                )}
              >
                <div className="flex items-start gap-2">
                  {n.read_at === null && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
