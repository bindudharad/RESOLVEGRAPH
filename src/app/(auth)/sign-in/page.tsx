"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Mail, Sparkles } from "lucide-react";

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
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Sign in to ResolveGraph
        </h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Access your cases, evidence vault, and resolution workflows.
        </p>
      </div>

      {/* Quick-fill Demo Personas */}
      <div className="rounded-xl border border-line bg-surface/70 p-3.5 backdrop-blur-sm">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-fg">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-brand)]" />
            <span>Interactive Demo Personas</span>
          </span>
          <span className="text-[10.5px] text-faint">Instant Credential Fill</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DEMO_PERSONAS.map((p) => {
            const isSelected = selectedPersona === p.role || email === p.email;
            return (
              <button
                key={p.role}
                type="button"
                onClick={() => handleQuickFill(p)}
                className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                  isSelected
                    ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)] shadow-sm"
                    : "border-line/70 bg-[#0B0F17] hover:border-line hover:bg-surface-2"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${p.badgeColor}`}
                  >
                    {p.role.split(" ")[0]}
                  </span>
                  {isSelected && <CheckCircle2 className="h-3 w-3 text-[var(--color-brand)]" />}
                </div>
                <span className="mt-1.5 text-[12px] font-medium text-fg truncate w-full">
                  {p.name}
                </span>
                <span className="text-[10.5px] text-faint truncate w-full">
                  {p.scope}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign-in Form Card */}
      <div className="rounded-xl border border-line bg-surface p-6 shadow-xl">
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
              icon={<Mail className="h-4 w-4" />}
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
              icon={<KeyRound className="h-4 w-4" />}
              required
            />
          </Field>

          <div className="flex items-center justify-between text-[12px]">
            <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-fg">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-line bg-[#0B0F17] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
              />
              <span>Remember this session</span>
            </label>
            <Link
              href="/forgot-password"
              className="font-medium text-[var(--color-brand)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="mt-2 w-full justify-center text-[13.5px] font-semibold"
          >
            <span>Sign in to Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Footer Navigation */}
      <div className="text-center text-[12.5px] text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-[var(--color-brand)] hover:underline"
        >
          Create buyer account
        </Link>
      </div>
    </div>
  );
}
