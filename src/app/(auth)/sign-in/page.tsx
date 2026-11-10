"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Mail, Sparkles, Shield } from "lucide-react";
import { TiltCard3D } from "@/components/3d/tilt-card-3d";

const DEMO_PERSONAS = [
  {
    role: "Platform Admin",
    name: "Priya Raghavan",
    email: "admin@resolvegraph.demo",
    password: "Admin@ResolveGraph2026!",
    scope: "Full Platform Scope",
    badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  {
    role: "Buyer (Consumer)",
    name: "Alex Morgan",
    email: "alex.morgan@consumer.demo",
    password: "Buyer@ResolveGraph2026!",
    scope: "Alex's Cases Only",
    badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  {
    role: "Merchant Agent",
    name: "TechStore Agent",
    email: "disputes@techstore.demo",
    password: "Merchant@TechStore2026!",
    scope: "TechStore Workspace",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const handleQuickFill = (persona: typeof DEMO_PERSONAS[0]) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setSelectedPersona(persona.role);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });

      if (res.error) {
        setError(res.error.message || "Invalid email or password. Please verify credentials.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Sign-in exception:", err);
      setError("An unexpected error occurred during sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Editorial Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-0.5 text-[11px] font-mono text-[var(--accent)] mb-3">
          <Shield className="h-3 w-3" />
          <span>FIPS 140-2 Encrypted Session</span>
        </div>
        <h2 className="text-3xl font-normal font-display tracking-tight text-white">
          Sign in to <span className="italic text-[var(--accent)] font-semibold">ResolveGraph</span>
        </h2>
        <p className="mt-1.5 text-[13px] text-white/60">
          Access your cases, bilateral evidence vault, and resolution workflows.
        </p>
      </div>

      {/* Quick-fill Demo Personas (Plumbline Tactical Paper & 3D micro-lift) */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md paper-dark">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/90">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Interactive Demo Personas</span>
          </span>
          <span className="text-[10.5px] font-mono text-white/50">Instant Credential Fill</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {DEMO_PERSONAS.map((p) => {
            const isSelected = selectedPersona === p.role || email === p.email;
            return (
              <button
                key={p.role}
                type="button"
                onClick={() => handleQuickFill(p)}
                className={`group flex flex-col items-start rounded-lg border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 shadow-[0_0_15px_rgba(67,80,229,0.3)] ring-1 ring-[var(--accent)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9.5px] font-mono font-semibold uppercase tracking-wider border ${p.badgeColor}`}
                  >
                    {p.role.split(" ")[0]}
                  </span>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />}
                </div>
                <span className="mt-2 text-[12.5px] font-medium text-white truncate w-full group-hover:text-[var(--accent)] transition-colors">
                  {p.name}
                </span>
                <span className="text-[10.5px] text-white/50 truncate w-full font-mono">
                  {p.scope}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign-in Form Card with 3D Tilt */}
      <TiltCard3D maxTilt={6} depth={15}>
        <div className="relative rounded-2xl border border-white/[0.1] bg-[#0E1220]/90 p-7 shadow-2xl backdrop-blur-xl paper-dark overflow-hidden">
          {/* Laser Scanner Line */}
          <div className="scan-y" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <Field label="Work or Personal Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="e.g. name@merchant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4 text-white/50" />}
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<KeyRound className="h-4 w-4 text-white/50" />}
                required
              />
            </Field>

            <div className="flex items-center justify-between text-[12px] pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-white">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-white/20 bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span>Remember this session</span>
              </label>
              <Link
                href="/forgot-password"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-3 w-full justify-center text-[14px] font-semibold py-3 shadow-[0_10px_25px_-5px_rgba(67,80,229,0.5)] cursor-pointer"
            >
              <span>Sign in to Workspace</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </div>
      </TiltCard3D>

      {/* Footer Navigation */}
      <div className="text-center text-[12.5px] text-white/60">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Create buyer account
        </Link>
      </div>
    </div>
  );
}
