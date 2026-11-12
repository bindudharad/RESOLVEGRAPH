"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  Store,
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";

type WorkspaceRole = "PLATFORM" | "BUYER" | "MERCHANT";

interface WorkspaceCardDef {
  id: WorkspaceRole;
  title: string;
  badge: string;
  description: string;
  buttonLabel: string;
  icon: typeof ShieldCheck;
  theme: {
    accentBorder: string;
    hoverBorder: string;
    bgGradient: string;
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    buttonBg: string;
    glowShadow: string;
    tagPill: string;
  };
  highlights: string[];
}

const WORKSPACE_CARDS: WorkspaceCardDef[] = [
  {
    id: "PLATFORM",
    title: "PLATFORM",
    badge: "Platform Administration",
    description:
      "Universal dispute triage, cross-tenant forensics, emergency kill switch controls, and tamper-evident audit ledger.",
    buttonLabel: "Enter Platform",
    icon: ShieldCheck,
    theme: {
      accentBorder: "border-indigo-500/30",
      hoverBorder: "hover:border-indigo-500/70",
      bgGradient: "from-indigo-500/[0.08] via-[#0E1220]/90 to-[#0E1220]/98",
      iconBg: "bg-indigo-500/15",
      iconBorder: "border-indigo-500/30",
      iconColor: "text-indigo-400",
      badgeBg: "bg-indigo-500/15 border-indigo-500/30",
      badgeText: "text-indigo-300",
      buttonBg: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20",
      glowShadow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.22)]",
      tagPill: "bg-indigo-500/10 text-indigo-300/90 border-indigo-500/20",
    },
    highlights: [
      "Cross-Tenant Triage",
      "Forensic Kill Switch",
      "Tamper-Evident Ledger",
    ],
  },
  {
    id: "BUYER",
    title: "BUYER",
    badge: "Buyer & Purchase Management",
    description:
      "Deterministic purchase memory, Package Passport verification, dual-camera unboxing challenge, and bilateral claim filing.",
    buttonLabel: "Enter Buyer",
    icon: UserRound,
    theme: {
      accentBorder: "border-teal-500/30",
      hoverBorder: "hover:border-teal-500/70",
      bgGradient: "from-teal-500/[0.08] via-[#0E1220]/90 to-[#0E1220]/98",
      iconBg: "bg-teal-500/15",
      iconBorder: "border-teal-500/30",
      iconColor: "text-teal-400",
      badgeBg: "bg-teal-500/15 border-teal-500/30",
      badgeText: "text-teal-300",
      buttonBg: "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/20",
      glowShadow: "hover:shadow-[0_0_30px_rgba(20,184,166,0.22)]",
      tagPill: "bg-teal-500/10 text-teal-300/90 border-teal-500/20",
    },
    highlights: [
      "Purchase Memory Archive",
      "Package Passport & Seal",
      "Shared Resolution Room",
    ],
  },
  {
    id: "MERCHANT",
    title: "SELLER / MERCHANT",
    badge: "Merchant Operations",
    description:
      "Store transactions ledger, dispute response defense, counter-evidence vault, statutory SLA tracking, and BERR policy remedies.",
    buttonLabel: "Enter Merchant",
    icon: Store,
    theme: {
      accentBorder: "border-amber-500/30",
      hoverBorder: "hover:border-amber-500/70",
      bgGradient: "from-amber-500/[0.08] via-[#0E1220]/90 to-[#0E1220]/98",
      iconBg: "bg-amber-500/15",
      iconBorder: "border-amber-500/30",
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-500/15 border-amber-500/30",
      badgeText: "text-amber-300",
      buttonBg: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20",
      glowShadow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.22)]",
      tagPill: "bg-amber-500/10 text-amber-300/90 border-amber-500/20",
    },
    highlights: [
      "Store Sales & Ledger",
      "Counter-Evidence Vault",
      "BERR Policy Remedies",
    ],
  },
];

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Validate callback URL to ensure it is same-origin relative path
  const hasExplicitCallback = Boolean(
    searchParams.get("callbackUrl") || searchParams.get("redirect")
  );
  const rawCallback =
    searchParams.get("callbackUrl") || searchParams.get("redirect") || "/overview";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/overview";

  // Mode: "one-click" by default for instant judge/evaluator access, "manual" for standard credentials
  const initialMode = searchParams.get("mode") === "manual" ? "manual" : "one-click";
  const [mode, setMode] = useState<"one-click" | "manual">(initialMode);

  // One-click authentication state
  const [authenticatingWorkspace, setAuthenticatingWorkspace] =
    useState<WorkspaceRole | null>(null);

  // Standard manual login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handler: One-Click Demo Workspace Entry
  const handleOneClickEntry = async (workspace: WorkspaceRole) => {
    if (authenticatingWorkspace) return;
    setAuthenticatingWorkspace(workspace);
    setError(null);

    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspace }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Unable to establish demo session. Please try standard sign-in."
        );
      }

      // Successful server-side Better-Auth authentication
      // Session cookies are established via HTTP response headers
      const targetUrl =
        !hasExplicitCallback && typeof data.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : callbackUrl;
      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error("[One-Click Entry Error]:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during demo entry. Please sign in normally.";
      setError(message);
      setAuthenticatingWorkspace(null);
    }
  };

  // Handler: Standard Manual Email/Password Authentication
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please provide both your email address and password.");
      return;
    }

    setManualLoading(true);
    setError(null);

    try {
      const res = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe,
      });

      if (res.error) {
        setError("Invalid email address or password. Please verify your credentials.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error("[Manual Sign-in error]:", err);
      setError("An unexpected error occurred during sign-in. Please try again.");
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="w-full my-auto">
      {mode === "one-click" ? (
        /* ========================================================================= */
        /* MODE 1: ONE-CLICK ROLE-BASED WORKSPACE SELECTION (PRIMARY EXPERIENCE)     */
        /* ========================================================================= */
        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Link href="/" className="inline-flex items-center gap-2">
                <Logo className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
                </span>
              </Link>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[10px] sm:text-[10.5px] font-mono text-[var(--accent)] mb-1">
              <Sparkles className="h-3 w-3" />
              <span>Instant Workspace Access</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Choose Your Workspace
            </h1>
            <p className="mt-0.5 text-[11px] sm:text-xs text-white/60 max-w-md mx-auto">
              Select your destination role to instantly enter the RESOLVEGRAPH 2.0 dispute resolution workspace.
            </p>
          </div>

          {/* Error Alert if any */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 max-w-md mx-auto w-full rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Active Loading Notification */}
          {authenticatingWorkspace && (
            <div className="flex items-center justify-center gap-2 max-w-md mx-auto w-full rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3 py-2 text-xs font-medium text-white shadow-lg animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
              <span>
                Preparing your workspace... Establishing verified Better-Auth session
              </span>
            </div>
          )}

          {/* Three Large Interactive Workspace Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {WORKSPACE_CARDS.map((card) => {
              const IconComp = card.icon;
              const isLoading = authenticatingWorkspace === card.id;
              const isDisabled = Boolean(authenticatingWorkspace && !isLoading);

              return (
                <div
                  key={card.id}
                  className={`group relative flex flex-col justify-between p-4 sm:p-4.5 rounded-2xl border bg-gradient-to-b ${card.theme.bgGradient} ${card.theme.accentBorder} ${card.theme.hoverBorder} ${card.theme.glowShadow} transition-all duration-200 backdrop-blur-xl ${
                    isDisabled ? "opacity-50 pointer-events-none" : ""
                  } ${isLoading ? "ring-2 ring-[var(--accent)] shadow-xl" : ""}`}
                >
                  {/* Card Top Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border ${card.theme.iconBg} ${card.theme.iconBorder} ${card.theme.iconColor} shadow-md transition-transform duration-200 group-hover:scale-105`}
                      >
                        <IconComp className="h-5 w-5" />
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-wider ${card.theme.badgeBg} ${card.theme.badgeText}`}
                      >
                        {card.badge}
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide mb-1">
                      {card.title}
                    </h2>

                    <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mb-3">
                      {card.description}
                    </p>

                    {/* Capabilities Tags */}
                    <div className="flex flex-wrap gap-1 mb-3.5">
                      {card.highlights.map((item) => (
                        <span
                          key={item}
                          className={`inline-flex items-center gap-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${card.theme.tagPill}`}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 opacity-60" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <Button
                      type="button"
                      disabled={Boolean(authenticatingWorkspace)}
                      onClick={() => handleOneClickEntry(card.id)}
                      className={`w-full justify-center text-xs sm:text-sm font-semibold py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${card.theme.buttonBg}`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          <span>Preparing your workspace...</span>
                        </>
                      ) : (
                        <>
                          <span>{card.buttonLabel}</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secondary Link for Normal Login */}
          <div className="flex flex-col items-center gap-1.5 text-center pt-1 text-xs text-white/60">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("manual");
              }}
              className="inline-flex items-center gap-1 text-[11.5px] text-white/70 hover:text-white font-medium hover:underline cursor-pointer transition-colors"
            >
              <span>Already have an account? Sign in normally</span>
              <ArrowRight className="h-3 w-3" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 font-mono">
              <span>Genuine Better-Auth</span>
              <span>·</span>
              <span>Strict Tenant Isolation</span>
              <span>·</span>
              <span>Live Funds Locked</span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE 2: STANDARD EMAIL & PASSWORD AUTHENTICATION FORM                     */
        /* ========================================================================= */
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-md mx-auto">
          {/* Back to One-Click Workspace Selection */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("one-click");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to One-Click Workspace Selection</span>
            </button>
            <span className="text-[10px] font-mono text-white/40">Standard Sign-In</span>
          </div>

          {/* Editorial Header */}
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Link href="/" className="inline-flex items-center gap-2">
                <Logo className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
                </span>
              </Link>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] sm:text-[10.5px] font-mono text-[var(--accent)] mb-1">
              <Lock className="h-3 w-3" />
              <span>Standard Authentication</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-0.5 text-[11px] sm:text-xs text-white/60">
              Sign in with your registered email and password to access your workspace.
            </p>
          </div>

          {/* Main Form Card */}
          <div className="rounded-2xl border border-white/[0.1] bg-[#0E1220]/90 p-3.5 sm:p-4.5 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 sm:gap-2.5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2 sm:p-2.5 text-xs text-red-200"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <Field label="Work or Personal Email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4 text-white/40" />}
                  required
                />
              </Field>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="password" className="font-medium text-white/90 text-xs">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-[var(--accent)] hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<KeyRound className="h-4 w-4 text-white/40" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-[11.5px]">Remember this session</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={manualLoading}
                className="mt-0.5 w-full justify-center text-xs sm:text-sm font-semibold py-2 shadow-md cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </form>
          </div>

          {/* Footer Navigation */}
          <div className="space-y-1 text-center text-xs text-white/60">
            <p className="text-[11.5px]">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Create account
              </Link>
            </p>
            <div className="flex items-center justify-center gap-3 text-[10.5px] text-white/40">
              <Link href="/help" className="hover:underline">Help &amp; Support</Link>
              <span>·</span>
              <Link href="/docs" className="hover:underline">Documentation</Link>
              <span>·</span>
              <span className="text-white/30">Privacy &amp; Terms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-white/60 text-center py-12">Loading sign-in...</div>}>
      <SignInForm />
    </Suspense>
  );
}
