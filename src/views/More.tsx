"use client";

import {
  CalendarPlus,
  Download,
  ExternalLink,
  Code2,
  Lock,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { confirmDialog, showToast } from "@/components/feedback";
import { LogoMark } from "@/components/Logo";
import { ShareSheet } from "@/components/ShareSheet";
import { Card, Field, Segmented, SectionTitle, Switch, TextInput } from "@/components/ui";
import { demoData } from "@/lib/demo";
import { dateKey } from "@/lib/dates";
import { REPO_URL } from "@/lib/env";
import { useApp } from "@/lib/hooks";
import { buildIcs } from "@/lib/ics";
import { normalizeData } from "@/lib/schema";
import { getData, setData, update } from "@/lib/store";
import type { Settings } from "@/lib/types";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function More() {
  const { data, t } = useApp();
  const s = data.settings;
  const [sharing, setSharing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const ask = (body: string, confirmLabel: string) =>
    confirmDialog({ title: confirmLabel, body, confirmLabel, cancelLabel: t("form.cancel"), danger: true });

  const restore = async (file: File) => {
    try {
      const incoming = normalizeData(JSON.parse(await file.text()));
      if (!(await ask(t("import.replaceConfirm"), t("settings.import")))) return;
      setData({ ...incoming, settings: getData().settings });
      showToast(t("import.done"));
    } catch {
      showToast(t("settings.importBad"));
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{t("more.title")}</h1>

      <SectionTitle>{t("settings.you")}</SectionTitle>
      <Card className="p-4">
        <Field label={t("settings.name")} hint={t("settings.nameHint")}>
          {(id, d) => (
            <TextInput
              id={id}
              aria-describedby={d}
              defaultValue={s.caregiverName}
              onBlur={(e) => e.target.value.trim() !== s.caregiverName && set({ caregiverName: e.target.value.trim() })}
            />
          )}
        </Field>
      </Card>

      <SectionTitle>{t("settings.display")}</SectionTitle>
      <Card className="space-y-5 p-4">
        <Setting label={t("settings.language")}>
          <Segmented
            label={t("settings.language")}
            value={s.locale}
            onChange={(locale) => set({ locale })}
            options={[
              { value: "en", label: "English" },
              { value: "fa", label: "فارسی" },
            ]}
          />
        </Setting>
        <Setting label={t("settings.calendar")}>
          <Segmented
            label={t("settings.calendar")}
            value={s.calendar}
            onChange={(calendar) => set({ calendar })}
            options={[
              { value: "gregorian", label: t("cal.gregorian") },
              { value: "persian", label: t("cal.persian") },
            ]}
          />
        </Setting>
        {s.locale === "fa" && (
          <Switch checked={s.persianDigits} onChange={(persianDigits) => set({ persianDigits })} label={t("settings.digits")} />
        )}
        <Switch checked={s.showBothLanguages} onChange={(showBothLanguages) => set({ showBothLanguages })} label={t("settings.bothLangs")} />
        <Setting label={t("settings.textSize")}>
          <Segmented
            label={t("settings.textSize")}
            value={s.textScale}
            onChange={(textScale) => set({ textScale })}
            options={[
              { value: 1, label: t("size.normal") },
              { value: 1.15, label: t("size.large") },
              { value: 1.3, label: t("size.xl") },
            ]}
          />
        </Setting>
        <Setting label={t("settings.theme")}>
          <Segmented
            label={t("settings.theme")}
            value={s.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: "system", label: t("theme.system") },
              { value: "light", label: t("theme.light") },
              { value: "dark", label: t("theme.dark") },
            ]}
          />
        </Setting>
        <Switch checked={s.highContrast} onChange={(highContrast) => set({ highContrast })} label={t("settings.contrast")} />
      </Card>

      <SectionTitle>{t("settings.reminders")}</SectionTitle>
      <Card className="divide-y divide-line">
        <Action
          icon={<CalendarPlus className="size-5" />}
          label={t("settings.calendarExport")}
          hint={t("settings.calendarHint")}
          onClick={() => download("doserelay-reminders.ics", buildIcs(data, new Date()), "text/calendar")}
        />
        <Action
          icon={<Send className="size-5" />}
          label={t("settings.sendRelay")}
          hint={t("settings.sendRelayHint")}
          onClick={() => setSharing(true)}
        />
      </Card>

      <SectionTitle>{t("settings.data")}</SectionTitle>
      <Card className="divide-y divide-line">
        <p className="flex gap-3 p-4 text-sm text-muted">
          <Lock className="size-5 shrink-0 text-primary" aria-hidden />
          {t("settings.privacy")}
        </p>
        <Action
          icon={<Download className="size-5" />}
          label={t("settings.export")}
          onClick={() =>
            download(`doserelay-backup-${dateKey(new Date())}.json`, JSON.stringify(data, null, 2), "application/json")
          }
        />
        <Action icon={<Upload className="size-5" />} label={t("settings.import")} onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) restore(file);
            e.target.value = "";
          }}
        />
        <Action
          icon={<Sparkles className="size-5" />}
          label={t("settings.loadDemo")}
          onClick={async () => {
            if (await ask(t("settings.loadDemoConfirm"), t("settings.loadDemo"))) {
              setData(demoData(new Date(), getData().settings));
            }
          }}
        />
        <Action
          icon={<Trash2 className="size-5" />}
          label={t("settings.reset")}
          danger
          onClick={async () => {
            if (await ask(t("settings.resetConfirm"), t("settings.reset"))) setData(null);
          }}
        />
      </Card>

      <SectionTitle>{t("settings.about")}</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <LogoMark className="size-11" />
          <div>
            <p className="font-bold">DoseRelay</p>
            <p className="text-sm text-muted">{t("app.tagline")}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("disclaimer")}</p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
        >
          <Code2 className="size-5" aria-hidden />
          {t("settings.source")}
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </Card>

      {sharing && <ShareSheet onClose={() => setSharing(false)} />}
    </>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium">{label}</p>
      {children}
    </div>
  );
}

function Action({
  icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 p-4 text-start hover:bg-surface-2 ${danger ? "text-danger" : ""}`}
    >
      <span aria-hidden className={danger ? "" : "text-primary"}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}
