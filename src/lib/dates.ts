/** Local-time date helpers. All "keys" are in the device's time zone. */

const pad = (n: number) => String(n).padStart(2, "0");

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeKey(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DD HH:mm" */
export function slotKey(day: string, time: string): string {
  return `${day} ${time}`;
}

export function parseSlot(slot: string): Date {
  const [day, time] = slot.split(" ");
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

export const HOUR = 3_600_000;
export const MINUTE = 60_000;

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date): string {
  return `${dateKey(d)}T${timeKey(d)}`;
}

export function fromLocalInput(v: string): Date {
  const [day, time] = v.split("T");
  return parseSlot(`${day} ${time ?? "00:00"}`);
}
