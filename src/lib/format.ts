import type { Settings } from "./types";

type FormatPrefs = Pick<Settings, "locale" | "calendar" | "persianDigits">;

/** Builds a BCP 47 tag such as "fa-IR-u-ca-persian-nu-arabext". */
export function intlLocale(s: FormatPrefs): string {
  const base = s.locale === "fa" ? "fa-IR" : "en-GB";
  const ca = s.calendar === "persian" ? "persian" : "gregory";
  const nu = s.locale === "fa" && s.persianDigits ? "arabext" : "latn";
  return `${base}-u-ca-${ca}-nu-${nu}`;
}

export function formatDate(
  d: Date,
  s: FormatPrefs,
  opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" },
): string {
  return new Intl.DateTimeFormat(intlLocale(s), opts).format(d);
}

export function formatShortDate(d: Date, s: FormatPrefs): string {
  return formatDate(d, s, { day: "numeric", month: "short" });
}

export function formatFullDate(d: Date, s: FormatPrefs): string {
  return formatDate(d, s, { day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(d: Date, s: FormatPrefs): string {
  return new Intl.DateTimeFormat(intlLocale(s), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

export function formatDateTime(d: Date, s: FormatPrefs): string {
  return `${formatShortDate(d, s)} · ${formatTime(d, s)}`;
}

export function formatNumber(n: number, s: FormatPrefs, maxFrac = 1): string {
  return new Intl.NumberFormat(intlLocale(s), { maximumFractionDigits: maxFrac }).format(n);
}

/** Converts every digit in a string to the chosen numbering system. */
export function localDigits(text: string, s: FormatPrefs): string {
  if (!(s.locale === "fa" && s.persianDigits)) return text;
  return text.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

export function formatRelative(d: Date, now: Date, s: FormatPrefs): string {
  const rtf = new Intl.RelativeTimeFormat(intlLocale(s), { numeric: "auto" });
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII. */
export function toLatinDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
}

/** Parses user-typed numbers, accepting Persian digits and decimal separators. */
export function parseNumber(text: string): number {
  const cleaned = toLatinDigits(text.trim()).replace(/[٫,]/g, ".");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}
