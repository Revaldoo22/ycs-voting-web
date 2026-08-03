import id from "./dictionaries/id";
import en from "./dictionaries/en";

export const dictionaries = { id, en } as const;

export type { Dictionary } from "./types";
export type { Locale } from "./locale-context";
export { LocaleProvider, useLocale } from "./locale-context";
export { useTranslation } from "./use-translation";
