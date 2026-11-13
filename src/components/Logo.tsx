export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0f766e" />
      {/* A capsule being passed along: the "relay". */}
      <g transform="rotate(-40 32 32)">
        <rect x="14" y="23" width="36" height="18" rx="9" fill="#ffffff" />
        <path d="M32 23h9a9 9 0 0 1 0 18h-9z" fill="#99f6e4" />
      </g>
      <path d="M13 50c6 4 14 5 21 3" stroke="#99f6e4" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M31 49l4 4-5 3" stroke="#99f6e4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">
        Dose<span className="text-primary">Relay</span>
      </span>
    </span>
  );
}
