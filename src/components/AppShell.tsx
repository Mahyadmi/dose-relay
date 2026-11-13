"use client";

import { ArrowRightLeft, CalendarCheck, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { BASE_PATH } from "@/lib/env";
import { buildHandover, defaultSince } from "@/lib/handover";
import { useApp, useNow } from "@/lib/hooks";
import type { MessageKey } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { ConfirmHost, Toaster } from "./feedback";
import { LogoMark, Wordmark } from "./Logo";
import { Onboarding } from "./Onboarding";
import { cx } from "./ui";

const NAV: { href: string; key: MessageKey; icon: typeof Users }[] = [
  { href: "/", key: "nav.today", icon: CalendarCheck },
  { href: "/people", key: "nav.people", icon: Users },
  { href: "/handover", key: "nav.handover", icon: ArrowRightLeft },
  { href: "/more", key: "nav.more", icon: MoreHorizontal },
];

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

function isActive(pathname: string, href: string) {
  const p = clean(pathname);
  if (href === "/") return p === "/";
  if (href === "/people") return p === "/people" || p === "/person";
  return p.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useStore();
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
    }
  }, []);

  let content: ReactNode;
  if (status === "loading") {
    content = (
      <div className="flex min-h-dvh items-center justify-center" aria-busy>
        <LogoMark className="size-14 animate-pulse" />
      </div>
    );
  } else if (status === "empty" && clean(pathname) !== "/import") {
    content = <Onboarding />;
  } else if (status === "empty") {
    content = <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>;
  } else {
    content = <Frame pathname={pathname}>{children}</Frame>;
  }

  return (
    <>
      {content}
      <Toaster />
      <ConfirmHost />
    </>
  );
}

function Frame({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { data, t } = useApp();
  const now = useNow(60_000);
  const attention = useMemo(
    () => buildHandover(data, defaultSince(data, now), now, data.settings.caregiverName).attention,
    [data, now],
  );

  return (
    <div className="lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      {/* Desktop side rail */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 px-2">
          <Wordmark />
        </Link>
        <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
          {NAV.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="flex-1">{t(key)}</span>
                {href === "/handover" && attention > 0 && <Badge n={attention} />}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-muted">{t("app.tagline")}</p>
      </aside>

      <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4 lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label={t("nav.main")}
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <span
                    className={cx(
                      "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      active && "bg-primary-soft",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {href === "/handover" && attention > 0 && (
                      <span className="absolute -top-1 end-1">
                        <Badge n={attention} />
                      </span>
                    )}
                  </span>
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  const { f } = useApp();
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[0.7rem] font-bold leading-5 text-white">
      {f.num(Math.min(n, 99))}
    </span>
  );
}
