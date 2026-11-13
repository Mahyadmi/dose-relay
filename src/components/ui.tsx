"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-card",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  soft: "bg-primary-soft text-primary hover:brightness-95 dark:hover:brightness-125",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-danger-soft text-danger hover:brightness-95 dark:hover:brightness-125",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-[0.95rem]",
        size === "lg" && "min-h-13 px-5 text-base",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface shadow-card print-plain", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, count }: { children: ReactNode; action?: ReactNode; count?: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-2 px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {children}
        {count && <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</div>
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const AVATAR_COLORS = [
  "bg-teal-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-amber-600",
  "bg-emerald-600",
  "bg-fuchsia-600",
  "bg-slate-600",
];

export function Avatar({ name, color, size = "md" }: { name: string; color: number; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        AVATAR_COLORS[color % AVATAR_COLORS.length],
        size === "sm" && "size-7 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-14 text-lg",
      )}
    >
      {initials || "?"}
    </span>
  );
}

/* ---------- Form controls ---------- */

export const inputCls =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
  children: (id: string, describedBy?: string) => ReactNode;
  id?: string;
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  const hintId = hint || error ? `${fieldId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
        {optional && <span className="ms-1 font-normal text-muted">({optional})</span>}
      </label>
      {children(fieldId, hintId)}
      {(error || hint) && (
        <p id={hintId} className={cx("text-sm", error ? "text-danger" : "text-muted")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(inputCls, "resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-auto", props.className)} />;
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-h-10 flex-1 rounded-lg px-2 text-sm font-medium transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-line",
        )}
      >
        <span
          className={cx(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            checked ? "start-6" : "start-1",
          )}
        />
      </button>
    </div>
  );
}

/* ---------- Sheet (modal dialog) ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first control; prefer the field a form marks instead.
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-surface p-0 text-ink shadow-2xl sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <IconButton label={closeLabel} onClick={onClose} className="-me-2">
              <X className="size-5" />
            </IconButton>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
