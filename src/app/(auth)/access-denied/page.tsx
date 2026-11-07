"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, LogOut, Building, User } from "lucide-react";

export default function AccessDeniedPage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="rounded-xl border border-line bg-surface p-8 shadow-xl flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
          <ShieldX className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-300 uppercase tracking-wider">
          403 Access Denied
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Tenant Isolation Boundary Enforced
        </h2>

        <p className="text-[13px] text-muted max-w-sm leading-relaxed">
          You do not have authorization to view or modify this case, evidence asset, or organizational domain under ResolveGraph tenant isolation rules.
        </p>

        {session?.user && (
          <div className="w-full rounded-lg border border-line bg-[#090f1e] p-3 text-left text-[12px] space-y-1.5">
            <div className="flex items-center justify-between text-muted">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-faint" />
                <span>Authenticated Persona:</span>
              </span>
              <span className="font-medium text-fg">{session.user.name}</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-faint" />
                <span>Account Identity:</span>
              </span>
              <span className="font-mono text-[11px] text-fg">{session.user.email}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-2">
          <Link href="/dashboard" className="flex-1">
            <Button variant="primary" className="w-full justify-center text-[12.5px]">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              router.push("/sign-in");
            }}
            className="flex-1 justify-center text-[12.5px]"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            <span>Switch Account</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
