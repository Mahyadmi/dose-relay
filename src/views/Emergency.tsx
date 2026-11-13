"use client";

import { ArrowLeft, Phone, Printer, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import { useApp } from "@/lib/hooks";

export function BackToPerson({ id }: { id: string }) {
  const { t } = useApp();
  return (
    <div className="no-print mb-3 flex items-center justify-between">
      <Link
        href={`/person?id=${encodeURIComponent(id)}`}
        className="-ms-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("common.back")}
      </Link>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden />
        {t("common.print")}
      </Button>
    </div>
  );
}

export function Emergency() {
  const { data, t, f } = useApp();
  const id = useSearchParams().get("id");
  const person = data.people.find((p) => p.id === id);
  if (!person) return <EmptyState icon={<ShieldAlert className="size-7" />} title={t("person.notFound")} />;

  const meds = data.medications.filter((m) => m.personId === person.id && m.active);
  const fa = data.settings.locale === "fa";

  return (
    <>
      <BackToPerson id={person.id} />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 bg-danger px-5 py-4 text-white">
          <ShieldAlert className="size-7 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide opacity-90">{t("emg.title")}</p>
            <h1 className="text-2xl font-bold">{person.name}</h1>
          </div>
        </div>
        <div className="space-y-5 p-5">
          {person.birthYear && <p className="text-muted">{t("emg.born", { year: f.digits(String(person.birthYear)) })}</p>}

          <Block title={t("emg.allergies")}>
            {person.allergies.length ? (
              <ul className="flex flex-wrap gap-2">
                {person.allergies.map((a) => (
                  <li key={a} className="rounded-lg border-2 border-danger px-3 py-1 text-lg font-bold text-danger">
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("emg.none")}</p>
            )}
          </Block>

          <Block title={t("emg.conditions")}>
            <p className="text-lg">{person.conditions.length ? person.conditions.join(fa ? "، " : ", ") : t("emg.none")}</p>
          </Block>

          <Block title={t("emg.medicines")}>
            {meds.length ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {meds.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                    <span className="font-semibold" dir="ltr">
                      {m.name} {m.strength}
                    </span>
                    <span className="text-sm text-muted">
                      {m.schedule.kind === "scheduled"
                        ? m.schedule.times.map((x) => f.digits(x)).join(fa ? "، " : ", ")
                        : t("med.prn")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("emg.none")}</p>
            )}
          </Block>

          {person.emergencyContacts.length > 0 && (
            <Block title={t("emg.contacts")}>
              <ul className="space-y-2">
                {person.emergencyContacts.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="font-semibold">{c.name}</span>
                      {c.relation && <span className="text-muted"> · {c.relation}</span>}
                    </span>
                    <a
                      href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                      dir="ltr"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-soft px-3 font-semibold text-primary"
                    >
                      <Phone className="size-4" aria-hidden />
                      {c.phone}
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {person.notes && (
            <Block title={t("emg.notes")}>
              <p dir="auto">{person.notes}</p>
            </Block>
          )}

          <p className="border-t border-line pt-3 text-xs text-muted">
            {t("emg.updated", { date: f.full(new Date()) })} · DoseRelay
          </p>
        </div>
      </Card>
    </>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}
