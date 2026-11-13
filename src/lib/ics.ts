import { dateKey, timeKey } from "./dates";
import type { AppData } from "./types";

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + n > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Floating local time, e.g. 20261113T080000 — reminders follow the phone's time zone. */
function localStamp(d: Date): string {
  return `${dateKey(d).replace(/-/g, "")}T${timeKey(d).replace(":", "")}00`;
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Builds an iCalendar file with a daily repeating event (and alarm) for every
 * scheduled dose, plus each upcoming appointment. Phones' calendar apps then
 * deliver reliable reminders, which web notifications cannot guarantee.
 */
export function buildIcs(data: AppData, now: Date, personId?: string): string {
  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DoseRelay//Care schedule//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:DoseRelay",
  ];
  const stamp = utcStamp(now);

  for (const med of data.medications) {
    if (!med.active || med.schedule.kind !== "scheduled") continue;
    if (personId && med.personId !== personId) continue;
    const who = people.get(med.personId) ?? "";
    for (const t of med.schedule.times) {
      const [hh, mm] = t.split(":").map(Number);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
      const summary = `💊 ${who}: ${med.name} ${med.strength}`.trim();
      const desc = [med.instructionsEn, med.instructionsFa].filter(Boolean).join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${med.id}-${t.replace(":", "")}@doserelay`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${localStamp(start)}`,
        "DURATION:PT15M",
        "RRULE:FREQ=DAILY",
        `SUMMARY:${esc(summary)}`,
        `DESCRIPTION:${esc(desc)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(summary)}`,
        "TRIGGER:PT0M",
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }

  for (const a of data.appointments) {
    if (personId && a.personId !== personId) continue;
    const at = new Date(a.at);
    if (at < now) continue;
    const summary = `📅 ${people.get(a.personId) ?? ""}: ${a.title}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@doserelay`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localStamp(at)}`,
      "DURATION:PT1H",
      `SUMMARY:${esc(summary)}`,
      ...(a.location ? [`LOCATION:${esc(a.location)}`] : []),
      ...(a.notes ? [`DESCRIPTION:${esc(a.notes)}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(summary)}`,
      "TRIGGER:-PT1H",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
