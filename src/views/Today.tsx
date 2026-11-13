"use client";

import { ArrowRightLeft, CalendarClock, ChevronDown, PartyPopper, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DoseCard, PrnCard } from "@/components/DoseCards";
import { Avatar, Button, Card, cx, EmptyState, SectionTitle } from "@/components/ui";
import { slotsForDay } from "@/lib/doses";
import { formatDate } from "@/lib/format";
import { buildHandover, defaultSince } from "@/lib/handover";
import { useApp, useNow } from "@/lib/hooks";

export function Today() {
  const { data, t, f } = useApp();
  const now = useNow();
  const [personId, setPersonId] = useState<string | undefined>();
  const s = data.settings;
  const people = new Map(data.people.map((p) => [p.id, p]));

  const slots = useMemo(() => slotsForDay(data, now, now, personId), [data, now, personId]);
  const prn = data.medications.filter(
    (m) => m.active && m.schedule.kind === "prn" && (!personId || m.personId === personId),
  );
  const handover = useMemo(() => buildHandover(data, defaultSince(data, now), now, s.caregiverName), [data, now, s.caregiverName]);
  const appointments = handover.upcoming.filter((a) => !personId || a.personId === personId);

  const attention = slots.filter((x) => x.state === "missed" || x.state === "late");
  const due = slots.filter((x) => x.state === "due");
  const later = slots.filter((x) => x.state === "upcoming");
  const done = slots.filter((x) => x.state === "given" || x.state === "skipped");

  const hour = now.getHours();
  const greeting = hour < 12 ? t("greet.morning") : hour < 17 ? t("greet.afternoon") : t("greet.evening");
  // Show the other calendar too, so mixed families can talk about the same day.
  const otherCalendar = formatDate(now, { ...s, calendar: s.calendar === "persian" ? "gregorian" : "persian" }, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const showPerson = !personId && data.people.length > 1;

  if (data.people.length === 0) {
    return (
      <>
        <Header greeting={greeting} name={s.caregiverName} date={f.date(now)} other={otherCalendar} fa={s.locale === "fa"} />
        <EmptyState
          icon={<UserPlus className="size-7" />}
          title={t("empty.today.title")}
          body={t("empty.today.body")}
          action={
            <Link href="/people?new=1">
              <Button variant="primary" size="lg" tabIndex={-1}>
                {t("people.add")}
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  const renderSlots = (list: typeof slots) => (
    <div className="space-y-3">
      {list.map((x) => (
        <DoseCard key={x.slot + x.med.id} slot={x} person={people.get(x.med.personId)} showPerson={showPerson} />
      ))}
    </div>
  );

  return (
    <>
      <Header greeting={greeting} name={s.caregiverName} date={f.date(now)} other={otherCalendar} fa={s.locale === "fa"} />

      {handover.attention > 0 && (
        <Card className="mt-4 flex flex-wrap items-center gap-3 border-warn/40 bg-warn-soft p-4">
          <ArrowRightLeft className="size-6 shrink-0 text-warn" aria-hidden />
          <div className="min-w-0 flex-1 basis-48">
            <p className="font-semibold">{t("today.attention", { n: handover.attention })}</p>
            <p className="text-sm text-muted">{t("today.attentionBody")}</p>
          </div>
          <Link
            href="/handover"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-surface px-4 text-sm font-semibold shadow-card hover:bg-surface-2 max-sm:w-full"
          >
            {t("today.readHandover")}
          </Link>
        </Card>
      )}

      {data.people.length > 1 && (
        <div role="group" aria-label={t("today.filter")} className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip active={!personId} onClick={() => setPersonId(undefined)}>
            {t("today.everyone")}
          </Chip>
          {data.people.map((p) => (
            <Chip key={p.id} active={personId === p.id} onClick={() => setPersonId(p.id)}>
              <Avatar name={p.name} color={p.color} size="sm" />
              {p.name}
            </Chip>
          ))}
        </div>
      )}

      {attention.length > 0 && (
        <section aria-labelledby="sec-attention">
          <SectionTitle count={f.num(attention.length)}>
            <span id="sec-attention" className="text-danger">
              {t("section.attention")}
            </span>
          </SectionTitle>
          {renderSlots(attention)}
        </section>
      )}

      <section aria-labelledby="sec-due">
        <SectionTitle count={due.length ? f.num(due.length) : undefined}>
          <span id="sec-due">{t("section.due")}</span>
        </SectionTitle>
        {due.length ? (
          renderSlots(due)
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <PartyPopper className="size-6 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">{t("empty.allDone")}</p>
              <p className="text-sm text-muted">{t("empty.allDoneBody")}</p>
            </div>
          </Card>
        )}
      </section>

      {appointments.length > 0 && (
        <section aria-labelledby="sec-appt">
          <SectionTitle>
            <span id="sec-appt">{t("today.appointments")}</span>
          </SectionTitle>
          <div className="space-y-2">
            {appointments.map((a) => (
              <Card key={a.id} className="flex items-center gap-3 p-4">
                <CalendarClock className="size-6 shrink-0 text-info" aria-hidden />
                <div className="min-w-0">
                  <p dir="auto" className="font-semibold">{a.title}</p>
                  <p className="text-sm text-muted">
                    {f.dateTime(new Date(a.at))}
                    {showPerson && ` · ${people.get(a.personId)?.name ?? ""}`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {prn.length > 0 && (
        <section aria-labelledby="sec-prn">
          <SectionTitle>
            <span id="sec-prn">{t("section.prn")}</span>
          </SectionTitle>
          <div className="space-y-3">
            {prn.map((m) => (
              <PrnCard key={m.id} med={m} person={people.get(m.personId)} showPerson={showPerson} now={now} />
            ))}
          </div>
        </section>
      )}

      {later.length > 0 && (
        <section aria-labelledby="sec-later">
          <SectionTitle count={f.num(later.length)}>
            <span id="sec-later">{t("section.later")}</span>
          </SectionTitle>
          {renderSlots(later)}
        </section>
      )}

      {done.length > 0 && (
        <details className="group mt-6">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl px-1 text-sm font-semibold uppercase tracking-wide text-muted">
            <span>
              {t("section.done")}
              <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{f.num(done.length)}</span>
            </span>
            <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-2">{renderSlots(done)}</div>
        </details>
      )}
    </>
  );
}

function Header({ greeting, name, date, other, fa }: { greeting: string; name: string; date: string; other: string; fa: boolean }) {
  return (
    <header>
      <p className="text-sm font-medium text-primary">{date}</p>
      <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
        {greeting}
        {name && `${fa ? "،" : ","} ${name}`}
      </h1>
      <p className="mt-0.5 text-sm text-muted">{other}</p>
    </header>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
