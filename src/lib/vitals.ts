import type { Vital, VitalKind } from "./types";

export type VitalFlag = "low" | "normal" | "high";

interface Range {
  low?: number;
  high?: number;
}

/**
 * General adult reference ranges, only used to highlight a reading for the
 * next caregiver. They are not a diagnosis; the README says so too.
 */
export const VITAL_RANGES: Record<VitalKind, { main: Range; second?: Range }> = {
  bp: { main: { low: 90, high: 140 }, second: { low: 60, high: 90 } },
  glucose: { main: { low: 70, high: 180 } },
  temp: { main: { low: 35.5, high: 38 } },
  pulse: { main: { low: 50, high: 100 } },
  spo2: { main: { low: 94 } },
  weight: { main: {} },
};

export const VITAL_UNITS: Record<VitalKind, string> = {
  bp: "mmHg",
  glucose: "mg/dL",
  temp: "°C",
  pulse: "bpm",
  spo2: "%",
  weight: "kg",
};

function flagFor(value: number, r: Range): VitalFlag {
  if (r.low !== undefined && value < r.low) return "low";
  if (r.high !== undefined && value >= r.high) return "high";
  return "normal";
}

export function vitalFlag(v: Pick<Vital, "kind" | "value" | "value2">): VitalFlag {
  const r = VITAL_RANGES[v.kind];
  const a = flagFor(v.value, r.main);
  if (a !== "normal") return a;
  if (r.second && v.value2 !== undefined) return flagFor(v.value2, r.second);
  return "normal";
}

/** Rough sanity limits so a typo (e.g. 1200 bpm) is caught before saving. */
export const VITAL_LIMITS: Record<VitalKind, [number, number]> = {
  bp: [40, 300],
  glucose: [10, 1000],
  temp: [30, 45],
  pulse: [20, 250],
  spo2: [50, 100],
  weight: [1, 400],
};

export function validateVital(kind: VitalKind, value: number, value2?: number): boolean {
  const [min, max] = VITAL_LIMITS[kind];
  if (!Number.isFinite(value) || value < min || value > max) return false;
  if (kind === "bp") {
    if (value2 === undefined || !Number.isFinite(value2) || value2 < 20 || value2 > 200) return false;
    if (value2 >= value) return false;
  }
  return true;
}
