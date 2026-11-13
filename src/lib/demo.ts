import { addDays, dateKey, HOUR, MINUTE, parseSlot, slotKey, startOfDay } from "./dates";
import { emptyData } from "./schema";
import type { AppData, DoseEvent, Medication, Settings, Vital } from "./types";

/**
 * A realistic example family so anyone (including recruiters) can try every
 * feature in seconds. Everything is placed relative to `now`.
 */
export function demoData(now: Date, settings: Partial<Settings> = {}): AppData {
  let n = 0;
  const id = (p: string) => `demo-${p}-${++n}`;
  const me = settings.caregiverName?.trim() || "Guest";
  const data = emptyData({ ...settings, caregiverName: me });

  const mum = id("person");
  const dad = id("person");
  data.people = [
    {
      id: mum,
      name: "Parvin (Maman)",
      birthYear: 1947,
      color: 0,
      allergies: ["Penicillin"],
      conditions: ["Type 2 diabetes", "High blood pressure"],
      emergencyContacts: [
        { name: "Sara", relation: "Daughter", phone: "+44 7700 900123" },
        { name: "Reza", relation: "Son", phone: "+44 7700 900456" },
      ],
      notes: "Prefers to speak Persian. Uses a walking stick.",
    },
    {
      id: dad,
      name: "Hossein (Baba)",
      birthYear: 1944,
      color: 3,
      allergies: [],
      conditions: ["Hypothyroidism", "Glaucoma"],
      emergencyContacts: [{ name: "Sara", relation: "Daughter", phone: "+44 7700 900123" }],
    },
  ];

  // History starts a week ago, so nothing earlier counts as missed.
  const startedAt = startOfDay(addDays(now, -6)).toISOString();
  const med = (m: Omit<Medication, "id" | "active">): Medication => ({ ...m, id: id("med"), active: true, startedAt });
  const metformin = med({
    personId: mum,
    name: "Metformin",
    strength: "500 mg",
    form: "tablet",
    unitsPerDose: 1,
    instructionsEn: "Take with food.",
    instructionsFa: "همراه غذا مصرف شود.",
    schedule: { kind: "scheduled", times: ["08:00", "20:00"] },
    stock: 40,
  });
  const amlodipine = med({
    personId: mum,
    name: "Amlodipine",
    strength: "5 mg",
    form: "tablet",
    unitsPerDose: 1,
    instructionsEn: "Take in the morning.",
    instructionsFa: "صبح‌ها مصرف شود.",
    schedule: { kind: "scheduled", times: ["08:00"] },
    stock: 5,
  });
  const atorvastatin = med({
    personId: mum,
    name: "Atorvastatin",
    strength: "20 mg",
    form: "tablet",
    unitsPerDose: 1,
    instructionsEn: "Take in the evening.",
    instructionsFa: "شب‌ها مصرف شود.",
    schedule: { kind: "scheduled", times: ["21:00"] },
    stock: 28,
  });
  const paracetamol = med({
    personId: mum,
    name: "Paracetamol",
    strength: "500 mg",
    form: "tablet",
    unitsPerDose: 2,
    instructionsEn: "For pain or fever. Do not combine with other paracetamol products.",
    instructionsFa: "برای درد یا تب. همزمان با داروهای دیگرِ حاوی استامینوفن مصرف نشود.",
    schedule: { kind: "prn", minIntervalHours: 4, maxPerDay: 4 },
    stock: 24,
  });
  const levothyroxine = med({
    personId: dad,
    name: "Levothyroxine",
    strength: "50 mcg",
    form: "tablet",
    unitsPerDose: 1,
    instructionsEn: "On an empty stomach, 30 minutes before breakfast.",
    instructionsFa: "ناشتا، ۳۰ دقیقه قبل از صبحانه.",
    schedule: { kind: "scheduled", times: ["07:00"] },
    stock: 60,
  });
  const ramipril = med({
    personId: dad,
    name: "Ramipril",
    strength: "5 mg",
    form: "capsule",
    unitsPerDose: 1,
    instructionsEn: "Same time every day.",
    instructionsFa: "هر روز در یک ساعت ثابت.",
    schedule: { kind: "scheduled", times: ["13:00"] },
    stock: 30,
  });
  const drops = med({
    personId: dad,
    name: "Latanoprost eye drops",
    strength: "0.005%",
    form: "drops",
    unitsPerDose: 1,
    instructionsEn: "One drop in each eye at bedtime.",
    instructionsFa: "هنگام خواب، یک قطره در هر چشم.",
    schedule: { kind: "scheduled", times: ["22:00"] },
  });
  data.medications = [metformin, amlodipine, atorvastatin, paracetamol, levothyroxine, ramipril, drops];

  const others = ["Sara", "Reza", "Nurse Lina"];
  const doses: DoseEvent[] = [];
  const today = dateKey(now);
  // A realistic week: almost everything given, one refusal and one forgotten dose.
  const skippedSlot = slotKey(dateKey(addDays(now, -1)), "21:00");
  const forgottenSlot = slotKey(dateKey(addDays(now, -3)), "22:00");
  let k = 0;
  for (let back = 6; back >= 0; back--) {
    const day = dateKey(addDays(now, -back));
    for (const m of data.medications) {
      if (m.schedule.kind !== "scheduled") continue;
      for (const t of m.schedule.times) {
        const slot = slotKey(day, t);
        const time = parseSlot(slot);
        // Leave today's morning amlodipine un-given so the "missed" state shows.
        if (day === today && m.id === amlodipine.id) continue;
        if (time.getTime() > now.getTime() - 30 * MINUTE) continue;
        if (slot === forgottenSlot && m.id === drops.id) continue;
        const skipped = slot === skippedSlot && m.id === atorvastatin.id;
        doses.push({
          id: id("dose"),
          medicationId: m.id,
          personId: m.personId,
          slot,
          status: skipped ? "skipped" : "given",
          at: new Date(time.getTime() + ((k * 7) % 25) * MINUTE).toISOString(),
          by: back > 0 && k % 3 === 0 ? me : others[k % others.length],
          ...(skipped ? { note: "Refused – felt sick" } : {}),
        });
        k++;
      }
    }
  }
  doses.push({
    id: id("dose"),
    medicationId: paracetamol.id,
    personId: mum,
    status: "given",
    at: new Date(now.getTime() - 2 * HOUR).toISOString(),
    by: "Sara",
    note: "Knee pain",
  });
  data.doses = doses;

  const vitals: Vital[] = [];
  const bp = [
    [138, 84],
    [142, 88],
    [135, 82],
    [131, 80],
    [139, 86],
    [134, 83],
  ];
  bp.forEach(([s, d], i) => {
    vitals.push({
      id: id("vital"),
      personId: mum,
      kind: "bp",
      value: s,
      value2: d,
      at: new Date(now.getTime() - (6 - i) * 24 * HOUR - 2 * HOUR).toISOString(),
      by: others[i % 3],
    });
  });
  vitals.push({
    id: id("vital"),
    personId: mum,
    kind: "bp",
    value: 152,
    value2: 94,
    at: new Date(now.getTime() - 3 * HOUR).toISOString(),
    by: "Reza",
  });
  [128, 142, 118, 160, 135, 124, 146].forEach((g, i) =>
    vitals.push({
      id: id("vital"),
      personId: mum,
      kind: "glucose",
      value: g,
      at: new Date(now.getTime() - (6 - i) * 24 * HOUR - 4 * HOUR).toISOString(),
      by: others[(i + 1) % 3],
    }),
  );
  [36.6, 36.8, 36.7].forEach((t, i) =>
    vitals.push({
      id: id("vital"),
      personId: dad,
      kind: "temp",
      value: t,
      at: new Date(now.getTime() - (2 - i) * 24 * HOUR - 5 * HOUR).toISOString(),
      by: "Nurse Lina",
    }),
  );
  data.vitals = vitals;

  data.notes = [
    {
      id: id("note"),
      personId: mum,
      text: "Maman felt dizzy after standing up this morning and her blood pressure was high. Please check it again this evening.",
      important: true,
      at: new Date(now.getTime() - 3 * HOUR + 5 * MINUTE).toISOString(),
      by: "Reza",
    },
    {
      id: id("note"),
      personId: dad,
      text: "Baba ate a full lunch and went for a short walk in the garden. In good spirits.",
      important: false,
      at: new Date(now.getTime() - 90 * MINUTE).toISOString(),
      by: "Sara",
    },
  ];

  const tomorrow = addDays(now, 1);
  const inFive = addDays(now, 5);
  data.appointments = [
    {
      id: id("appt"),
      personId: mum,
      title: "Heart clinic – Dr Ahmadi",
      at: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 30).toISOString(),
      location: "St Mary's Hospital, Outpatients 2",
      notes: "Bring the blood pressure readings from this week.",
    },
    {
      id: id("appt"),
      personId: dad,
      title: "Eye pressure check",
      at: new Date(inFive.getFullYear(), inFive.getMonth(), inFive.getDate(), 14, 0).toISOString(),
      location: "City Eye Centre",
    },
  ];

  data.settings.demo = true;
  data.settings.handoverReadAt = new Date(now.getTime() - 10 * HOUR).toISOString();
  return data;
}
