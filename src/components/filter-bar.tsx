"use client";

import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Toolbar filter seragam untuk halaman admin: kartu ber-grid, tiap kontrol
 * berlabel di atasnya, lebar kolom konsisten, tombol reset di kanan.
 */
export function FilterBar({
  children,
  onReset,
  showReset = false,
  className,
}: {
  children: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {children}
      </div>
      {showReset && onReset && (
        <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <FilterX className="h-4 w-4" /> Reset filter
          </Button>
        </div>
      )}
    </div>
  );
}

/** Satu kontrol filter berlabel. span mengatur lebar kolom di grid. */
export function FilterField({
  label,
  span = 1,
  children,
}: {
  label: string;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 space-y-1",
        span === 2 && "col-span-2",
      )}
    >
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
