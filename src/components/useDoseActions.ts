"use client";

import { recordDose, undoDose } from "@/lib/actions";
import { checkDose, type DoseWarning } from "@/lib/doses";
import { useApp, type I18n } from "@/lib/hooks";
import { getData, setData, update } from "@/lib/store";
import type { DoseStatus, Medication } from "@/lib/types";
import { confirmDialog, showToast } from "./feedback";

export function warningText(w: DoseWarning, med: Medication, now: Date, { t, f }: I18n): string {
  switch (w.kind) {
    case "already-given":
      return t("warn.alreadyGiven", { who: w.event.by, time: f.time(new Date(w.event.at)) });
    case "too-soon": {
      const at = new Date(w.event.at);
      return t("warn.tooSoon", { who: w.event.by, med: med.name, ago: f.rel(at, now), time: f.time(at) });
    }
    case "prn-interval":
      return t("warn.prnInterval", {
        time: w.event ? f.time(new Date(w.event.at)) : "—",
        next: f.time(w.nextAllowedAt),
      });
    case "prn-max":
      return t("warn.prnMax", { taken: w.taken, max: w.max, next: f.dateTime(w.nextAllowedAt) });
  }
}

/** Recording doses, with the double-dose guard and an Undo toast. */
export function useDoseActions() {
  const i18n = useApp();
  const { t } = i18n;

  async function act(med: Medication, status: DoseStatus, slot?: string) {
    const now = new Date();
    if (status === "given") {
      const warning = checkDose(getData(), med, slot, now);
      if (warning) {
        const ok = await confirmDialog({
          title: t("warn.title"),
          body: `${warningText(warning, med, now, i18n)} ${t("warn.check")}`,
          confirmLabel: t("warn.confirm"),
          cancelLabel: t("warn.cancel"),
          danger: true,
        });
        if (!ok) return;
      }
    }
    const { data, event } = recordDose(getData(), med, status, new Date(), slot);
    setData(data);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(15);
    showToast(t(status === "given" ? "toast.given" : "toast.skipped", { med: med.name }), {
      label: t("action.undo"),
      onClick: () => update((d) => undoDose(d, event.id)),
    });
  }

  function undo(eventId: string) {
    update((d) => undoDose(d, eventId));
    showToast(t("toast.undone"));
  }

  return { give: (m: Medication, slot?: string) => act(m, "given", slot), skip: (m: Medication, slot: string) => act(m, "skipped", slot), undo };
}
