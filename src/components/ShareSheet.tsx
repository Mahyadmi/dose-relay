"use client";

import { Copy, KeyRound, Loader2, Lock, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/env";
import { useApp } from "@/lib/hooks";
import { shareable } from "@/lib/schema";
import { encryptPayload, generateShareCode } from "@/lib/share";
import { getData } from "@/lib/store";
import { showToast } from "./feedback";
import { Button, Sheet } from "./ui";

export function ShareSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  const [code] = useState(generateShareCode);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    encryptPayload(shareable(getData()), code).then((payload) => {
      if (alive) setUrl(`${window.location.origin}${BASE_PATH}/import/#r=${payload}`);
    });
    return () => {
      alive = false;
    };
  }, [code]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    showToast(t("share.copied"));
  };

  const nativeShare = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: "DoseRelay", text: t("share.message"), url });
    } catch {
      /* cancelled */
    }
  };

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Sheet open onClose={onClose} title={t("share.title")} closeLabel={t("common.close")}>
      <div className="flex gap-3 rounded-2xl bg-primary-soft p-4 text-sm">
        <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>{t("share.body")}</p>
      </div>

      <div className="mt-5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted">
          <KeyRound className="size-4" aria-hidden />
          {t("share.code")}
        </p>
        <p dir="ltr" className="mt-1 select-all font-mono text-3xl font-bold tracking-widest">
          {code}
        </p>
        <p className="mt-1 text-sm text-muted">{t("share.codeHint")}</p>
      </div>

      <div className="mt-6 space-y-2">
        {!url ? (
          <p className="flex items-center justify-center gap-2 py-3 text-muted" aria-live="polite">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            {t("share.encrypting")}
          </p>
        ) : (
          <>
            {canShare && (
              <Button variant="primary" size="lg" className="w-full" onClick={nativeShare}>
                <Share2 className="size-5" aria-hidden />
                {t("share.native")}
              </Button>
            )}
            <Button variant={canShare ? "secondary" : "primary"} size="lg" className="w-full" onClick={copy}>
              <Copy className="size-5" aria-hidden />
              {t("share.copy")}
            </Button>
            {url.length > 8000 && <p className="text-sm text-warn">{t("share.long")}</p>}
          </>
        )}
      </div>
    </Sheet>
  );
}
