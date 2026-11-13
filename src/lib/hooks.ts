"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatFullDate,
  formatNumber,
  formatRelative,
  formatShortDate,
  formatTime,
  localDigits,
} from "./format";
import { translate, type MessageKey, type Vars } from "./i18n";
import { getData, useStore } from "./store";
import type { AppData, Settings } from "./types";

/** The current time, refreshed every 30 seconds so statuses move on their own. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const onFocus = () => setNow(new Date());
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
  return now;
}

export function makeI18n(settings: Settings) {
  const t = (key: MessageKey, vars?: Vars) => {
    const local: Vars | undefined = vars
      ? Object.fromEntries(
          Object.entries(vars).map(([k, v]) => [k, typeof v === "number" ? formatNumber(v, settings) : v]),
        )
      : undefined;
    return translate(settings.locale, key, local);
  };
  const f = {
    date: (d: Date, o?: Intl.DateTimeFormatOptions) => formatDate(d, settings, o),
    short: (d: Date) => formatShortDate(d, settings),
    full: (d: Date) => formatFullDate(d, settings),
    time: (d: Date) => formatTime(d, settings),
    dateTime: (d: Date) => formatDateTime(d, settings),
    num: (n: number, frac?: number) => formatNumber(n, settings, frac),
    rel: (d: Date, now: Date) => formatRelative(d, now, settings),
    digits: (s: string) => localDigits(s, settings),
  };
  return { t, f };
}

export type I18n = ReturnType<typeof makeI18n>;

/** Data plus translation and formatting bound to the user's settings. Only use under <AppShell>. */
export function useApp(): { data: AppData } & I18n {
  const { data } = useStore();
  const resolved = data ?? getData();
  const i18n = useMemo(() => makeI18n(resolved.settings), [resolved.settings]);
  return { data: resolved, ...i18n };
}
