import { describe, expect, it } from "vitest";
import { demoData } from "../demo";
import { formatDate, formatTime, parseNumber, toLatinDigits } from "../format";
import { buildHandover } from "../handover";
import { buildIcs } from "../ics";
import { emptyData, mergeData, normalizeData } from "../schema";
import { decryptPayload, encryptPayload, generateShareCode, ShareError } from "../share";
import { validateVital, vitalFlag } from "../vitals";

const now = new Date(2026, 10, 13, 18, 0);

describe("Persian language and Jalali calendar", () => {
  const fa = { locale: "fa" as const, calendar: "persian" as const, persianDigits: true };

  it("formats dates in the Jalali calendar with Persian digits", () => {
    // 13 November 2026 is 22 Aban 1405.
    expect(formatDate(now, fa, { day: "numeric", month: "long", year: "numeric" })).toBe("۲۲ آبان ۱۴۰۵");
  });

  it("can show the Jalali calendar in English", () => {
    const s = formatDate(now, { locale: "en", calendar: "persian", persianDigits: true }, { day: "numeric", month: "long", year: "numeric" });
    expect(s).toMatch(/22 Aban 1405/);
  });

  it("uses 24-hour times with the chosen digits", () => {
    expect(formatTime(now, fa)).toBe("۱۸:۰۰");
    expect(formatTime(now, { ...fa, persianDigits: false })).toBe("18:00");
  });

  it("accepts Persian and Arabic digits typed into number fields", () => {
    expect(toLatinDigits("۱۴۰۵")).toBe("1405");
    expect(parseNumber("۳۷٫۵")).toBe(37.5);
    expect(parseNumber("١٢٠")).toBe(120);
    expect(parseNumber("")).toBeNaN();
  });
});

describe("vitals", () => {
  it("flags readings outside the reference range", () => {
    expect(vitalFlag({ kind: "bp", value: 152, value2: 94 })).toBe("high");
    expect(vitalFlag({ kind: "bp", value: 120, value2: 95 })).toBe("high");
    expect(vitalFlag({ kind: "bp", value: 120, value2: 80 })).toBe("normal");
    expect(vitalFlag({ kind: "glucose", value: 60 })).toBe("low");
    expect(vitalFlag({ kind: "spo2", value: 98 })).toBe("normal");
  });

  it("rejects typos", () => {
    expect(validateVital("pulse", 1200)).toBe(false);
    expect(validateVital("bp", 80, 120)).toBe(false);
    expect(validateVital("temp", 37.2)).toBe(true);
  });
});

describe("handover", () => {
  const data = demoData(now, { caregiverName: "Mina" });
  const h = buildHandover(data, new Date(now.getTime() - 10 * 3_600_000), now, "Mina");

  it("shows doses given by other caregivers, not by me", () => {
    expect(h.doses.length).toBeGreaterThan(0);
    expect(h.doses.every((d) => d.by !== "Mina")).toBe(true);
  });

  it("surfaces the missed morning dose, notes and the high blood pressure reading", () => {
    expect(h.missed.map((s) => s.med.name)).toContain("Amlodipine");
    expect(h.notes[0].important).toBe(true);
    expect(h.flaggedVitals.some((v) => v.kind === "bp")).toBe(true);
    expect(h.upcoming.length).toBeGreaterThan(0);
    expect(h.lowStock.map((m) => m.name)).toContain("Amlodipine");
  });
});

describe("encrypted relay", () => {
  it("round-trips data with the right code", async () => {
    const data = demoData(now);
    const code = generateShareCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const payload = await encryptPayload(data, code);
    expect(payload).not.toContain("Metformin");
    const back = await decryptPayload(payload, code.toLowerCase().replace(/-/g, " "));
    expect(back).toEqual(JSON.parse(JSON.stringify(data)));
  });

  it("refuses a wrong code or a damaged link", async () => {
    const payload = await encryptPayload({ hello: "world" }, "AAAA-BBBB-CCCC");
    await expect(decryptPayload(payload, "AAAA-BBBB-CCCD")).rejects.toMatchObject({ reason: "code" });
    await expect(decryptPayload("not-a-link", "AAAA-BBBB-CCCC")).rejects.toBeInstanceOf(ShareError);
  });
});

describe("backups and merging", () => {
  it("rejects files that are not DoseRelay data and drops malformed records", () => {
    expect(() => normalizeData({ foo: 1 })).toThrow();
    const d = normalizeData({ version: 1, people: [{ id: "a", name: "A" }, { name: "no id" }], settings: { locale: "fa" } });
    expect(d.people).toHaveLength(1);
    expect(d.people[0].allergies).toEqual([]);
    expect(d.settings.locale).toBe("fa");
    expect(d.settings.textScale).toBe(1);
  });

  it("merges a relay without duplicating records and keeps my settings", () => {
    const mine = { ...demoData(now, { caregiverName: "Mina" }) };
    const theirs = { ...demoData(now, { caregiverName: "Sara" }) };
    theirs.notes = [...theirs.notes, { id: "new-note", personId: theirs.people[0].id, text: "Hi", important: false, at: now.toISOString(), by: "Sara" }];
    const merged = mergeData(mine, theirs);
    expect(merged.notes).toHaveLength(mine.notes.length + 1);
    expect(merged.doses).toHaveLength(mine.doses.length);
    expect(merged.settings.caregiverName).toBe("Mina");
    expect(mergeData(merged, theirs)).toEqual(merged);
  });
});

describe("calendar reminders", () => {
  it("creates a daily repeating event with an alarm for each scheduled dose", () => {
    const ics = buildIcs(demoData(now), now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("TRIGGER:PT0M");
    // 7 scheduled dose times + 2 future appointments
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(9);
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });

  it("is empty but valid with no data", () => {
    const ics = buildIcs(emptyData(), now);
    expect(ics).not.toContain("VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});

describe("demo mode", () => {
  it("marks the demo family so it can offer an Exit demo button", () => {
    expect(demoData(now).settings.demo).toBe(true);
    expect(emptyData().settings.demo).toBeUndefined();
  });
});
