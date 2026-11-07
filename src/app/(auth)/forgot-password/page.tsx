"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In local demo environment, simulate immediate recovery email dispatch
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Reset Your Password
        </h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Enter your registered email address to receive password reset instructions.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6 shadow-xl">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <h3 className="text-[16px] font-semibold text-fg">Instructions Sent</h3>
            <p className="text-[12.5px] text-muted leading-relaxed max-w-xs">
              If an account exists for <span className="text-fg font-medium">{email}</span>, we have sent a secure recovery link to your inbox.
            </p>
            <Link href="/sign-in" className="mt-4 w-full">
              <Button variant="outline" className="w-full justify-center">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Registered Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                placeholder="e.g. name@merchant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-2 w-full justify-center text-[13px] font-semibold"
            >
              Send Password Reset Link
            </Button>
          </form>
        )}
      </div>

      <div className="text-center">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  );
}
