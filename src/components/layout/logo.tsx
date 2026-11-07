import { cn } from "@/lib/utils";

/**
 * RESOLVEGRAPH mark — a resolution check built from connected evidence nodes.
 * Vector only, so it stays crisp at any size and needs no asset pipeline.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="RESOLVEGRAPH"
      className={cn("h-7 w-7", className)}
    >
      <defs>
        <linearGradient id="rg-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6cff" />
          <stop offset="55%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="9"
        fill="#0b1120"
        stroke="url(#rg-mark)"
        strokeWidth="1.5"
      />

      <path
        d="M7.5 16.6 L13.2 22.3 L24.5 9.8"
        fill="none"
        stroke="url(#rg-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="7.5" cy="16.6" r="2.35" fill="#0b1120" stroke="#8b6cff" strokeWidth="1.6" />
      <circle cx="13.2" cy="22.3" r="2.35" fill="#0b1120" stroke="#7c5cff" strokeWidth="1.6" />
      <circle cx="24.5" cy="9.8" r="2.6" fill="#38bdf8" />
    </svg>
  );
}

/** Compact mark used in the mobile top bar and document head contexts. */
export function LogoMark({ className }: { className?: string }) {
  return <Logo className={cn("h-6 w-6", className)} />;
}
