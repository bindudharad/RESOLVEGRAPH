"use client";

export function WelcomeStepIllustration({ step }: { step: 1 | 2 | 3 | 4 }) {
  if (step === 1) {
    return (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[260px] h-auto"
        role="img"
        aria-label="Illustration representing structured communication between buyers and sellers"
      >
        <rect
          x="18"
          y="24"
          width="244"
          height="152"
          rx="18"
          className="fill-[var(--surface)] stroke-[var(--line)]"
          strokeWidth="1.5"
        />
        {/* Connection bridge */}
        <path
          d="M84 96C106 72 174 72 196 96"
          className="stroke-[var(--accent)]"
          strokeWidth="2.5"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        <path
          d="M84 114C106 138 174 138 196 114"
          className="stroke-emerald-500/70"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Buyer node */}
        <rect
          x="36"
          y="74"
          width="48"
          height="58"
          rx="12"
          className="fill-[var(--surface-2)] stroke-[var(--line-strong)]"
          strokeWidth="1.5"
        />
        <circle cx="60" cy="94" r="10" className="fill-blue-500/20 stroke-blue-500" strokeWidth="1.5" />
        <rect x="46" y="111" width="28" height="6" rx="3" className="fill-[var(--ink-3)]/40" />

        {/* Center platform badge */}
        <circle
          cx="140"
          cy="104"
          r="24"
          className="fill-[var(--accent-soft)] stroke-[var(--accent)]"
          strokeWidth="2"
        />
        <path
          d="M131 104L137 110L150 97"
          className="stroke-[var(--accent)]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Seller node */}
        <rect
          x="196"
          y="74"
          width="48"
          height="58"
          rx="12"
          className="fill-[var(--surface-2)] stroke-[var(--line-strong)]"
          strokeWidth="1.5"
        />
        <rect
          x="209"
          y="85"
          width="22"
          height="18"
          rx="4"
          className="fill-[var(--accent)]/20 stroke-[var(--accent)]"
          strokeWidth="1.5"
        />
        <rect x="206" y="111" width="28" height="6" rx="3" className="fill-[var(--ink-3)]/40" />
      </svg>
    );
  }

  if (step === 2) {
    return (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[260px] h-auto"
        role="img"
        aria-label="Illustration showing a seller reviewing order records and supporting evidence"
      >
        <rect
          x="22"
          y="22"
          width="236"
          height="156"
          rx="18"
          className="fill-[var(--surface)] stroke-[var(--line)]"
          strokeWidth="1.5"
        />
        {/* Order document */}
        <rect
          x="42"
          y="42"
          width="112"
          height="116"
          rx="12"
          className="fill-[var(--surface-2)] stroke-[var(--line-strong)]"
          strokeWidth="1.5"
        />
        <rect x="56" y="58" width="52" height="8" rx="4" className="fill-[var(--accent)]/70" />
        <rect x="56" y="76" width="82" height="6" rx="3" className="fill-[var(--ink-3)]/35" />
        <rect x="56" y="90" width="70" height="6" rx="3" className="fill-[var(--ink-3)]/25" />
        <rect x="56" y="108" width="84" height="34" rx="8" className="fill-[var(--surface)] stroke-[var(--line)]" />
        <path
          d="M68 125L74 131L87 118"
          className="stroke-emerald-500"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="96" y="122" width="32" height="6" rx="3" className="fill-[var(--ink-2)]/50" />

        {/* Attachment & dispatch cards */}
        <rect
          x="166"
          y="46"
          width="74"
          height="50"
          rx="10"
          className="fill-[var(--accent-soft)] stroke-[var(--accent)]/60"
          strokeWidth="1.5"
        />
        <circle cx="184" cy="67" r="7" className="fill-[var(--accent)]/30" />
        <rect x="197" y="62" width="30" height="5" rx="2.5" className="fill-[var(--accent)]" />
        <rect x="177" y="80" width="48" height="4" rx="2" className="fill-[var(--ink-3)]/35" />

        <rect
          x="166"
          y="106"
          width="74"
          height="50"
          rx="10"
          className="fill-emerald-500/10 stroke-emerald-500/50"
          strokeWidth="1.5"
        />
        <rect x="178" y="120" width="38" height="6" rx="3" className="fill-emerald-600/70" />
        <rect x="178" y="134" width="50" height="5" rx="2.5" className="fill-[var(--ink-3)]/35" />
      </svg>
    );
  }

  if (step === 3) {
    return (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[260px] h-auto"
        role="img"
        aria-label="Illustration representing bilateral verification connecting buyer and seller evidence"
      >
        <rect
          x="20"
          y="22"
          width="240"
          height="156"
          rx="18"
          className="fill-[var(--surface)] stroke-[var(--line)]"
          strokeWidth="1.5"
        />
        {/* Scale crossbar */}
        <line x1="72" y1="68" x2="208" y2="68" className="stroke-[var(--ink-2)]" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="140" y1="48" x2="140" y2="144" className="stroke-[var(--line-strong)]" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="116" y="142" width="48" height="10" rx="5" className="fill-[var(--surface-2)] stroke-[var(--line-strong)]" strokeWidth="1.5" />

        {/* Left card - Buyer Evidence */}
        <rect
          x="44"
          y="80"
          width="58"
          height="50"
          rx="10"
          className="fill-blue-500/10 stroke-blue-500/50"
          strokeWidth="1.5"
        />
        <rect x="55" y="94" width="36" height="5" rx="2.5" className="fill-blue-500/80" />
        <rect x="55" y="106" width="28" height="4" rx="2" className="fill-[var(--ink-3)]/40" />
        <rect x="55" y="115" width="34" height="4" rx="2" className="fill-[var(--ink-3)]/30" />

        {/* Right card - Seller Evidence */}
        <rect
          x="178"
          y="80"
          width="58"
          height="50"
          rx="10"
          className="fill-[var(--accent-soft)] stroke-[var(--accent)]/60"
          strokeWidth="1.5"
        />
        <rect x="189" y="94" width="36" height="5" rx="2.5" className="fill-[var(--accent)]" />
        <rect x="189" y="106" width="28" height="4" rx="2" className="fill-[var(--ink-3)]/40" />
        <rect x="189" y="115" width="34" height="4" rx="2" className="fill-[var(--ink-3)]/30" />

        {/* Center connection badge */}
        <circle cx="140" cy="68" r="14" className="fill-[var(--surface)] stroke-[var(--accent)]" strokeWidth="2.5" />
        <circle cx="140" cy="68" r="5" className="fill-[var(--accent)]" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[260px] h-auto"
      role="img"
      aria-label="Illustration showing transparent milestone progress in the Seller Workspace"
    >
      <rect
        x="20"
        y="22"
        width="240"
        height="156"
        rx="18"
        className="fill-[var(--surface)] stroke-[var(--line)]"
        strokeWidth="1.5"
      />
      {/* Vertical timeline spine */}
      <line x1="68" y1="54" x2="68" y2="146" className="stroke-[var(--line-strong)]" strokeWidth="2" />

      {/* Milestone 1 */}
      <circle cx="68" cy="58" r="8" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="2" />
      <rect x="92" y="48" width="136" height="22" rx="7" className="fill-[var(--surface-2)] stroke-[var(--line)]" />
      <rect x="104" y="56" width="66" height="6" rx="3" className="fill-emerald-600/80" />

      {/* Milestone 2 */}
      <circle cx="68" cy="100" r="8" className="fill-[var(--accent-soft)] stroke-[var(--accent)]" strokeWidth="2" />
      <rect x="92" y="90" width="136" height="22" rx="7" className="fill-[var(--surface-2)] stroke-[var(--line)]" />
      <rect x="104" y="98" width="84" height="6" rx="3" className="fill-[var(--accent)]" />

      {/* Milestone 3 */}
      <circle cx="68" cy="142" r="8" className="fill-amber-500/20 stroke-amber-500" strokeWidth="2" />
      <rect x="92" y="132" width="136" height="22" rx="7" className="fill-[var(--surface-2)] stroke-[var(--line)]" />
      <rect x="104" y="140" width="74" height="6" rx="3" className="fill-[var(--ink-2)]/50" />
    </svg>
  );
}
