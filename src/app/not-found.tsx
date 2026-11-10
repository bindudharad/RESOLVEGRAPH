import Link from "next/link";
import { ArrowLeft, FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line-2 bg-surface-2 text-[#a08bff] shadow-lg">
        <FileQuestion className="h-8 w-8" />
      </div>

      <span className="mt-6 font-mono text-[13px] font-bold tracking-widest text-[#a08bff] uppercase">
        404 · Resource Not Found
      </span>

      <h1 className="mt-2 text-[26px] font-bold text-fg sm:text-[32px]">
        Dispute Record or Route Missing
      </h1>

      <p className="mt-2 max-w-md text-[14px] text-subtle leading-relaxed">
        The page or case ID you requested does not exist in this demonstration workspace.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button
            variant="primary"
            size="md"
            icon={<Home className="h-4 w-4" />}
          >
            Return to Home
          </Button>
        </Link>

        <Link href="/cases">
          <Button
            variant="outline"
            size="md"
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Browse Cases
          </Button>
        </Link>
      </div>

      <p className="mt-12 text-[11.5px] font-mono text-faint">
        RESOLVEGRAPH · AI-Powered Commerce Resolution Infrastructure
      </p>
    </div>
  );
}
