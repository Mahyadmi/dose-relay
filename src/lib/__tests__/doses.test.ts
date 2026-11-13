import { describe, expect, it } from "vitest";
import { recordDose, undoDose } from "../actions";
import { checkDose, isLowStock, prnStatus, slotsForDay, slotState, stockDaysLeft } from "../doses";
import { emptyData } from "../schema";
import type { AppData, Medication } from "../types";

const at = (h: number, m = 0, day = 13) => new Date(2026, 10, day, h, m);

const scheduled: Medication = {
  id: "met",
  personId: "p1",
  name: "Metformin",
  strength: "500 mg",
  form: "tablet",
  unitsPerDose: 1,
  instructionsEn: "",
  instructionsFa: "",
  schedule: { kind: "scheduled", times: ["08:00", "20:00"] },
  stock: 10,
  active: true,
};

const prn: Medication = {
  ...scheduled,
  id: "para",
  name: "Paracetamol",
  unitsPerDose: 2,
  schedule: { kind: "prn", minIntervalHours: 4, maxPerDay: 3 },
  stock: 20,
};

function data(meds: Medication[] = [scheduled, prn]): AppData {
  return { ...emptyData({ caregiverName: "Sara" }), medications: meds };
}

describe("slot states", () => {
  const time = at(8);
  it("is upcoming more than an hour before", () => expect(slotState(time, at(6, 59))).toBe("upcoming"));
  it("is due from an hour before to an hour after", () => {
    expect(slotState(time, at(7, 0))).toBe("due");
    expect(slotState(time, at(9, 0))).toBe("due");
  });
  it("is late, then missed", () => {
    expect(slotState(time, at(9, 1))).toBe("late");
    expect(slotState(time, at(11, 1))).toBe("missed");
  });
});

describe("slotsForDay", () => {
  it("lists every scheduled time, sorted, and skips paused or as-needed medicines", () => {
    const paused = { ...scheduled, id: "x", active: false };
    const slots = slotsForDay(data([scheduled, prn, paused]), at(0), at(12));
    expect(slots.map((s) => s.slot)).toEqual(["2026-11-13 08:00", "2026-11-13 20:00"]);
    expect(slots.map((s) => s.state)).toEqual(["missed", "upcoming"]);
  });

  it("uses the recorded event for a slot", () => {
    const { data: d } = recordDose(data(), scheduled, "given", at(8, 5), "2026-11-13 08:00");
    expect(slotsForDay(d, at(0), at(12))[0].state).toBe("given");
  });
});

describe("double-dose guard", () => {
  it("warns when the same slot was already given by someone else", () => {
    const { data: d } = recordDose(data(), scheduled, "given", at(8, 5), "2026-11-13 08:00");
    const w = checkDose(d, scheduled, "2026-11-13 08:00", at(8, 30));
    expect(w?.kind).toBe("already-given");
  });

  it("does not warn after a skip", () => {
    const { data: d } = recordDose(data(), scheduled, "skipped", at(8, 5), "2026-11-13 08:00");
    expect(checkDose(d, scheduled, "2026-11-13 08:00", at(8, 30))).toBeNull();
  });

  it("warns when a different slot of the same medicine was given less than 2 hours ago", () => {
    // Morning dose given very late, then someone tries the evening dose early.
    const { data: d } = recordDose(data(), scheduled, "given", at(18, 30), "2026-11-13 08:00");
    const w = checkDose(d, scheduled, "2026-11-13 20:00", at(19, 15));
    expect(w?.kind).toBe("too-soon");
  });

  it("is quiet when nothing was given", () => {
    expect(checkDose(data(), scheduled, "2026-11-13 08:00", at(8))).toBeNull();
  });
});

describe("as-needed (PRN) rules", () => {
  it("enforces the minimum interval", () => {
    const { data: d } = recordDose(data(), prn, "given", at(10), undefined);
    const s = prnStatus(prn, d.doses, at(12));
    expect(s.canGive).toBe(false);
    expect(s.reason).toBe("interval");
    expect(s.nextAllowedAt).toEqual(at(14));
    expect(checkDose(d, prn, undefined, at(12))?.kind).toBe("prn-interval");
    expect(prnStatus(prn, d.doses, at(14)).canGive).toBe(true);
  });

  it("enforces the 24-hour maximum", () => {
    let d = data();
    for (const h of [0, 5, 10]) d = recordDose(d, prn, "given", at(h)).data;
    const s = prnStatus(prn, d.doses, at(16));
    expect(s.takenLast24h).toBe(3);
    expect(s.reason).toBe("max");
    // The first dose (00:00) leaves the 24h window at 00:00 next day.
    expect(s.nextAllowedAt).toEqual(at(0, 0, 14));
  });
});

describe("stock", () => {
  it("goes down when given and back up on undo", () => {
    const r = recordDose(data(), prn, "given", at(10));
    expect(r.data.medications.find((m) => m.id === "para")!.stock).toBe(18);
    const undone = undoDose(r.data, r.event.id);
    expect(undone.medications.find((m) => m.id === "para")!.stock).toBe(20);
    expect(undone.doses).toHaveLength(0);
  });

  it("is not changed by a skip", () => {
    const r = recordDose(data(), scheduled, "skipped", at(8), "2026-11-13 08:00");
    expect(r.data.medications.find((m) => m.id === "met")!.stock).toBe(10);
  });

  it("calculates days left and the low-stock warning", () => {
    expect(stockDaysLeft(scheduled)).toBe(5);
    expect(isLowStock(scheduled)).toBe(true);
    expect(isLowStock({ ...scheduled, stock: 30 })).toBe(false);
    expect(isLowStock({ ...scheduled, stock: undefined })).toBe(false);
  });
});

describe("medicine start date", () => {
  it("never shows dose times before the medicine was added as missed", () => {
    const added = { ...scheduled, startedAt: at(12).toISOString() };
    const slots = slotsForDay(data([added]), at(0), at(21));
    expect(slots.map((s) => s.slot)).toEqual(["2026-11-13 20:00"]);
  });
});
