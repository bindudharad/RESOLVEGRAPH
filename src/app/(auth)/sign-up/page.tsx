"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, Check, KeyRound, Mail, ShieldAlert, User } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength checks
  const isMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isMinLength && hasUppercase && hasNumberOrSymbol && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please ensure all security and password requirements are met.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signUp.email({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        callbackURL: "/dashboard",
      });

      if (res.error) {
        setError(res.error.message || "Failed to create account. Email may already be registered.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Sign-up exception:", err);
      setError("An unexpected error occurred during account creation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Create ResolveGraph Account
        </h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Register to file complaints, provide evidence, and manage resolutions.
        </p>
      </div>

      {/* Role Escalation Notice */}
      <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-[12px] text-sky-200">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
        <div>
          <span className="font-semibold">Consumer Role Enforcement:</span> Public registrations are assigned standard Buyer credentials. Merchant access requires an administrator invitation.
        </div>
      </div>

      {/* Registration Card */}
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

          <Field label="Full Legal Name" htmlFor="fullName" required>
            <Input
              id="fullName"
              type="text"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="h-4 w-4" />}
              required
            />
          </Field>

          <Field label="Email Address" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              placeholder="e.g. alex.morgan@consumer.demo"
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
              autoComplete="new-password"
              placeholder="Minimum 12 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              required
            />
          </Field>

          <Field label="Confirm Password" htmlFor="confirmPassword" required>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              required
            />
          </Field>

          {/* Password Requirements Checklist */}
          <div className="rounded-lg border border-line bg-[#090f1e] p-3 text-[11.5px] text-muted space-y-1.5">
            <div className="font-medium text-fg mb-1">Password Requirements:</div>
            <div className={`flex items-center gap-2 ${isMinLength ? "text-emerald-400" : "text-faint"}`}>
              <Check className={`h-3 w-3 ${isMinLength ? "opacity-100" : "opacity-30"}`} />
              <span>Minimum 12 characters ({password.length}/12)</span>
            </div>
            <div className={`flex items-center gap-2 ${hasUppercase ? "text-emerald-400" : "text-faint"}`}>
              <Check className={`h-3 w-3 ${hasUppercase ? "opacity-100" : "opacity-30"}`} />
              <span>At least one uppercase letter (A-Z)</span>
            </div>
            <div className={`flex items-center gap-2 ${hasNumberOrSymbol ? "text-emerald-400" : "text-faint"}`}>
              <Check className={`h-3 w-3 ${hasNumberOrSymbol ? "opacity-100" : "opacity-30"}`} />
              <span>At least one number or special symbol</span>
            </div>
            <div className={`flex items-center gap-2 ${passwordsMatch ? "text-emerald-400" : "text-faint"}`}>
              <Check className={`h-3 w-3 ${passwordsMatch ? "opacity-100" : "opacity-30"}`} />
              <span>Passwords match</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isFormValid}
            className="mt-2 w-full justify-center text-[13.5px] font-semibold"
          >
            <span>Create Account & Enter</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Footer Navigation */}
      <div className="text-center text-[12.5px] text-muted">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-[var(--color-brand)] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
