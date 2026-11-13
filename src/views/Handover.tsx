"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  MessageSquareText,
  PackageMinus,
  Send,
  Star,
  Activity,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { MedName, StatePill } from "@/components/DoseCards";
import { showToast } from "@/components/feedback";
import { ShareSheet } from "@/components/ShareSheet";
import { Button, Card, cx, Segmented, SectionTitle } from "@/components/ui";
import { HOUR } from "@/lib/dates";
import { stockDaysLeft } from "@/lib/doses";
import { buildHandover, defaultSince } from "@/lib/handover";
import { useApp, useNow } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import { update } from "@/lib/store";
import { vitalFlag } from "@/lib/vitals";
import { FlagPill, formatVital } from "./Person";

type Range = "read" | "12" | "24";

export function Handover() {
  const { data, t, f } = useApp();
  const now = useNow();
  const [range, setRange] = useState<Range>("read");
  const [sharing, setSharing] = useState(false);
  const people = new Map(data.people.map((p) => [p.id, p]));
  const meds = new Map(data.medications.map((m) => [m.id, m]));

  const since = useMemo(() => {
    if (range === "12") return new Date(now.getTime() - 12 * HOUR);
    if (range === "24") return new Date(now.getTime() - 24 * HOUR);
    return defaultSince(data, now);
  }, [range, data, now]);
  const h = useMemo(() => buildHandover(data, since, now, data.settings.caregiverName), [data, since, now]);
  const who = (personId: string) => (data.people.length > 1 ? people.get(personId)?.name : undefined);
  const nothing =
    h.attention === 0 && h.vitals.length === 0 && h.upcoming.length === 0 && h.lowStock.length === 0;

  const markRead = () => {
    update((d) => ({ ...d, settings: { ...d.settings, handoverReadAt: new Date().toISOString() } }));
    setRange("read");
    showToast(t("handover.marked"));
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{t("handover.title")}</h1>
      <p className="mt-1 text-muted">{t("handover.intro")}</p>

      <div className="mt-4">
        <Segmented
          label={t("handover.title")}
          value={range}
          onChange={setRange}
          options={[
            { value: "read", label: t("handover.range.read") },
            { value: "12", label: t("handover.range.12") },
            { value: "24", label: t("handover.range.24") },
          ]}
        />
        <p className="mt-2 px-1 text-sm text-muted">{t("handover.since", { time: f.dateTime(since) })}</p>
      </div>

      {nothing && (
        <Card className="mt-6 flex items-center gap-3 p-5">
          <CheckCircle2 className="size-7 shrink-0 text-ok" aria-hidden />
          <p className="font-medium">{t("handover.allClear", { time: f.dateTime(since) })}</p>
        </Card>
      )}

      {h.missed.length > 0 && (
        <Group icon={<AlertTriangle className="size-4" />} title={t("handover.missed")} tone="danger" count={h.missed.length}>
          {h.missed.map((s) => (
            <Row key={s.slot + s.med.id}>
              <div className="flex-1">
                <p className="font-semibold">
                  <MedName name={s.med.name} strength={s.med.strength} />
                </p>
                <p className="text-sm text-muted">
                  {[f.dateTime(s.time), who(s.med.personId)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <StatePill state={s.state} />
            </Row>
          ))}
        </Group>
      )}

      {h.notes.length > 0 && (
        <Group icon={<MessageSquareText className="size-4" />} title={t("handover.notes")} count={h.notes.length}>
          {h.notes.map((n) => (
            <Row key={n.id} className={cx(n.important && "bg-warn-soft/60")}>
              <div className="flex-1">
                {n.important && (
                  <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-warn">
                    <Star className="size-3.5" aria-hidden />
                    {t("note.important")}
                  </p>
                )}
                <p dir="auto">{n.text}</p>
                <p className="mt-1 text-sm text-muted">
                  {[n.by, f.dateTime(new Date(n.at)), who(n.personId)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Row>
          ))}
        </Group>
      )}

      {h.vitals.length > 0 && (
        <Group icon={<Activity className="size-4" />} title={t("handover.vitals")} count={h.vitals.length}>
          {h.vitals.map((v) => (
            <Row key={v.id}>
              <div className="flex-1">
                <p className={cx("font-semibold", vitalFlag(v) !== "normal" && "text-danger")}>
                  {t(`vital.${v.kind}` as MessageKey)}: <bdi dir="ltr" className="tabular-nums">{formatVital(v, f)}</bdi>
                </p>
                <p className="text-sm text-muted">
                  {[v.by, f.dateTime(new Date(v.at)), who(v.personId)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <FlagPill v={v} />
            </Row>
          ))}
        </Group>
      )}

      {h.doses.length > 0 && (
        <Group icon={<CheckCheck className="size-4" />} title={t("handover.given")} count={h.doses.length}>
          {h.doses.map((e) => {
            const m = meds.get(e.medicationId);
            return (
              <Row key={e.id}>
                <div className="flex-1">
                  <p className="font-semibold">
                    <MedName name={m?.name ?? "—"} strength={m?.strength} />
                  </p>
                  <p className="text-sm text-muted">
                    {[e.by, f.dateTime(new Date(e.at)), who(e.personId), e.note].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <StatePill state={e.status} />
              </Row>
            );
          })}
        </Group>
      )}

      {h.upcoming.length > 0 && (
        <Group icon={<CalendarClock className="size-4" />} title={t("handover.upcoming")}>
          {h.upcoming.map((a) => (
            <Row key={a.id}>
              <div className="flex-1">
                <p dir="auto" className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted">
                  {[f.dateTime(new Date(a.at)), a.location, who(a.personId)].filter(Boolean).join(" · ")}
                </p>
                {a.notes && <p dir="auto" className="mt-1 text-sm">{a.notes}</p>}
              </div>
            </Row>
          ))}
        </Group>
      )}

      {h.lowStock.length > 0 && (
        <Group icon={<PackageMinus className="size-4" />} title={t("handover.lowStock")}>
          {h.lowStock.map((m) => {
            const days = stockDaysLeft(m);
            return (
              <Row key={m.id}>
                <div className="flex-1">
                  <p className="font-semibold">
                    <MedName name={m.name} strength={m.strength} />
                  </p>
                  <p className="text-sm text-muted">{who(m.personId)}</p>
                </div>
                <span className="text-sm font-semibold text-late">
                  {days !== undefined ? t("stock.days", { n: days }) : t("stock.units", { n: m.stock ?? 0 })}
                </span>
              </Row>
            );
          })}
        </Group>
      )}

      <div className="no-print sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-8 flex gap-2 rounded-2xl bg-bg/90 py-2 backdrop-blur lg:bottom-4">
        <Button variant="primary" size="lg" className="flex-1" onClick={markRead}>
          <CheckCheck className="size-5" aria-hidden />
          {t("handover.markRead")}
        </Button>
        <Button size="lg" onClick={() => setSharing(true)} aria-label={t("handover.share")}>
          <Send className="size-5" aria-hidden />
          <span className="max-sm:hidden">{t("handover.share")}</span>
        </Button>
      </div>

      {sharing && <ShareSheet onClose={() => setSharing(false)} />}
    </>
  );
}

function Group({
  icon,
  title,
  count,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  tone?: "danger";
  children: ReactNode;
}) {
  const { f } = useApp();
  return (
    <section>
      <SectionTitle count={count ? f.num(count) : undefined}>
        <span className={cx("inline-flex items-center gap-1.5", tone === "danger" && "text-danger")}>
          {icon}
          {title}
        </span>
      </SectionTitle>
      <Card className="divide-y divide-line overflow-hidden">{children}</Card>
    </section>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex items-start gap-3 p-4", className)}>{children}</div>;
}
