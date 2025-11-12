import { CamelCase, Split } from "type-fest";
import lodashCamelCase from "lodash.camelcase";
import type { icons } from "lucide-react";

type IconKey = keyof typeof icons;
export * from "./logger";

// Helper function to check if origin is allowed
export function isAllowedOrigin(env: string, origin: string): boolean {
  // Allow ANY subdomain of renisa.ai at any level (*.renisa.ai, *.*.renisa.ai, etc.)
  if (origin.endsWith(".renisa.ai") || origin.includes(".renisa.ai:")) {
    return true;
  }

  // Allow localhost for development
  if (
    env === "local" &&
    (origin.includes("localhost") || origin.includes("127.0.0.1"))
  ) {
    return true;
  }

  // Allow all subdomains matching renisa-ai--*.vercel.app pattern
  const vercelDomain = /https:\/\/renisa-ai(-[a-zA-Z0-9-]+)?\.vercel\.app/;
  const vercelAppPattern =
    /^https:\/\/renisa-ai-[a-zA-Z0-9-]+-alteos-projects\.vercel\.app$/;
  return vercelDomain.test(origin) || vercelAppPattern.test(origin);
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function notEqual<T>(value: T, other: T): boolean {
  // Returns true if value and other are not equal (deep comparison for objects)
  if (Object.is(value, other)) {
    return false;
  }
  // If both are objects (but not null), do a deep comparison
  if (
    typeof value === "object" &&
    value !== null &&
    typeof other === "object" &&
    other !== null
  ) {
    // Compare keys length
    const valueKeys = Object.keys(value as object);
    const otherKeys = Object.keys(other as object);
    if (valueKeys.length !== otherKeys.length) {
      return true;
    }
    // Compare each key recursively
    for (const key of valueKeys) {
      if (notEqual((value as any)[key], (other as any)[key])) {
        return true;
      }
    }
    return false;
  }
  // Fallback for primitives and non-object types
  return value !== other;
}

export function JSONParseSafe<T = unknown>(
  json: string | undefined | null | unknown
): T | null {
  if (typeof json === "object") {
    return json as T;
  }
  try {
    return JSON.parse((json as string) || "null");
  } catch {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function localeToLocaleCode<T extends `${string}-${string}`>(
  locale: T
): Split<T, "-">[0] {
  return locale.split("-")[0];
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K))
  ) as Omit<T, K>;
}

export function camelCase<T extends string>(input: T): CamelCase<T> {
  return lodashCamelCase(input) as CamelCase<T>;
}

export class Markdown {
  static parseSpecialLink(input: string, href: string) {
    if (href.trim().startsWith("#button")) {
      const parts = href.split(":").slice(1); // Remove #button
      const icon = parts[0] || undefined;
      const variant = parts[1] || undefined;
      const hrefParts = parts.slice(2);
      return {
        type: "button" as const,
        label: input,
        icon: icon as IconKey,
        variant: variant as "primary" | "secondary" | "yes" | "no" | undefined,
        href: hrefParts.join(":"),
      };
    }
    if (href.trim().startsWith("#card")) {
      const [label, description] = input.trim().split("|") || [];
      const [, icon, ...hrefParts] = href.trim().split(":") || [];
      return {
        type: "card" as const,
        label,
        description: description?.trim(),
        icon: icon as IconKey,
        href: hrefParts.join(":"),
      };
    }
    return null;
  }

  static insertButton(label: string, icon?: string, variant?: "primary" | "secondary" | "yes" | "no", href?: string): string {
    const iconPart = icon || "";
    const variantPart = variant || "";
    const hrefPart = href ? `:${href}` : "";
    return `[${label}](#button:${iconPart}:${variantPart}${hrefPart})`;
  }

  static insertCard(
    title: string,
    description: string,
    icon?: IconKey,
    href?: string
  ): string {
    return `[${title}${description ? `|${description}` : ""}](#card${icon ? `:${icon}` : ""}${href ? `:${href}` : ""})`;
  }
}
