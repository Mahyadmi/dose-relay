"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { newId, remove, removePerson, upsert } from "@/lib/actions";
import { fromLocalInput, isValidTime, toLocalInput } from "@/lib/dates";
import { parseNumber } from "@/lib/format";
import { useApp } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import { update } from "@/lib/store";
import type {
  Appointment,
  CareNote,
  EmergencyContact,
  Medication,
  MedForm,
  Person,
  VitalKind,
} from "@/lib/types";
import { VITAL_UNITS, validateVital } from "@/lib/vitals";
import { confirmDialog, showToast } from "./feedback";
import {
  AVATAR_COLORS,
  Button,
  cx,
  Field,
  IconButton,
  Segmented,
  Select,
  Sheet,
  Switch,
  TextArea,
  TextInput,
} from "./ui";

interface FormProps<T> {
  onClose: () => void;
  initial?: T;
  personId?: string;
  onDeleted?: () => void;
}

function FormSheet({
  title,
  onClose,
  onSubmit,
  onDelete,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => boolean | void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const { t } = useApp();
  const formId = `form-${title.replace(/\W+/g, "-")}`;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit() !== false) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      closeLabel={t("common.close")}
      footer={
        <>
          {onDelete && (
            <Button variant="danger" onClick={onDelete} className="me-auto">
              <Trash2 className="size-4" aria-hidden />
              {t("form.delete")}
            </Button>
          )}
          <Button onClick={onClose} className={onDelete ? "" : "flex-1"}>
            {t("form.cancel")}
          </Button>
          <Button type="submit" form={formId} variant="primary" className={onDelete ? "px-6" : "flex-1"}>
            {t("form.save")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
        {children}
      </form>
    </Sheet>
  );
}

function PersonSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data, t } = useApp();
  return (
    <Field label={t("field.for")}>
      {(id) => (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {data.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

const splitList = (s: string) =>
  s
    .split(/[,،\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

/* ---------- Person ---------- */

export function PersonForm({ onClose, initial, onDeleted }: FormProps<Person>) {
  const { t, data } = useApp();
  const [name, setName] = useState(initial?.name ?? "");
  const [birthYear, setBirthYear] = useState(initial?.birthYear ? String(initial.birthYear) : "");
  const [color, setColor] = useState(initial?.color ?? data.people.length % AVATAR_COLORS.length);
  const [allergies, setAllergies] = useState(initial?.allergies.join(", ") ?? "");
  const [conditions, setConditions] = useState(initial?.conditions.join(", ") ?? "");
  const [contacts, setContacts] = useState<EmergencyContact[]>(initial?.emergencyContacts ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState(false);

  const save = () => {
    if (!name.trim()) {
      setError(true);
      return false;
    }
    const year = parseNumber(birthYear);
    const person: Person = {
      id: initial?.id ?? newId(),
      name: name.trim(),
      birthYear: Number.isInteger(year) && year > 1900 && year <= new Date().getFullYear() ? year : undefined,
      color,
      allergies: splitList(allergies),
      conditions: splitList(conditions),
      emergencyContacts: contacts.filter((c) => c.name.trim() || c.phone.trim()),
      notes: notes.trim() || undefined,
    };
    update((d) => upsert(d, "people", person));
    showToast(t("form.saved"));
  };

  const del = initial
    ? async () => {
        const ok = await confirmDialog({
          title: t("form.delete"),
          body: t("person.deleteConfirm", { name: initial.name }),
          confirmLabel: t("form.delete"),
          cancelLabel: t("form.cancel"),
          danger: true,
        });
        if (!ok) return;
        update((d) => removePerson(d, initial.id));
        showToast(t("form.deleted", { name: initial.name }));
        onClose();
        onDeleted?.();
      }
    : undefined;

  return (
    <FormSheet title={initial ? t("person.edit") : t("people.add")} onClose={onClose} onSubmit={save} onDelete={del}>
      <Field label={t("person.name")} error={error ? t("form.required") : undefined}>
        {(id, d) => (
          <TextInput
            id={id}
            aria-describedby={d}
            aria-invalid={error}
            value={name}
            data-autofocus
            onChange={(e) => {
              setName(e.target.value);
              setError(false);
            }}
          />
        )}
      </Field>
      <div role="radiogroup" aria-label={t("person.color")} className="space-y-1.5">
        <p className="text-sm font-medium">{t("person.color")}</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={`${t("person.color")} ${i + 1}`}
              onClick={() => setColor(i)}
              className={cx("size-9 rounded-full ring-offset-2 ring-offset-surface", c, color === i && "ring-3 ring-ink")}
            />
          ))}
        </div>
      </div>
      <Field label={t("person.birthYear")} optional={t("form.optional")}>
        {(id) => (
          <TextInput id={id} inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        )}
      </Field>
      <Field label={t("person.allergies")} hint={t("person.commaHint")}>
        {(id, d) => (
          <TextInput id={id} aria-describedby={d} value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        )}
      </Field>
      <Field label={t("person.conditions")} hint={t("person.commaHint")}>
        {(id, d) => (
          <TextInput id={id} aria-describedby={d} value={conditions} onChange={(e) => setConditions(e.target.value)} />
        )}
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("person.contacts")}</legend>
        {contacts.map((c, i) => {
          const set = (patch: Partial<EmergencyContact>) =>
            setContacts(contacts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-surface-2 p-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <TextInput aria-label={t("contact.name")} placeholder={t("contact.name")} value={c.name} onChange={(e) => set({ name: e.target.value })} />
                <TextInput aria-label={t("contact.relation")} placeholder={t("contact.relation")} value={c.relation} onChange={(e) => set({ relation: e.target.value })} />
                <TextInput aria-label={t("contact.phone")} placeholder={t("contact.phone")} type="tel" dir="ltr" value={c.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <IconButton label={t("contact.remove")} onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>
                <X className="size-5" />
              </IconButton>
            </div>
          );
        })}
        <Button size="sm" variant="soft" onClick={() => setContacts([...contacts, { name: "", relation: "", phone: "" }])}>
          <Plus className="size-4" aria-hidden />
          {t("contact.add")}
        </Button>
      </fieldset>

      <Field label={t("person.extra")} optional={t("form.optional")}>
        {(id) => <TextArea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
    </FormSheet>
  );
}

/* ---------- Medication ---------- */

const FORMS: MedForm[] = ["tablet", "capsule", "liquid", "inhaler", "injection", "drops", "cream", "other"];

export function MedicationForm({ onClose, initial, personId }: FormProps<Medication>) {
  const { t, data } = useApp();
  const [owner, setOwner] = useState(initial?.personId ?? personId ?? data.people[0]?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [strength, setStrength] = useState(initial?.strength ?? "");
  const [form, setForm] = useState<MedForm>(initial?.form ?? "tablet");
  const [units, setUnits] = useState(String(initial?.unitsPerDose ?? 1));
  const [kind, setKind] = useState(initial?.schedule.kind ?? "scheduled");
  const [times, setTimes] = useState<string[]>(
    initial?.schedule.kind === "scheduled" ? initial.schedule.times : ["08:00"],
  );
  const [minInterval, setMinInterval] = useState(
    String(initial?.schedule.kind === "prn" ? initial.schedule.minIntervalHours : 4),
  );
  const [maxPerDay, setMaxPerDay] = useState(String(initial?.schedule.kind === "prn" ? initial.schedule.maxPerDay : 4));
  const [instrEn, setInstrEn] = useState(initial?.instructionsEn ?? "");
  const [instrFa, setInstrFa] = useState(initial?.instructionsFa ?? "");
  const [stock, setStock] = useState(initial?.stock !== undefined ? String(initial.stock) : "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const save = () => {
    const unitsN = parseNumber(units);
    const minN = parseNumber(minInterval);
    const maxN = parseNumber(maxPerDay);
    const stockN = stock.trim() ? parseNumber(stock) : undefined;
    const cleanTimes = [...new Set(times.filter(isValidTime))].sort();
    const e: Record<string, boolean> = {
      name: !name.trim(),
      units: !(unitsN > 0),
      times: kind === "scheduled" && cleanTimes.length === 0,
      min: kind === "prn" && !(minN > 0 && minN <= 72),
      max: kind === "prn" && !(Number.isInteger(maxN) && maxN > 0 && maxN <= 24),
      stock: stockN !== undefined && !(stockN >= 0),
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return false;
    const med: Medication = {
      id: initial?.id ?? newId(),
      personId: owner,
      name: name.trim(),
      strength: strength.trim(),
      form,
      unitsPerDose: unitsN,
      instructionsEn: instrEn.trim(),
      instructionsFa: instrFa.trim(),
      schedule:
        kind === "scheduled"
          ? { kind, times: cleanTimes }
          : { kind: "prn", minIntervalHours: minN, maxPerDay: maxN },
      stock: stockN,
      active,
      startedAt: initial?.startedAt ?? new Date().toISOString(),
    };
    update((d) => upsert(d, "medications", med));
    showToast(t("form.saved"));
  };

  const del = initial
    ? async () => {
        const ok = await confirmDialog({
          title: t("form.delete"),
          body: t("med.deleteConfirm", { name: initial.name }),
          confirmLabel: t("form.delete"),
          cancelLabel: t("form.cancel"),
          danger: true,
        });
        if (!ok) return;
        update((d) => remove(d, "medications", initial.id));
        showToast(t("form.deleted", { name: initial.name }));
        onClose();
      }
    : undefined;

  return (
    <FormSheet title={initial ? initial.name : t("med.add")} onClose={onClose} onSubmit={save} onDelete={del}>
      {data.people.length > 1 && <PersonSelect value={owner} onChange={setOwner} />}
      <Field label={t("med.name")} error={errors.name ? t("form.required") : undefined}>
        {(id, d) => (
          <TextInput id={id} aria-describedby={d} aria-invalid={errors.name} value={name} data-autofocus={!initial || undefined} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("med.strength")}>
          {(id) => (
            <TextInput id={id} value={strength} placeholder={t("med.strengthPlaceholder")} onChange={(e) => setStrength(e.target.value)} />
          )}
        </Field>
        <Field label={t("med.form")}>
          {(id) => (
            <Select id={id} value={form} onChange={(e) => setForm(e.target.value as MedForm)}>
              {FORMS.map((x) => (
                <option key={x} value={x}>
                  {t(`form.${x}` as MessageKey)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("med.when")}</p>
        <Segmented
          label={t("med.when")}
          value={kind}
          onChange={setKind}
          options={[
            { value: "scheduled", label: t("med.scheduled") },
            { value: "prn", label: t("med.prn") },
          ]}
        />
      </div>

      {kind === "scheduled" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("med.times")}</legend>
          <div className="flex flex-wrap gap-2">
            {times.map((tm, i) => (
              <div key={i} className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
                <TextInput
                  type="time"
                  aria-label={`${t("med.times")} ${i + 1}`}
                  value={tm}
                  className="w-32 border-0 bg-transparent"
                  onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {times.length > 1 && (
                  <IconButton label={t("med.removeTime")} className="size-9" onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </IconButton>
                )}
              </div>
            ))}
            <Button size="sm" variant="soft" className="min-h-13" onClick={() => setTimes([...times, "20:00"])}>
              <Plus className="size-4" aria-hidden />
              {t("med.addTime")}
            </Button>
          </div>
          {errors.times && <p className="text-sm text-danger">{t("form.required")}</p>}
        </fieldset>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("med.minInterval")} error={errors.min ? t("form.required") : undefined}>
            {(id) => <TextInput id={id} inputMode="decimal" value={minInterval} onChange={(e) => setMinInterval(e.target.value)} />}
          </Field>
          <Field label={t("med.maxPerDay")} error={errors.max ? t("form.required") : undefined}>
            {(id) => <TextInput id={id} inputMode="numeric" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} />}
          </Field>
        </div>
      )}

      <Field label={t("med.instructionsEn")} optional={t("form.optional")}>
        {(id) => <TextArea id={id} dir="ltr" lang="en" rows={2} value={instrEn} onChange={(e) => setInstrEn(e.target.value)} />}
      </Field>
      <Field label={t("med.instructionsFa")} optional={t("form.optional")}>
        {(id) => <TextArea id={id} dir="rtl" lang="fa" rows={2} value={instrFa} onChange={(e) => setInstrFa(e.target.value)} />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("med.unitsPerDose")} error={errors.units ? t("form.required") : undefined}>
          {(id) => <TextInput id={id} inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} />}
        </Field>
        <Field label={t("med.stock")} optional={t("form.optional")} error={errors.stock ? t("form.required") : undefined}>
          {(id) => <TextInput id={id} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />}
        </Field>
      </div>
      <p className="-mt-2 text-sm text-muted">{t("med.stockHint")}</p>
      {initial && <Switch checked={active} onChange={setActive} label={t("med.active")} />}
    </FormSheet>
  );
}

/* ---------- Vital reading ---------- */

const VITAL_KINDS: VitalKind[] = ["bp", "glucose", "temp", "pulse", "spo2", "weight"];

export function VitalForm({ onClose, personId, initialKind = "bp" }: FormProps<never> & { initialKind?: VitalKind }) {
  const { t, data } = useApp();
  const [owner, setOwner] = useState(personId ?? data.people[0]?.id ?? "");
  const [kind, setKind] = useState<VitalKind>(initialKind);
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [error, setError] = useState(false);

  const save = () => {
    const v = parseNumber(value);
    const v2 = kind === "bp" ? parseNumber(value2) : undefined;
    if (!validateVital(kind, v, v2)) {
      setError(true);
      return false;
    }
    update((d) =>
      upsert(d, "vitals", {
        id: newId(),
        personId: owner,
        kind,
        value: v,
        ...(kind === "bp" ? { value2: v2 } : {}),
        at: fromLocalInput(when).toISOString(),
        by: d.settings.caregiverName || "—",
      }),
    );
    showToast(t("form.saved"));
  };

  return (
    <FormSheet title={t("vital.add")} onClose={onClose} onSubmit={save}>
      {!personId && data.people.length > 1 && <PersonSelect value={owner} onChange={setOwner} />}
      <Field label={t("vital.type")}>
        {(id) => (
          <Select
            id={id}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as VitalKind);
              setError(false);
            }}
          >
            {VITAL_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`vital.${k}` as MessageKey)} ({VITAL_UNITS[k]})
              </option>
            ))}
          </Select>
        )}
      </Field>
      {kind === "bp" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("vital.systolic")}>
            {(id) => <TextInput id={id} inputMode="numeric" data-autofocus value={value} aria-invalid={error} onChange={(e) => { setValue(e.target.value); setError(false); }} />}
          </Field>
          <Field label={t("vital.diastolic")}>
            {(id) => <TextInput id={id} inputMode="numeric" value={value2} aria-invalid={error} onChange={(e) => { setValue2(e.target.value); setError(false); }} />}
          </Field>
        </div>
      ) : (
        <Field label={`${t("vital.value")} (${VITAL_UNITS[kind]})`}>
          {(id) => <TextInput id={id} inputMode="decimal" data-autofocus value={value} aria-invalid={error} onChange={(e) => { setValue(e.target.value); setError(false); }} />}
        </Field>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t("vital.invalid")}
        </p>
      )}
      <Field label={t("field.time")}>
        {(id) => <TextInput id={id} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
      </Field>
    </FormSheet>
  );
}

/* ---------- Note ---------- */

export function NoteForm({ onClose, personId }: FormProps<CareNote>) {
  const { t, data } = useApp();
  const [owner, setOwner] = useState(personId ?? data.people[0]?.id ?? "");
  const [text, setText] = useState("");
  const [important, setImportant] = useState(false);
  const [error, setError] = useState(false);

  const save = () => {
    if (!text.trim()) {
      setError(true);
      return false;
    }
    update((d) =>
      upsert(d, "notes", {
        id: newId(),
        personId: owner,
        text: text.trim(),
        important,
        at: new Date().toISOString(),
        by: d.settings.caregiverName || "—",
      }),
    );
    showToast(t("form.saved"));
  };

  return (
    <FormSheet title={t("note.add")} onClose={onClose} onSubmit={save}>
      {!personId && data.people.length > 1 && <PersonSelect value={owner} onChange={setOwner} />}
      <Field label={t("note.text")} error={error ? t("form.required") : undefined}>
        {(id, d) => (
          <TextArea id={id} aria-describedby={d} rows={4} data-autofocus value={text} onChange={(e) => { setText(e.target.value); setError(false); }} />
        )}
      </Field>
      <Switch checked={important} onChange={setImportant} label={t("note.markImportant")} />
    </FormSheet>
  );
}

/* ---------- Appointment ---------- */

export function AppointmentForm({ onClose, initial, personId }: FormProps<Appointment>) {
  const { t, data } = useApp();
  const [owner, setOwner] = useState(initial?.personId ?? personId ?? data.people[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [when, setWhen] = useState(() => {
    if (initial) return toLocalInput(new Date(initial.at));
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return toLocalInput(d);
  });
  const [where, setWhere] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState(false);

  const save = () => {
    if (!title.trim() || !when) {
      setError(true);
      return false;
    }
    update((d) =>
      upsert(d, "appointments", {
        id: initial?.id ?? newId(),
        personId: owner,
        title: title.trim(),
        at: fromLocalInput(when).toISOString(),
        location: where.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    );
    showToast(t("form.saved"));
  };

  const del = initial
    ? () => {
        update((d) => remove(d, "appointments", initial.id));
        showToast(t("form.deleted", { name: initial.title }));
        onClose();
      }
    : undefined;

  return (
    <FormSheet title={initial ? initial.title : t("appt.add")} onClose={onClose} onSubmit={save} onDelete={del}>
      {!personId && data.people.length > 1 && <PersonSelect value={owner} onChange={setOwner} />}
      <Field label={t("appt.title")} error={error ? t("form.required") : undefined}>
        {(id, d) => <TextInput id={id} aria-describedby={d} data-autofocus={!initial || undefined} value={title} onChange={(e) => { setTitle(e.target.value); setError(false); }} />}
      </Field>
      <Field label={t("appt.when")}>
        {(id) => <TextInput id={id} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
      </Field>
      <Field label={t("appt.where")} optional={t("form.optional")}>
        {(id) => <TextInput id={id} value={where} onChange={(e) => setWhere(e.target.value)} />}
      </Field>
      <Field label={t("appt.notes")} optional={t("form.optional")}>
        {(id) => <TextArea id={id} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
    </FormSheet>
  );
}
