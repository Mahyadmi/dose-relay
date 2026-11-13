import {
  addDays,
  dateKey,
  HOUR,
  MINUTE,
  parseSlot,
  slotKey,
  startOfDay,
} from "./dates";
import type { AppData, DoseEvent, Medication } from "./types";

/** A dose can be given from this long before its time. */
export const DUE_BEFORE_MIN = 60;
/** After this long past its time a dose is shown as late. */
export const LATE_AFTER_MIN = 60;
/** After this long past its time a dose counts as missed. */
export const MISSED_AFTER_MIN = 180;
/** Giving the same scheduled medicine again within this window triggers a warning. */
export const TOO_SOON_HOURS = 2;
/** Stock is "low" when this many days or fewer remain. */
export const LOW_STOCK_DAYS = 7;

export type SlotState =
  | "given"
  | "skipped"
  | "due"
  | "late"
  | "missed"
  | "upcoming";

export interface DoseSlot {
  med: Medication;
  slot: string;
  time: Date;
  state: SlotState;
  event?: DoseEvent;
}

export function eventForSlot(
  doses: DoseEvent[],
  medId: string,
  slot: string,
): DoseEvent | undefined {
  let found: DoseEvent | undefined;
  for (const e of doses) {
    if (e.medicationId === medId && e.slot === slot) {
      if (!found || e.at > found.at) found = e;
    }
  }
  return found;
}

export function slotState(time: Date, now: Date, event?: DoseEvent): SlotState {
  if (event) return event.status;
  const diffMin = (now.getTime() - time.getTime()) / MINUTE;
  if (diffMin < -DUE_BEFORE_MIN) return "upcoming";
  if (diffMin <= LATE_AFTER_MIN) return "due";
  if (diffMin <= MISSED_AFTER_MIN) return "late";
  return "missed";
}

/** Every scheduled dose slot on `day` (local), sorted by time. */
export function slotsForDay(
  data: Pick<AppData, "medications" | "doses">,
  day: Date,
  now: Date,
  personId?: string,
): DoseSlot[] {
  const key = dateKey(day);
  const slots: DoseSlot[] = [];
  for (const med of data.medications) {
    if (!med.active || med.schedule.kind !== "scheduled") continue;
    if (personId && med.personId !== personId) continue;
    const started = med.startedAt ? new Date(med.startedAt).getTime() : -Infinity;
    for (const t of med.schedule.times) {
      const slot = slotKey(key, t);
      const time = parseSlot(slot);
      if (time.getTime() < started) continue;
      const event = eventForSlot(data.doses, med.id, slot);
      slots.push({ med, slot, time, state: slotState(time, now, event), event });
    }
  }
  return slots.sort(
    (a, b) => a.time.getTime() - b.time.getTime() || a.med.name.localeCompare(b.med.name),
  );
}

/** Slots between two instants (inclusive of whole days), useful for handover and reports. */
export function slotsBetween(
  data: Pick<AppData, "medications" | "doses">,
  from: Date,
  to: Date,
  now: Date,
  personId?: string,
): DoseSlot[] {
  const out: DoseSlot[] = [];
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    for (const s of slotsForDay(data, d, now, personId)) {
      if (s.time >= from && s.time <= to) out.push(s);
    }
  }
  return out;
}

export interface PrnStatus {
  takenLast24h: number;
  maxPerDay: number;
  lastGiven?: DoseEvent;
  nextAllowedAt?: Date;
  canGive: boolean;
  reason?: "interval" | "max";
}

export function prnStatus(med: Medication, doses: DoseEvent[], now: Date): PrnStatus {
  if (med.schedule.kind !== "prn") throw new Error("Not an as-needed medicine");
  const { minIntervalHours, maxPerDay } = med.schedule;
  const since = now.getTime() - 24 * HOUR;
  const given = doses
    .filter(
      (e) =>
        e.medicationId === med.id &&
        e.status === "given" &&
        new Date(e.at).getTime() > since &&
        new Date(e.at).getTime() <= now.getTime(),
    )
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const lastGiven = given[0];
  let nextAllowedAt: Date | undefined;
  let reason: PrnStatus["reason"];
  if (lastGiven) {
    const byInterval = new Date(new Date(lastGiven.at).getTime() + minIntervalHours * HOUR);
    if (byInterval > now) {
      nextAllowedAt = byInterval;
      reason = "interval";
    }
  }
  if (given.length >= maxPerDay) {
    // The oldest dose in the window has to drop out first.
    const oldest = given[maxPerDay - 1];
    const byMax = new Date(new Date(oldest.at).getTime() + 24 * HOUR);
    if (!nextAllowedAt || byMax > nextAllowedAt) {
      nextAllowedAt = byMax;
      reason = "max";
    }
  }
  return {
    takenLast24h: given.length,
    maxPerDay,
    lastGiven,
    nextAllowedAt,
    canGive: !nextAllowedAt,
    reason,
  };
}

export type DoseWarning =
  | { kind: "already-given"; event: DoseEvent }
  | { kind: "too-soon"; event: DoseEvent }
  | { kind: "prn-interval"; event?: DoseEvent; nextAllowedAt: Date }
  | { kind: "prn-max"; nextAllowedAt: Date; taken: number; max: number };

/**
 * The double-dose guard. Returns a warning when giving this dose now could be a
 * double dose, or null when it looks safe to record.
 */
export function checkDose(
  data: Pick<AppData, "doses">,
  med: Medication,
  slot: string | undefined,
  now: Date,
): DoseWarning | null {
  if (med.schedule.kind === "prn") {
    const s = prnStatus(med, data.doses, now);
    if (s.canGive) return null;
    if (s.reason === "max")
      return { kind: "prn-max", nextAllowedAt: s.nextAllowedAt!, taken: s.takenLast24h, max: s.maxPerDay };
    return { kind: "prn-interval", event: s.lastGiven, nextAllowedAt: s.nextAllowedAt! };
  }
  if (slot) {
    const existing = eventForSlot(data.doses, med.id, slot);
    if (existing?.status === "given") return { kind: "already-given", event: existing };
  }
  const windowStart = now.getTime() - TOO_SOON_HOURS * HOUR;
  const recent = data.doses
    .filter(
      (e) =>
        e.medicationId === med.id &&
        e.status === "given" &&
        e.slot !== slot &&
        new Date(e.at).getTime() >= windowStart &&
        new Date(e.at).getTime() <= now.getTime(),
    )
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (recent) return { kind: "too-soon", event: recent };
  return null;
}

/** Units of this medicine used per day, or undefined if not on a fixed schedule. */
export function unitsPerDay(med: Medication): number | undefined {
  if (med.schedule.kind !== "scheduled") return undefined;
  return med.schedule.times.length * med.unitsPerDose;
}

export function stockDaysLeft(med: Medication): number | undefined {
  if (med.stock === undefined) return undefined;
  const perDay = unitsPerDay(med);
  if (!perDay) return undefined;
  return Math.floor(med.stock / perDay);
}

export function isLowStock(med: Medication): boolean {
  if (!med.active || med.stock === undefined) return false;
  const days = stockDaysLeft(med);
  if (days !== undefined) return days <= LOW_STOCK_DAYS;
  // As-needed: warn when fewer than a day's maximum remain.
  if (med.schedule.kind === "prn") return med.stock < med.schedule.maxPerDay * med.unitsPerDose;
  return false;
}

export interface Adherence {
  given: number;
  skipped: number;
  missed: number;
  total: number;
  /** 0–100, of doses that are past due. */
  rate: number;
}

export function adherence(slots: DoseSlot[]): Adherence {
  let given = 0;
  let skipped = 0;
  let missed = 0;
  for (const s of slots) {
    if (s.state === "given") given++;
    else if (s.state === "skipped") skipped++;
    else if (s.state === "missed") missed++;
  }
  const total = given + skipped + missed;
  return { given, skipped, missed, total, rate: total ? Math.round((given / total) * 100) : 100 };
}
