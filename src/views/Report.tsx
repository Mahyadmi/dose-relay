"use client";

import { ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Card, EmptyState, Segmented } from "@/components/ui";
import { addDays, startOfDay } from "@/lib/dates";
import { adherence, slotsBetween } from "@/lib/doses";
import { useApp, useNow } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import type { VitalKind } from "@/lib/types";
import { VITAL_UNITS, vitalFlag } from "@/lib/vitals";
import { BackToPerson } from "./Emergency";
import { formatVital } from "./Person";

export function Report() {
  const { data, t, f } = useApp();
  const id = useSearchParams().get("id");
  const now = useNow();
  const [days, setDays] = useState(30);
  const person = data.people.find((p) => p.id === id);
  const from = useMemo(() => startOfDay(addDays(now, -(days - 1))), [now, days]);

  const perMed = useMemo(() => {
    if (!person) return [];
    return data.medications
      .filter((m) => m.personId === person.id && m.schedule.kind === "scheduled")
      .map((m) => ({ med: m, stats: adherence(slotsBetween({ ...data, medications: [m] }, from, now, now)) }))
      .filter((x) => x.stats.total > 0 || x.med.active);
  }, [data, person, from, now]);

  if (!person) return <EmptyState icon={<ShieldAlert className="size-7" />} title={t("person.notFound")} />;

  const inRange = (iso: string) => new Date(iso) >= from && new Date(iso) <= now;
  const total = adherence(slotsBetween(data, from, now, now, person.id));
  const prn = data.medications
    .filter((m) => m.personId === person.id && m.schedule.kind === "prn")
    .map((m) => ({
      med: m,
      n: data.doses.filter((d) => d.medicationId === m.id && d.status === "given" && inRange(d.at)).length,
    }))
    .filter((x) => x.n > 0);
  const vitals = data.vitals.filter((v) => v.personId === person.id && inRange(v.at));
  const kinds = [...new Set(vitals.map((v) => v.kind))] as VitalKind[];
  const notes = data.notes
    .filter((n) => n.personId === person.id && n.important && inRange(n.at))
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <>
      <BackToPerson id={person.id} />
      <div className="no-print mb-4">
        <Segmented
          label={t("report.title")}
          value={days}
          onChange={setDays}
          options={[7, 30, 90].map((d) => ({ value: d, label: t("report.days", { n: d }) }))}
        />
      </div>

      <Card className="space-y-6 p-5">
        <header className="border-b border-line pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("report.title")}</p>
          <h1 className="text-2xl font-bold">{person.name}</h1>
          <p className="text-muted">{t("report.period", { from: f.full(from), to: f.full(now) })}</p>
          {person.allergies.length > 0 && (
            <p className="mt-2 font-semibold text-danger">
              {t("emg.allergies")}: {person.allergies.join(", ")}
            </p>
          )}
        </header>

        <Section title={t("report.doses")}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label={t("report.given")} value={f.num(total.given)} cls="text-ok" />
            <Stat label={t("report.skipped")} value={f.num(total.skipped)} cls="text-muted" />
            <Stat label={t("report.missed")} value={f.num(total.missed)} cls="text-danger" />
          </div>
          {perMed.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-line">
                {perMed.map(({ med, stats }) => (
                  <tr key={med.id}>
                    <td className="py-2 font-medium" dir="ltr">
                      {med.name} {med.strength}
                    </td>
                    <td className="py-2 text-end tabular-nums text-muted">
                      {f.num(stats.given)}/{f.num(stats.total)} · {f.num(stats.rate)}
                      {data.settings.locale === "fa" ? "٪" : "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {prn.length > 0 && (
          <Section title={t("report.prn")}>
            <ul className="space-y-1">
              {prn.map(({ med, n }) => (
                <li key={med.id}>{t("report.prnLine", { med: `${med.name} ${med.strength}`, n })}</li>
              ))}
            </ul>
          </Section>
        )}

        {kinds.length > 0 && (
          <Section title={t("report.readings")}>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {kinds.map((k) => {
                  const list = vitals.filter((v) => v.kind === k);
                  const vals = list.map((v) => v.value);
                  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                  const avg2 =
                    k === "bp" ? list.reduce((a, v) => a + (v.value2 ?? 0), 0) / list.length : undefined;
                  const flagged = list.filter((v) => vitalFlag(v) !== "normal").length;
                  return (
                    <tr key={k} className="align-top">
                      <td className="py-2 font-medium">
                        {t(`vital.${k}` as MessageKey)}
                        <span className="block text-xs font-normal text-muted">
                          {f.num(list.length)} × · {VITAL_UNITS[k]}
                        </span>
                      </td>
                      <td className="py-2 text-end tabular-nums">
                        {t("report.average")} <bdi dir="ltr">{formatVital({ kind: k, value: avg, value2: avg2 }, f)}</bdi>
                        <span className="block text-xs text-muted">
                          {t("report.range", { min: f.num(Math.min(...vals)), max: f.num(Math.max(...vals)) })}
                          {flagged > 0 && <span className="text-danger"> · {f.num(flagged)} ⚠</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        )}

        {notes.length > 0 && (
          <Section title={t("report.notes")}>
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id}>
                  <p dir="auto">{n.text}</p>
                  <p className="text-xs text-muted">
                    {n.by} · {f.dateTime(new Date(n.at))}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <p className="border-t border-line pt-3 text-xs text-muted">{t("report.footer")}</p>
      </Card>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
