import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "dark" | "light" | "monochrome";
  withText?: boolean;
  textClassName?: string;
  badgeText?: string;
}

/**
 * RESOLVEGRAPH Official Brand Mark
 * Represents Bilateral Convergence:
 * - Left node & thread: Buyer Evidence Stream (Buyer Blue #4D92CC)
 * - Right node & thread: Merchant Evidence Stream (Seller Teal #278B79)
 * - Central Nexus: Verified Cryptographic Convergence Point (Brand Indigo #4350E5 + Success Green #2E8A62)
 * - Enclosing Hexagonal Frame: Cryptographic auditability & tamper-evident enclosure
 */
export function Logo({
  className,
  variant = "default",
  withText = false,
  textClassName,
  badgeText,
}: LogoProps) {
  const isDarkBg = variant === "dark";
  const isLightBg = variant === "light";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="RESOLVEGRAPH Official Mark"
        className="h-7 w-7 shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          {/* Subtle gradient for central nexus */}
          <linearGradient id="rg-nexus-grad" x1="10" y1="10" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4350E5" />
            <stop offset="100%" stopColor="#2E8A62" />
          </linearGradient>

          {/* Dark container glow */}
          <filter id="rg-glow" x="0" y="0" width="36" height="36" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Precision Shield / Hexagonal Housing */}
        <rect
          x="2"
          y="2"
          width="32"
          height="32"
          rx="8"
          fill={isDarkBg ? "#11191A" : isLightBg ? "#FFFEFA" : "#11191A"}
          stroke={isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(67,80,229,0.25)"}
          strokeWidth="1.2"
        />

        {/* Subtle grid accent inside logo */}
        <line x1="2" y1="18" x2="34" y2="18" stroke="rgba(255,255,255,0.06)" strokeDasharray="1 3" />
        <line x1="18" y1="2" x2="18" y2="34" stroke="rgba(255,255,255,0.06)" strokeDasharray="1 3" />

        {/* Connecting Bilateral Vectors */}
        {/* Buyer Vector (Left to Center) */}
        <path
          d="M8.5 22.5L14.5 18L18 18"
          stroke="#4D92CC"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Seller Vector (Right to Center) */}
        <path
          d="M27.5 13.5L21.5 18L18 18"
          stroke="#278B79"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Vertical Alignment Axis */}
        <line x1="18" y1="10" x2="18" y2="26" stroke="#4350E5" strokeWidth="1.2" strokeOpacity="0.4" />

        {/* Buyer Evidence Node (Left) */}
        <circle cx="8.5" cy="22.5" r="2.2" fill="#11191A" stroke="#4D92CC" strokeWidth="1.8" />

        {/* Seller Evidence Node (Right) */}
        <circle cx="27.5" cy="13.5" r="2.2" fill="#11191A" stroke="#278B79" strokeWidth="1.8" />

        {/* Central Convergence Nexus */}
        <circle cx="18" cy="18" r="4.2" fill="url(#rg-nexus-grad)" />
        <circle cx="18" cy="18" r="1.8" fill="#FFFFFF" />
      </svg>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-heading text-[15px] font-bold tracking-[0.06em] leading-none",
                isDarkBg ? "text-white" : "text-[var(--ink)]",
                textClassName
              )}
            >
              RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
            </span>
            {badgeText && (
              <span className="rounded-full bg-[var(--surface-2)] border border-[var(--line)] px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-2)]">
                {badgeText}
              </span>
            )}
          </div>
          <span className="text-[9.5px] font-mono tracking-wider text-[var(--ink-3)] uppercase mt-0.5">
            Evidence Atelier · v2.4
          </span>
        </div>
      )}
    </div>
  );
}

/** Standalone compact mark for mobile navbars and document headers */
export function LogoMark({ className, variant = "default" }: { className?: string; variant?: "default" | "dark" | "light" }) {
  return <Logo className={className} variant={variant} withText={false} />;
}
