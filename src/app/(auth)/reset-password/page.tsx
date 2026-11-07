"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle2, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isMinLength && hasUppercase && hasNumberOrSymbol && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Set New Password
        </h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Please establish a secure password conforming to enterprise security policies.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6 shadow-xl">
        {success ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <h3 className="text-[16px] font-semibold text-fg">Password Updated</h3>
            <p className="text-[12.5px] text-muted">
              Your password has been successfully reset. Redirecting to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="New Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
                required
              />
            </Field>

            <Field label="Confirm New Password" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
                required
              />
            </Field>

            <div className="rounded-lg border border-line bg-[#090f1e] p-3 text-[11.5px] text-muted space-y-1">
              <div className={`flex items-center gap-2 ${isMinLength ? "text-emerald-400" : "text-faint"}`}>
                <Check className={`h-3 w-3 ${isMinLength ? "opacity-100" : "opacity-30"}`} />
                <span>Minimum 12 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${hasUppercase ? "text-emerald-400" : "text-faint"}`}>
                <Check className={`h-3 w-3 ${hasUppercase ? "opacity-100" : "opacity-30"}`} />
                <span>At least one uppercase letter</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumberOrSymbol ? "text-emerald-400" : "text-faint"}`}>
                <Check className={`h-3 w-3 ${hasNumberOrSymbol ? "opacity-100" : "opacity-30"}`} />
                <span>At least one number or symbol</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!isFormValid}
              className="mt-2 w-full justify-center text-[13px] font-semibold"
            >
              Update Password
            </Button>
          </form>
        )}
      </div>

      <div className="text-center">
        <Link href="/sign-in" className="text-[12.5px] text-muted hover:text-fg">
          Cancel and return to sign in
        </Link>
      </div>
    </div>
  );
}
