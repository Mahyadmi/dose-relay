"use client";

import { Download, KeyRound, Loader2, Merge, Replace } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { confirmDialog, showToast } from "@/components/feedback";
import { Wordmark } from "@/components/Logo";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { makeI18n } from "@/lib/hooks";
import { DEFAULT_SETTINGS, mergeData, normalizeData } from "@/lib/schema";
import { decryptPayload, ShareError } from "@/lib/share";
import { setData, useStore } from "@/lib/store";
import type { AppData } from "@/lib/types";

export function Import() {
  const { data } = useStore();
  const router = useRouter();
  const settings = useMemo(
    () =>
      data?.settings ?? {
        ...DEFAULT_SETTINGS,
        locale: navigator.language.startsWith("fa") ? ("fa" as const) : ("en" as const),
      },
    [data],
  );
  const { t } = makeI18n(settings);
  const [payload, setPayload] = useState<string | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<AppData | null>(null);

  useEffect(() => {
    const read = () => setPayload(new URLSearchParams(window.location.hash.slice(1)).get("r"));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const unlock = async () => {
    if (!payload) return;
    setBusy(true);
    setError(null);
    try {
      setIncoming(normalizeData(await decryptPayload(payload, code)));
    } catch (e) {
      setError(e instanceof ShareError && e.reason === "code" ? t("import.wrongCode") : t("import.badLink"));
    } finally {
      setBusy(false);
    }
  };

  const finish = (next: AppData) => {
    setData(next);
    history.replaceState(null, "", window.location.pathname);
    showToast(t("import.done"));
    router.push("/");
  };

  if (payload === undefined) return null;

  if (!payload) {
    return (
      <Card className="mt-8 p-6 text-center">
        <p className="text-muted">{t("import.noLink")}</p>
      </Card>
    );
  }

  const records = incoming
    ? incoming.doses.length + incoming.vitals.length + incoming.notes.length + incoming.appointments.length
    : 0;

  return (
    <div className="mx-auto max-w-md">
      {!data && (
        <div className="mb-8">
          <Wordmark />
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight">{t("import.title")}</h1>

      {!incoming ? (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            unlock();
          }}
        >
          <p className="text-muted">{t("import.body")}</p>
          <Field label={t("share.code")} error={error ?? undefined}>
            {(id, d) => (
              <TextInput
                id={id}
                aria-describedby={d}
                aria-invalid={!!error}
                dir="ltr"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABCD-EFGH-JKMN"
                className="text-center font-mono text-xl tracking-widest uppercase"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || code.length < 12}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <KeyRound className="size-5" aria-hidden />}
            {busy ? t("import.unlocking") : t("import.unlock")}
          </Button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <Card className="p-4">
            <p className="font-medium">
              {t("import.preview", {
                people: incoming.people.length,
                meds: incoming.medications.length,
                records,
              })}
            </p>
            <p className="mt-1 text-sm text-muted">{incoming.people.map((p) => p.name).join(" · ")}</p>
          </Card>

          {data ? (
            <>
              <Button variant="primary" size="lg" className="w-full" onClick={() => finish(mergeData(data, incoming))}>
                <Merge className="size-5" aria-hidden />
                {t("import.merge")}
              </Button>
              <p className="-mt-2 text-center text-sm text-muted">{t("import.mergeHint")}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: t("import.replace"),
                    body: t("import.replaceConfirm"),
                    confirmLabel: t("import.replace"),
                    cancelLabel: t("form.cancel"),
                    danger: true,
                  });
                  if (ok) finish({ ...incoming, settings: data.settings });
                }}
              >
                <Replace className="size-5" aria-hidden />
                {t("import.replace")}
              </Button>
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                finish({ ...incoming, settings: { ...settings, caregiverName: name.trim(), handoverReadAt: undefined } });
              }}
            >
              <Field label={t("onb.name")}>
                {(id) => (
                  <TextInput id={id} value={name} placeholder={t("onb.namePlaceholder")} onChange={(e) => setName(e.target.value)} />
                )}
              </Field>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                <Download className="size-5" aria-hidden />
                {t("import.title")}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
