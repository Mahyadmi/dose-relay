import type { AppData, DoseEvent, DoseStatus, Medication } from "./types";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function adjustStock(meds: Medication[], medId: string, delta: number): Medication[] {
  return meds.map((m) =>
    m.id === medId && m.stock !== undefined ? { ...m, stock: Math.max(0, m.stock + delta) } : m,
  );
}

/** Records a dose (or a skip). Giving a dose takes it out of stock. */
export function recordDose(
  data: AppData,
  med: Medication,
  status: DoseStatus,
  now: Date,
  slot?: string,
  note?: string,
): { data: AppData; event: DoseEvent } {
  const event: DoseEvent = {
    id: newId(),
    medicationId: med.id,
    personId: med.personId,
    slot,
    status,
    at: now.toISOString(),
    by: data.settings.caregiverName || "—",
    ...(note ? { note } : {}),
  };
  return {
    event,
    data: {
      ...data,
      doses: [...data.doses, event],
      medications: status === "given" ? adjustStock(data.medications, med.id, -med.unitsPerDose) : data.medications,
    },
  };
}

/** Removes a recorded dose and puts its units back in stock. */
export function undoDose(data: AppData, eventId: string): AppData {
  const event = data.doses.find((d) => d.id === eventId);
  if (!event) return data;
  const med = data.medications.find((m) => m.id === event.medicationId);
  return {
    ...data,
    doses: data.doses.filter((d) => d.id !== eventId),
    medications:
      event.status === "given" && med ? adjustStock(data.medications, med.id, med.unitsPerDose) : data.medications,
  };
}

type Collection = "people" | "medications" | "vitals" | "notes" | "appointments";

export function upsert<K extends Collection>(data: AppData, key: K, item: AppData[K][number]): AppData {
  const list = data[key] as AppData[K][number][];
  const exists = list.some((x) => x.id === item.id);
  return {
    ...data,
    [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
  };
}

export function remove(data: AppData, key: Collection, id: string): AppData {
  return { ...data, [key]: (data[key] as { id: string }[]).filter((x) => x.id !== id) };
}

/** Deleting a person removes everything that belongs to them. */
export function removePerson(data: AppData, personId: string): AppData {
  const keep = <T extends { personId: string }>(xs: T[]) => xs.filter((x) => x.personId !== personId);
  return {
    ...data,
    people: data.people.filter((p) => p.id !== personId),
    medications: keep(data.medications),
    doses: keep(data.doses),
    vitals: keep(data.vitals),
    notes: keep(data.notes),
    appointments: keep(data.appointments),
  };
}
