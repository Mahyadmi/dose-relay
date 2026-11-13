"use client";

import { AlertTriangle, ChevronRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PersonForm } from "@/components/forms";
import { Avatar, Button, Card, EmptyState } from "@/components/ui";
import { isLowStock } from "@/lib/doses";
import { useApp } from "@/lib/hooks";

export function People() {
  const { data, t, f } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [adding, setAdding] = useState(params.get("new") === "1");
  const year = new Date().getFullYear();

  const close = () => {
    setAdding(false);
    if (params.get("new")) router.replace("/people");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("people.title")}</h1>
        {data.people.length > 0 && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-5" aria-hidden />
            <span className="max-sm:sr-only">{t("people.add")}</span>
          </Button>
        )}
      </div>

      {data.people.length === 0 ? (
        <EmptyState
          icon={<Users className="size-7" />}
          title={t("people.empty")}
          action={
            <Button variant="primary" size="lg" onClick={() => setAdding(true)}>
              <Plus className="size-5" aria-hidden />
              {t("people.add")}
            </Button>
          }
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {data.people.map((p) => {
            const meds = data.medications.filter((m) => m.personId === p.id && m.active);
            const low = meds.filter(isLowStock).length;
            return (
              <li key={p.id}>
                <Link href={`/person?id=${encodeURIComponent(p.id)}`} className="block rounded-2xl">
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2">
                    <Avatar name={p.name} color={p.color} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{p.name}</p>
                      <p className="text-sm text-muted">
                        {[
                          p.birthYear ? t("person.age", { n: year - p.birthYear }) : null,
                          t("people.meds", { n: meds.length }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.allergies.map((a) => (
                          <span key={a} className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                            {a}
                          </span>
                        ))}
                        {low > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-late-soft px-2 py-0.5 text-xs font-semibold text-late">
                            <AlertTriangle className="size-3" aria-hidden />
                            {t("handover.lowStock")} · {f.num(low)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted rtl:rotate-180" aria-hidden />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {adding && <PersonForm onClose={close} />}
    </>
  );
}
