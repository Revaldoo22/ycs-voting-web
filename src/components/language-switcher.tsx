"use client";

import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, useTranslation, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Locale; short: string }[] = [
  { value: "id", short: "ID" },
  { value: "en", short: "EN" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useTranslation("languageSwitcher");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t.label}
          className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {locale.toUpperCase()}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => setLocale(opt.value)}
            className={cn(
              "gap-2",
              locale === opt.value && "font-medium text-primary",
            )}
          >
            <span className="w-6 shrink-0 text-xs font-semibold">
              {opt.short}
            </span>
            {t[opt.value]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
