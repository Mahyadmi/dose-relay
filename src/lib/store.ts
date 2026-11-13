"use client";

import { useSyncExternalStore } from "react";
import { normalizeData } from "./schema";
import type { AppData } from "./types";

import { LAST_LOCALE_KEY, STORAGE_KEY } from "./env";
export { STORAGE_KEY };

type Status = "loading" | "empty" | "ready";
interface State {
  status: Status;
  data: AppData | null;
}

let state: State = { status: "loading", data: null };
const listeners = new Set<() => void>();
const SERVER_STATE: State = { status: "loading", data: null };

function emit() {
  for (const l of listeners) l();
}

function readStorage(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "empty", data: null };
    return { status: "ready", data: normalizeData(JSON.parse(raw)) };
  } catch {
    return { status: "empty", data: null };
  }
}

/** Applies display preferences to <html>. Mirrors the inline script in layout.tsx. */
export function applyDocumentPrefs(data: AppData | null) {
  if (typeof document === "undefined") return;
  const s = data?.settings;
  const root = document.documentElement;
  const locale = s?.locale ?? "en";
  root.lang = locale;
  root.dir = locale === "fa" ? "rtl" : "ltr";
  const dark =
    s?.theme === "dark" ||
    ((s?.theme ?? "system") === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.classList.toggle("hc", !!s?.highContrast);
  root.style.fontSize = `${(s?.textScale ?? 1) * 100}%`;
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  state = readStorage();
  applyDocumentPrefs(state.data);
  // Keep several open tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = readStorage();
    applyDocumentPrefs(state.data);
    emit();
  });
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => applyDocumentPrefs(state.data));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): State {
  start();
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

/** Current data; only call from event handlers once the app has loaded. */
export function getData(): AppData {
  if (!state.data) throw new Error("No data loaded");
  return state.data;
}

export function setData(next: AppData | null) {
  if (next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = { status: "ready", data: next };
  } else {
    localStorage.removeItem(STORAGE_KEY);
    state = { status: "empty", data: null };
  }
  applyDocumentPrefs(state.data);
  emit();
}

/** Clears this device's records and returns to the welcome screen. */
export function logOut() {
  const locale = state.data?.settings.locale;
  if (locale) localStorage.setItem(LAST_LOCALE_KEY, locale);
  setData(null);
}

export function update(fn: (d: AppData) => AppData) {
  setData(fn(getData()));
}
