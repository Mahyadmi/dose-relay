"use client";

import {
  AlarmClock,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Droplet,
  MinusCircle,
  Pill,
  RotateCcw,
  Syringe,
  Wind,
} from "lucide-react";
import { prnStatus, stockDaysLeft, isLowStock, type DoseSlot, type SlotState } from "@/lib/doses";
import { useApp } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import type { Medication, MedForm, Person } from "@/lib/types";
import { Avatar, Button, Card, cx } from "./ui";
import { useDoseActions } from "./useDoseActions";

const STATE_STYLE: Record<SlotState, { cls: string; icon: typeof Clock; key: MessageKey }> = {
  given: { cls: "bg-ok-soft text-ok", icon: CheckCircle2, key: "state.given" },
  skipped: { cls: "bg-surface-2 text-muted", icon: MinusCircle, key: "state.skipped" },
  due: { cls: "bg-warn-soft text-warn", icon: Clock, key: "state.due" },
  late: { cls: "bg-late-soft text-late", icon: AlarmClock, key: "state.late" },
  missed: { cls: "bg-danger-soft text-danger", icon: AlertTriangle, key: "state.missed" },
  upcoming: { cls: "bg-surface-2 text-muted", icon: Clock, key: "state.upcoming" },
};

export function StatePill({ state }: { state: SlotState }) {
  const { t } = useApp();
  const s = STATE_STYLE[state];
  const Icon = s.icon;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>
      <Icon className="size-3.5" aria-hidden />
      {t(s.key)}
    </span>
  );
}

export function MedIcon({ form, className = "size-5" }: { form: MedForm; className?: string }) {
  const Icon =
    form === "drops" || form === "liquid" ? Droplet : form === "injection" ? Syringe : form === "inhaler" ? Wind : Pill;
  return <Icon className={className} aria-hidden />;
}

/** Medicine name and strength, kept in Latin reading order inside Persian text. */
export function MedName({ name, strength }: { name: string; strength?: string }) {
  return (
    <bdi dir="ltr" className="inline-block">
      {name} {strength && <span className="font-normal text-muted">{strength}</span>}
    </bdi>
  );
}

/** Instructions in the UI language first, the other language underneath. */
export function Instructions({ med }: { med: Medication }) {
  const { data } = useApp();
  const fa = data.settings.locale === "fa";
  const primary = fa ? med.instructionsFa || med.instructionsEn : med.instructionsEn || med.instructionsFa;
  const secondary = fa ? med.instructionsEn : med.instructionsFa;
  if (!primary) return null;
  return (
    <div className="mt-1.5 space-y-0.5 text-sm">
      <p className="text-ink/90">{primary}</p>
      {data.settings.showBothLanguages && secondary && secondary !== primary && (
        <p dir={fa ? "ltr" : "rtl"} lang={fa ? "en" : "fa"} className="text-muted">
          {secondary}
        </p>
      )}
    </div>
  );
}

function StockLine({ med }: { med: Medication }) {
  const { t } = useApp();
  if (!isLowStock(med)) return null;
  const days = stockDaysLeft(med);
  return (
    <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-late">
      <AlertTriangle className="size-3.5" aria-hidden />
      {days !== undefined ? t("stock.days", { n: days }) : t("stock.units", { n: med.stock ?? 0 })}
    </p>
  );
}

export function DoseCard({ slot, person, showPerson }: { slot: DoseSlot; person?: Person; showPerson: boolean }) {
  const { t, f } = useApp();
  const { give, skip, undo } = useDoseActions();
  const { med, state, event } = slot;
  const done = state === "given" || state === "skipped";
  const urgent = state === "missed" || state === "late";

  return (
    <Card className={cx("p-4", urgent && "border-s-4 border-s-danger", state === "due" && "border-s-4 border-s-warn")}>
      <div className="flex items-start gap-3">
        <div className="flex w-14 shrink-0 flex-col items-center pt-0.5">
          <span className={cx("text-lg font-bold tabular-nums", done && "text-muted")}>{f.time(slot.time)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className={cx("text-base font-semibold", done && "text-muted")}>
              <MedName name={med.name} strength={med.strength} />
            </h3>
            <StatePill state={state} />
          </div>
          {showPerson && person && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Avatar name={person.name} color={person.color} size="sm" />
              {person.name}
            </p>
          )}
          {!done && <Instructions med={med} />}
          {!done && <StockLine med={med} />}
          {event && (
            <p className="mt-1.5 text-sm text-muted">
              {t("dose.byAt", { who: event.by, time: f.time(new Date(event.at)) })}
            </p>
          )}
        </div>
      </div>
      {!done ? (
        <div className="mt-3 flex gap-2 ps-[4.25rem]">
          <Button
            variant={state === "upcoming" ? "soft" : "primary"}
            className="flex-1"
            onClick={() => give(med, slot.slot)}
          >
            <Check className="size-5" aria-hidden />
            {t("action.give")}
          </Button>
          <Button variant="ghost" onClick={() => skip(med, slot.slot)}>
            {t("action.skip")}
          </Button>
        </div>
      ) : (
        event && (
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => undo(event.id)}>
              <RotateCcw className="size-4" aria-hidden />
              {t("action.undo")}
            </Button>
          </div>
        )
      )}
    </Card>
  );
}

export function PrnCard({ med, person, showPerson, now }: { med: Medication; person?: Person; showPerson: boolean; now: Date }) {
  const { data, t, f } = useApp();
  const { give } = useDoseActions();
  if (med.schedule.kind !== "prn") return null;
  const s = prnStatus(med, data.doses, now);
  const pct = Math.min(100, (s.takenLast24h / s.maxPerDay) * 100);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
          <MedIcon form={med.form} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            <MedName name={med.name} strength={med.strength} />
          </h3>
          {showPerson && person && <p className="text-sm text-muted">{person.name}</p>}
          <Instructions med={med} />
          <div className="mt-3 flex items-center gap-2">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={s.maxPerDay}
              aria-valuenow={s.takenLast24h}
              aria-label={t("prn.count", { taken: s.takenLast24h, max: s.maxPerDay })}
            >
              <div
                className={cx("h-full rounded-full", s.takenLast24h >= s.maxPerDay ? "bg-danger" : "bg-info")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted">
              {t("prn.count", { taken: s.takenLast24h, max: s.maxPerDay })}
            </span>
          </div>
          <p className={cx("mt-2 text-sm font-medium", s.canGive ? "text-ok" : "text-warn")}>
            {s.canGive ? t("prn.ready") : t("prn.next", { time: f.time(s.nextAllowedAt!) })}
          </p>
          <p className="text-sm text-muted">
            {s.lastGiven
              ? t("prn.last", { time: f.time(new Date(s.lastGiven.at)), who: s.lastGiven.by })
              : t("prn.none")}
          </p>
          <StockLine med={med} />
        </div>
      </div>
      <Button variant={s.canGive ? "soft" : "secondary"} className="mt-3 w-full" onClick={() => give(med)}>
        <Check className="size-5" aria-hidden />
        {t("action.giveAgain")}
      </Button>
    </Card>
  );
}
