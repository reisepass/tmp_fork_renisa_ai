import { localeEnum } from "@renisa-ai/config/schema";
import { Locale, LocaleCode } from "@renisa-ai/config/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function localeCodeToLocale(locale: LocaleCode): Locale {
  return Object.values(localeEnum.enum).find((l) =>
    l.startsWith(`${locale}-`)
  ) as Locale;
}

export function openInNewTab(url: string) {
  window.open(url, "_blank");
}
