import { cn } from "@/lib/utils";

/**
 * RESOLVEGRAPH mark — a precision geometric check built from connected evidence nodes.
 * Art-directed vector SVG combining cryptographic proof, network edges, and resolution verification.
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
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="6"
        fill="#0b0e14"
        stroke="var(--color-line-2)"
        strokeWidth="1.2"
      />

      {/* Network connector lines */}
      <line x1="8" y1="16.5" x2="13.5" y2="22" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="22" x2="24" y2="10" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />

      {/* Verified Nodes */}
      <circle cx="8" cy="16.5" r="2.4" fill="#0b0e14" stroke="#f59e0b" strokeWidth="1.8" />
      <circle cx="13.5" cy="22" r="2.4" fill="#0b0e14" stroke="#f59e0b" strokeWidth="1.8" />
      <circle cx="24" cy="10" r="2.8" fill="#10b981" />
    </svg>
  );
}

/** Compact mark used in the mobile top bar and document head contexts. */
export function LogoMark({ className }: { className?: string }) {
  return <Logo className={cn("h-6 w-6", className)} />;
}
