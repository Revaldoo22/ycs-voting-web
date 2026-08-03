"use client";

import { dictionaries } from "./index";
import type { Dictionary } from "./types";
import { useLocale } from "./locale-context";

export function useTranslation<K extends keyof Dictionary>(
  namespace: K,
): Dictionary[K] {
  const { locale } = useLocale();
  return dictionaries[locale][namespace];
}
