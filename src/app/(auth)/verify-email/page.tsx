"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="rounded-xl border border-line bg-surface p-8 shadow-xl flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Email Verified Successfully
        </h2>

        <p className="text-[13px] text-muted max-w-sm leading-relaxed">
          Your identity and electronic communications address have been authenticated in accordance with ResolveGraph tenant security policy.
        </p>

        <div className="flex items-center gap-2 rounded-md border border-line bg-[#090f1e] px-3 py-1.5 text-[11.5px] text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Tenant Clearance Level: Standard</span>
        </div>

        <Link href="/dashboard" className="w-full mt-2">
          <Button variant="primary" className="w-full justify-center">
            Continue to Workspace Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
