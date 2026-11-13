"use client";

import { ArrowRightLeft, Languages, Lock, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { demoData } from "@/lib/demo";
import { LAST_LOCALE_KEY } from "@/lib/env";
import { makeI18n } from "@/lib/hooks";
import { DEFAULT_SETTINGS, emptyData } from "@/lib/schema";
import { setData } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { Wordmark } from "./Logo";
import { Button, Segmented, TextInput } from "./ui";

export function Onboarding() {
  const [locale, setLocale] = useState<Locale>(() => {
    const last = localStorage.getItem(LAST_LOCALE_KEY);
    if (last === "fa" || last === "en") return last;
    return navigator.language.startsWith("fa") ? "fa" : "en";
  });
  const [name, setName] = useState("");
  const settings = {
    ...DEFAULT_SETTINGS,
    locale,
    calendar: locale === "fa" ? ("persian" as const) : ("gregorian" as const),
  };
  const { t } = makeI18n(settings);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);

  const prefs = { ...settings, caregiverName: name.trim() };

  const features = [
    { icon: ShieldCheck, text: t("onb.f1") },
    { icon: ArrowRightLeft, text: t("onb.f2") },
    { icon: Languages, text: t("onb.f3") },
    { icon: Lock, text: t("onb.f4") },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Wordmark />
        <div className="w-32">
          <Segmented
            label="Language / زبان"
            value={locale}
            onChange={setLocale}
            options={[
              { value: "en", label: "EN" },
              { value: "fa", label: "فارسی" },
            ]}
          />
        </div>
      </div>

      <h1 className="mt-10 text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
        {t("onb.title")}
      </h1>
      <p className="mt-3 text-lg text-muted">{t("onb.body")}</p>

      <ul className="mt-8 grid grid-cols-2 gap-3">
        {features.map(({ icon: Icon, text }) => (
          <li key={text} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <Icon className="size-6 text-primary" aria-hidden />
            <span className="text-sm font-medium leading-snug">{text}</span>
          </li>
        ))}
      </ul>

      <form
        className="mt-10 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setData(demoData(new Date(), prefs));
        }}
      >
        <label htmlFor="onb-name" className="block font-medium">
          {t("onb.name")}
        </label>
        <TextInput
          id="onb-name"
          value={name}
          autoComplete="given-name"
          placeholder={t("onb.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" className="w-full">
          <Sparkles className="size-5" aria-hidden />
          {t("onb.demo")}
        </Button>
        <Button size="lg" className="w-full" onClick={() => setData(emptyData(prefs))}>
          <UserPlus className="size-5" aria-hidden />
          {t("onb.fresh")}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted">{t("disclaimer")}</p>
    </main>
  );
}
