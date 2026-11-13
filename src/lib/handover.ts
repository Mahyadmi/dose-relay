import { HOUR } from "./dates";
import { isLowStock, slotsBetween, type DoseSlot } from "./doses";
import type { AppData, Appointment, CareNote, DoseEvent, Medication, Vital } from "./types";
import { vitalFlag } from "./vitals";

export interface Handover {
  since: Date;
  doses: DoseEvent[];
  missed: DoseSlot[];
  notes: CareNote[];
  vitals: Vital[];
  flaggedVitals: Vital[];
  upcoming: Appointment[];
  lowStock: Medication[];
  /** Number of things the incoming caregiver should look at. */
  attention: number;
}

const byNewest = <T extends { at: string }>(a: T, b: T) => (a.at < b.at ? 1 : -1);

/** Everything that happened since `since`, from the point of view of caregiver `me`. */
export function buildHandover(
  data: AppData,
  since: Date,
  now: Date,
  me: string,
  personId?: string,
): Handover {
  const after = (iso: string) => {
    const t = new Date(iso).getTime();
    return t > since.getTime() && t <= now.getTime();
  };
  const forPerson = (p: { personId: string }) => !personId || p.personId === personId;
  const isMe = (by: string) => by.trim().toLowerCase() === me.trim().toLowerCase();

  const doses = data.doses.filter((e) => forPerson(e) && after(e.at) && !isMe(e.by)).sort(byNewest);
  // Unresolved doses stay on the handover for 24 hours, even if they were due
  // before `since`: they still need someone to decide what to do.
  const missedFrom = new Date(Math.min(since.getTime(), now.getTime() - 24 * HOUR));
  const missed = slotsBetween(data, missedFrom, now, now, personId).filter(
    (s) => s.state === "missed" || s.state === "late",
  );
  const notes = data.notes
    .filter((n) => forPerson(n) && after(n.at))
    .sort((a, b) => Number(b.important) - Number(a.important) || byNewest(a, b));
  const vitals = data.vitals.filter((v) => forPerson(v) && after(v.at)).sort(byNewest);
  const flaggedVitals = vitals.filter((v) => vitalFlag(v) !== "normal");
  const upcoming = data.appointments
    .filter((a) => {
      const t = new Date(a.at).getTime();
      return forPerson(a) && t >= now.getTime() && t <= now.getTime() + 48 * HOUR;
    })
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  const lowStock = data.medications.filter((m) => forPerson(m) && isLowStock(m));

  return {
    since,
    doses,
    missed,
    notes,
    vitals,
    flaggedVitals,
    upcoming,
    lowStock,
    attention: doses.length + missed.length + notes.length + flaggedVitals.length,
  };
}

/** Default "since" for the handover screen: last time I read it, else 12 hours ago. */
export function defaultSince(data: AppData, now: Date): Date {
  const read = data.settings.handoverReadAt;
  if (read) {
    const d = new Date(read);
    if (!Number.isNaN(d.getTime()) && d < now) return d;
  }
  return new Date(now.getTime() - 12 * HOUR);
}
