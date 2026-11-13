/** Small trend line for the last few readings. Decorative; values are listed in text too. */
export function Sparkline({ series, className = "h-10 w-28" }: { series: number[][]; className?: string }) {
  const all = series.flat();
  if (all.length < 2) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const W = 112;
  const H = 40;
  const pad = 4;
  const toPoints = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = pad + (i * (W - pad * 2)) / Math.max(1, vals.length - 1);
        const y = H - pad - ((v - min) / span) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden preserveAspectRatio="none">
      {series.map((vals, i) => {
        const pts = toPoints(vals);
        const last = pts.split(" ").at(-1)!.split(",");
        return (
          <g key={i} className={i === 0 ? "text-primary" : "text-info"}>
            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}
