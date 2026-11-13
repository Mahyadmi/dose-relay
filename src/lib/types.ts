export type Id = string;

export type Locale = "en" | "fa";
export type CalendarKind = "gregorian" | "persian";
export type ThemePref = "system" | "light" | "dark";

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Person {
  id: Id;
  name: string;
  birthYear?: number;
  /** Index into the avatar colour palette. */
  color: number;
  allergies: string[];
  conditions: string[];
  emergencyContacts: EmergencyContact[];
  notes?: string;
}

export type MedForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "inhaler"
  | "injection"
  | "drops"
  | "cream"
  | "other";

export type Schedule =
  | {
      kind: "scheduled";
      /** Local times of day, "HH:mm", sorted. */
      times: string[];
    }
  | {
      kind: "prn";
      /** Minimum hours between two doses. */
      minIntervalHours: number;
      /** Maximum doses in a rolling 24 hours. */
      maxPerDay: number;
    };

export interface Medication {
  id: Id;
  personId: Id;
  name: string;
  strength: string;
  form: MedForm;
  /** How many units (tablets, ml…) per dose. Used for stock tracking. */
  unitsPerDose: number;
  instructionsEn: string;
  instructionsFa: string;
  schedule: Schedule;
  /** Units left. Undefined means stock is not tracked. */
  stock?: number;
  active: boolean;
  /** ISO timestamp the medicine was added. Earlier dose times are never shown as missed. */
  startedAt?: string;
}

export type DoseStatus = "given" | "skipped";

export interface DoseEvent {
  id: Id;
  medicationId: Id;
  personId: Id;
  /** For scheduled doses: "YYYY-MM-DD HH:mm" of the slot. Undefined for as-needed doses. */
  slot?: string;
  status: DoseStatus;
  /** ISO timestamp when it was recorded. */
  at: string;
  by: string;
  note?: string;
}

export type VitalKind = "bp" | "glucose" | "temp" | "pulse" | "spo2" | "weight";

export interface Vital {
  id: Id;
  personId: Id;
  kind: VitalKind;
  value: number;
  /** Diastolic, for blood pressure only. */
  value2?: number;
  at: string;
  by: string;
}

export interface CareNote {
  id: Id;
  personId: Id;
  text: string;
  important: boolean;
  at: string;
  by: string;
}

export interface Appointment {
  id: Id;
  personId: Id;
  title: string;
  /** ISO timestamp. */
  at: string;
  location?: string;
  notes?: string;
}

export interface Settings {
  caregiverName: string;
  locale: Locale;
  calendar: CalendarKind;
  /** Show Persian (۱۲۳) digits when the language is Persian. */
  persianDigits: boolean;
  /** 1 = normal; larger values scale all text. */
  textScale: number;
  theme: ThemePref;
  highContrast: boolean;
  /** Show the other language's instructions under each medicine. */
  showBothLanguages: boolean;
  /** ISO timestamp of the last time this caregiver marked the handover as read. */
  handoverReadAt?: string;
}

export interface AppData {
  version: 1;
  people: Person[];
  medications: Medication[];
  doses: DoseEvent[];
  vitals: Vital[];
  notes: CareNote[];
  appointments: Appointment[];
  settings: Settings;
}
