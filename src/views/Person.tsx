"use client";

import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Pencil,
  Plus,
  ShieldAlert,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MedIcon, MedName } from "@/components/DoseCards";
import { AppointmentForm, MedicationForm, NoteForm, PersonForm, VitalForm } from "@/components/forms";
import { Sparkline } from "@/components/Sparkline";
import { Avatar, Button, Card, cx, EmptyState, SectionTitle } from "@/components/ui";
import { addDays } from "@/lib/dates";
import { adherence, isLowStock, slotsBetween, stockDaysLeft } from "@/lib/doses";
import { useApp, useNow, type I18n } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import type { Appointment, Medication, Vital, VitalKind } from "@/lib/types";
import { VITAL_UNITS, vitalFlag } from "@/lib/vitals";

type Editing =
  | { kind: "person" }
  | { kind: "med"; med?: Medication }
  | { kind: "vital"; vital: VitalKind }
  | { kind: "note" }
  | { kind: "appt"; appt?: Appointment }
  | null;

export function formatVital(v: Pick<Vital, "kind" | "value" | "value2">, f: I18n["f"]) {
  const main = v.kind === "bp" ? `${f.num(v.value, 0)}/${f.num(v.value2 ?? 0, 0)}` : f.num(v.value, 1);
  return `${main} ${VITAL_UNITS[v.kind]}`;
}

export function FlagPill({ v }: { v: Vital }) {
  const { t } = useApp();
  const flag = vitalFlag(v);
  if (flag === "normal") return null;
  return (
    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
      {t(flag === "high" ? "vital.high" : "vital.low")}
    </span>
  );
}

export function Person() {
  const { data, t, f } = useApp();
  const id = useSearchParams().get("id");
  const router = useRouter();
  const now = useNow();
  const [editing, setEditing] = useState<Editing>(null);
  const person = data.people.find((p) => p.id === id);

  const stats = useMemo(
    () => (person ? adherence(slotsBetween(data, addDays(now, -7), now, now, person.id)) : null),
    [data, now, person],
  );

  if (!person) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-7" />}
        title={t("person.notFound")}
        action={
          <Link href="/people" className="font-semibold text-primary underline">
            {t("common.back")}
          </Link>
        }
      />
    );
  }

  const meds = data.medications
    .filter((m) => m.personId === person.id)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  const vitalsByKind = new Map<VitalKind, Vital[]>();
  for (const v of [...data.vitals].filter((v) => v.personId === person.id).sort((a, b) => (a.at < b.at ? -1 : 1))) {
    vitalsByKind.set(v.kind, [...(vitalsByKind.get(v.kind) ?? []), v]);
  }
  const notes = data.notes
    .filter((n) => n.personId === person.id)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 10);
  const appts = data.appointments
    .filter((a) => a.personId === person.id && new Date(a.at) >= addDays(now, -1))
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  const year = new Date().getFullYear();

  return (
    <>
      <Link
        href="/people"
        className="-ms-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("nav.people")}
      </Link>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar name={person.name} color={person.color} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
            {person.birthYear && <p className="text-muted">{t("person.age", { n: year - person.birthYear })}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: "person" })}>
            <Pencil className="size-4" aria-hidden />
            {t("person.edit")}
          </Button>
        </div>
        {(person.allergies.length > 0 || person.conditions.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {person.allergies.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                <ShieldAlert className="size-3.5" aria-hidden />
                {a}
              </span>
            ))}
            {person.conditions.map((c) => (
              <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                {c}
              </span>
            ))}
          </div>
        )}
        {stats && stats.total > 0 && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cx("h-full rounded-full", stats.rate >= 90 ? "bg-ok" : stats.rate >= 70 ? "bg-warn" : "bg-danger")}
                style={{ width: `${stats.rate}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm text-muted">{t("person.adherence", { rate: stats.rate })}</p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/emergency?id=${encodeURIComponent(person.id)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger-soft px-3 text-sm font-semibold text-danger"
          >
            <ShieldAlert className="size-4" aria-hidden />
            {t("person.emergency")}
          </Link>
          <Link
            href={`/report?id=${encodeURIComponent(person.id)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-soft px-3 text-sm font-semibold text-primary"
          >
            <ClipboardList className="size-4" aria-hidden />
            {t("person.report")}
          </Link>
        </div>
      </Card>

      {/* Medicines */}
      <SectionTitle action={<AddButton label={t("med.add")} onClick={() => setEditing({ kind: "med" })} />}>
        {t("person.medicines")}
      </SectionTitle>
      {meds.length === 0 ? (
        <Card className="p-4 text-muted">{t("med.none")}</Card>
      ) : (
        <Card className="divide-y divide-line">
          {meds.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditing({ kind: "med", med: m })}
              className={cx("flex w-full items-start gap-3 p-4 text-start hover:bg-surface-2", !m.active && "opacity-60")}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <MedIcon form={m.form} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  <MedName name={m.name} strength={m.strength} />
                  {!m.active && (
                    <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{t("med.paused")}</span>
                  )}
                </span>
                <span className="block text-sm text-muted">
                  {m.schedule.kind === "scheduled"
                    ? t("med.everyDay", { times: m.schedule.times.map((x) => f.digits(x)).join(data.settings.locale === "fa" ? "، " : ", ") })
                    : t("med.prnRule", { h: m.schedule.minIntervalHours, max: m.schedule.maxPerDay })}
                </span>
                {m.stock !== undefined && (
                  <span className={cx("block text-sm", isLowStock(m) ? "font-semibold text-late" : "text-muted")}>
                    {stockDaysLeft(m) !== undefined
                      ? t("stock.days", { n: stockDaysLeft(m)! })
                      : t("stock.units", { n: m.stock })}
                  </span>
                )}
              </span>
              <Pencil className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
            </button>
          ))}
        </Card>
      )}

      {/* Readings */}
      <SectionTitle action={<AddButton label={t("vital.add")} onClick={() => setEditing({ kind: "vital", vital: "bp" })} />}>
        {t("person.vitals")}
      </SectionTitle>
      {vitalsByKind.size === 0 ? (
        <Card className="p-4 text-muted">{t("vital.none")}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...vitalsByKind.entries()].map(([kind, list]) => {
            const last = list.at(-1)!;
            const recent = list.slice(-7);
            const series = kind === "bp" ? [recent.map((v) => v.value), recent.map((v) => v.value2 ?? 0)] : [recent.map((v) => v.value)];
            return (
              <button key={kind} type="button" onClick={() => setEditing({ kind: "vital", vital: kind })} className="text-start">
                <Card className="p-4 hover:bg-surface-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-muted">{t(`vital.${kind}` as MessageKey)}</p>
                    <FlagPill v={last} />
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xl font-bold tabular-nums">
                        <bdi dir="ltr">{formatVital(last, f)}</bdi>
                      </p>
                      <p className="text-xs text-muted">
                        {f.dateTime(new Date(last.at))} · {last.by}
                      </p>
                    </div>
                    <Sparkline series={series} />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* Notes */}
      <SectionTitle action={<AddButton label={t("note.add")} onClick={() => setEditing({ kind: "note" })} />}>
        {t("person.notes")}
      </SectionTitle>
      {notes.length === 0 ? (
        <Card className="p-4 text-muted">{t("note.none")}</Card>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className={cx("p-4", n.important && "border-s-4 border-s-warn")}>
              {n.important && (
                <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-warn">
                  <Star className="size-3.5" aria-hidden />
                  {t("note.important")}
                </p>
              )}
              <p dir="auto" className="whitespace-pre-line">{n.text}</p>
              <p className="mt-1.5 text-xs text-muted">
                {n.by} · {f.dateTime(new Date(n.at))}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Appointments */}
      <SectionTitle action={<AddButton label={t("appt.add")} onClick={() => setEditing({ kind: "appt" })} />}>
        {t("person.appointments")}
      </SectionTitle>
      {appts.length === 0 ? (
        <Card className="p-4 text-muted">{t("appt.none")}</Card>
      ) : (
        <Card className="divide-y divide-line">
          {appts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setEditing({ kind: "appt", appt: a })}
              className="flex w-full items-start gap-3 p-4 text-start hover:bg-surface-2"
            >
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-info" aria-hidden />
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block font-semibold">{a.title}</span>
                <span className="block text-sm text-muted">
                  {f.date(new Date(a.at), { weekday: "short", day: "numeric", month: "long" })} · {f.time(new Date(a.at))}
                </span>
                {a.location && <span className="block text-sm text-muted">{a.location}</span>}
              </span>
            </button>
          ))}
        </Card>
      )}

      {editing?.kind === "person" && (
        <PersonForm initial={person} onClose={() => setEditing(null)} onDeleted={() => router.push("/people")} />
      )}
      {editing?.kind === "med" && <MedicationForm initial={editing.med} personId={person.id} onClose={() => setEditing(null)} />}
      {editing?.kind === "vital" && <VitalForm personId={person.id} initialKind={editing.vital} onClose={() => setEditing(null)} />}
      {editing?.kind === "note" && <NoteForm personId={person.id} onClose={() => setEditing(null)} />}
      {editing?.kind === "appt" && <AppointmentForm initial={editing.appt} personId={person.id} onClose={() => setEditing(null)} />}
    </>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="soft" onClick={onClick}>
      <Plus className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
