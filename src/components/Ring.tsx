import { cn } from "@/lib/utils";

export function Ring({
  value, max, size = 180, stroke = 14, label, sublabel, accent = "var(--color-primary)",
}: {
  value: number; max: number; size?: number; stroke?: number;
  label?: string; sublabel?: string; accent?: string;
}) {
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} opacity={0.4}/>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={accent} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.7,.2,1)" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <div className="font-display text-3xl font-bold tabular-nums">{label}</div>}
        {sublabel && <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>}
      </div>
    </div>
  );
}

export function MacroBar({ label, value, target, unit = "g", accent = "var(--color-primary)" }: {
  label: string; value: number; target?: number | null; unit?: string; accent?: string;
}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{Math.round(value)}</span>
          {target ? <span className="text-muted-foreground">/{Math.round(target)}{unit}</span> : <span className="text-muted-foreground">{unit}</span>}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700")} style={{ width: `${pct}%`, background: accent }}/>
      </div>
    </div>
  );
}
