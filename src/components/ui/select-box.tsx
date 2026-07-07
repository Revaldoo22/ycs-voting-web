"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; disabled?: boolean };

// Radix Select tak mengizinkan value="" (kosong = clear). Kita pakai sentinel
// internal untuk merepresentasikan "value kosong" (mis. placeholder/Semua).
const EMPTY = "__empty__";

/**
 * Dropdown custom (bukan native browser) — scrollable, keyboard & touch
 * friendly (mobile), styling seragam. API mirip native select:
 *   <SelectBox value onChange options placeholder />
 */
export function SelectBox({
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select
      value={value === "" ? EMPTY : value}
      onValueChange={(v) => onChange(v === EMPTY ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-9", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => (
          <SelectItem
            key={o.value || EMPTY}
            value={o.value === "" ? EMPTY : o.value}
            disabled={o.disabled}
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
