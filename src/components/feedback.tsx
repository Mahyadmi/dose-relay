"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button, Sheet } from "./ui";

/* ---------- Toasts with optional Undo ---------- */

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

let toasts: Toast[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());

export function showToast(message: string, action?: Toast["action"], ms = 6000) {
  const id = ++toastSeq;
  toasts = [...toasts.slice(-2), { id, message, action }];
  emitToasts();
  setTimeout(() => dismissToast(id), ms);
}

function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className="toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-bg shadow-xl"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 text-sm font-medium">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="min-h-9 rounded-lg px-3 text-sm font-bold underline-offset-2 hover:underline"
              onClick={() => {
                t.action!.onClick();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Promise-based confirm dialog ---------- */

interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

let pending: ConfirmRequest | null = null;
const confirmListeners = new Set<() => void>();
const emitConfirm = () => confirmListeners.forEach((l) => l());

export function confirmDialog(req: Omit<ConfirmRequest, "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    pending?.resolve(false);
    pending = { ...req, resolve };
    emitConfirm();
  });
}

function settle(ok: boolean) {
  pending?.resolve(ok);
  pending = null;
  emitConfirm();
}

export function ConfirmHost() {
  const req = useSyncExternalStore(
    (l) => {
      confirmListeners.add(l);
      return () => confirmListeners.delete(l);
    },
    () => pending,
    () => null,
  );
  return (
    <Sheet
      open={!!req}
      onClose={() => settle(false)}
      title={req?.title ?? ""}
      closeLabel={req?.cancelLabel}
      footer={
        req && (
          <>
            <Button className="flex-1" onClick={() => settle(false)}>
              {req.cancelLabel}
            </Button>
            <Button className="flex-1" variant={req.danger ? "danger" : "primary"} onClick={() => settle(true)}>
              {req.confirmLabel}
            </Button>
          </>
        )
      }
    >
      {req?.body && (
        <div className="flex gap-3">
          {req.danger && <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />}
          <p>{req.body}</p>
        </div>
      )}
    </Sheet>
  );
}
