import type { AppData, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  caregiverName: "",
  locale: "en",
  calendar: "gregorian",
  persianDigits: true,
  textScale: 1,
  theme: "system",
  highContrast: false,
  showBothLanguages: true,
};

export function emptyData(settings: Partial<Settings> = {}): AppData {
  return {
    version: 1,
    people: [],
    medications: [],
    doses: [],
    vitals: [],
    notes: [],
    appointments: [],
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter(isObj) : []);
const hasId = (v: Record<string, unknown>) => typeof v.id === "string" && v.id.length > 0;

/**
 * Checks data loaded from storage, a backup file or a share link, dropping
 * anything malformed. Throws if it is not DoseRelay data at all.
 */
export function normalizeData(raw: unknown): AppData {
  if (!isObj(raw) || raw.version !== 1) throw new Error("Not a DoseRelay backup");
  const settings = isObj(raw.settings) ? raw.settings : {};
  return {
    version: 1,
    people: arr(raw.people)
      .filter((p) => hasId(p) && typeof p.name === "string")
      .map((p) => ({
        color: 0,
        allergies: [],
        conditions: [],
        emergencyContacts: [],
        ...p,
      })) as unknown as AppData["people"],
    medications: arr(raw.medications).filter(
      (m) => hasId(m) && typeof m.personId === "string" && isObj(m.schedule),
    ) as unknown as AppData["medications"],
    doses: arr(raw.doses).filter(
      (d) => hasId(d) && typeof d.medicationId === "string" && typeof d.at === "string",
    ) as unknown as AppData["doses"],
    vitals: arr(raw.vitals).filter(
      (v) => hasId(v) && typeof v.value === "number",
    ) as unknown as AppData["vitals"],
    notes: arr(raw.notes).filter((n) => hasId(n) && typeof n.text === "string") as unknown as AppData["notes"],
    appointments: arr(raw.appointments).filter(
      (a) => hasId(a) && typeof a.at === "string",
    ) as unknown as AppData["appointments"],
    settings: { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings>) },
  };
}

function unionById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map(local.map((x) => [x.id, x]));
  for (const x of incoming) map.set(x.id, x);
  return [...map.values()];
}

/**
 * Merges a relay from another caregiver into local data. Records are matched
 * by id, so importing the same relay twice changes nothing. The incoming copy
 * wins for edited records; local settings are always kept.
 */
export function mergeData(local: AppData, incoming: AppData): AppData {
  return {
    version: 1,
    people: unionById(local.people, incoming.people),
    medications: unionById(local.medications, incoming.medications),
    doses: unionById(local.doses, incoming.doses),
    vitals: unionById(local.vitals, incoming.vitals),
    notes: unionById(local.notes, incoming.notes),
    appointments: unionById(local.appointments, incoming.appointments),
    settings: local.settings,
  };
}

/** Data to send to another caregiver: everything except personal settings. */
export function shareable(data: AppData): AppData {
  return { ...data, settings: { ...DEFAULT_SETTINGS } };
}
