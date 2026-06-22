import { useMemo } from "react";

/**
 * Animated SVG forest backdrop — swaying trees, drifting mist, falling leaves.
 * White/black/dark-green palette only.
 */
export function ForestScene({ className = "" }: { className?: string }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 9 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 6,
        opacity: 0.35 + Math.random() * 0.4,
      })),
    [],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* drifting mist */}
      <div
        className="mist-drift absolute inset-x-0 bottom-1/3 h-40 blur-2xl"
        style={{ background: "radial-gradient(ellipse at center, oklch(0.32 0.07 150 / 0.18), transparent 70%)" }}
      />

      {/* tree silhouettes */}
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[60%] w-full"
      >
        <defs>
          <linearGradient id="forestGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.35 0.08 150)" />
            <stop offset="100%" stopColor="oklch(0.18 0.04 150)" />
          </linearGradient>
          <linearGradient id="trunkGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.15 0.02 150)" />
            <stop offset="100%" stopColor="oklch(0.08 0.01 150)" />
          </linearGradient>
        </defs>

        {/* ground */}
        <ellipse cx="200" cy="305" rx="260" ry="22" fill="oklch(0.22 0.05 150)" opacity="0.6" />

        {/* back trees */}
        {[40, 100, 170, 240, 320, 380].map((x, i) => (
          <g key={`back-${i}`} className="tree-sway" style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${6 + (i % 3)}s`, transformOrigin: `${x}px 290px` }}>
            <rect x={x - 2} y={220} width={4} height={80} fill="url(#trunkGrad)" opacity={0.7} />
            <polygon points={`${x},150 ${x - 22},230 ${x + 22},230`} fill="url(#forestGrad)" opacity={0.55} />
            <polygon points={`${x},180 ${x - 18},240 ${x + 18},240`} fill="url(#forestGrad)" opacity={0.6} />
          </g>
        ))}

        {/* front trees — taller, animated grow */}
        {[70, 200, 330].map((x, i) => (
          <g
            key={`front-${i}`}
            className="tree-grow tree-sway"
            style={{
              animationDelay: `${0.2 + i * 0.15}s, ${i * 0.4}s`,
              animationDuration: `1.4s, ${5 + i}s`,
              transformOrigin: `${x}px 300px`,
            }}
          >
            <rect x={x - 4} y={200} width={8} height={100} fill="url(#trunkGrad)" />
            <polygon points={`${x},80 ${x - 40},200 ${x + 40},200`} fill="url(#forestGrad)" />
            <polygon points={`${x},130 ${x - 34},220 ${x + 34},220`} fill="url(#forestGrad)" />
            <polygon points={`${x},170 ${x - 28},240 ${x + 28},240`} fill="url(#forestGrad)" />
          </g>
        ))}
      </svg>

      {/* falling leaves */}
      {leaves.map((l) => (
        <span
          key={l.id}
          className="leaf-fall absolute top-0 block rounded-full"
          style={
            {
              left: `${l.left}%`,
              width: `${l.size}px`,
              height: `${l.size}px`,
              background: "oklch(0.35 0.08 150)",
              opacity: l.opacity,
              animationDelay: `${l.delay}s`,
              animationDuration: `${l.duration}s`,
              ["--drift" as string]: `${l.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
