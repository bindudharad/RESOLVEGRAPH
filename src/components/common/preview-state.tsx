import { ArrowRight, Construction, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DemoBadge } from "@/components/common/demo-badge";

/**
 * Explicit placeholder for routes whose backend capability is not built yet.
 *
 * This exists so unfinished navigation can never be mistaken for working
 * product functionality: the screen states plainly what is deferred and why.
 */
export function PreviewState({
  icon: Icon,
  title,
  headline,
  summary,
  planned,
  statusLabel = "Planned",
  children,
}: {
  icon: LucideIcon;
  title: string;
  headline: string;
  summary: string;
  planned: string[];
  statusLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="items-center px-6 pb-5 pt-7">
          <span
            aria-hidden="true"
            className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-line-2 bg-[#0a1120] text-[#b3a1ff] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-brand)_18%,transparent),0_10px_30px_-14px_var(--color-brand)]"
          >
            <Icon className="h-5.5 w-5.5" />
          </span>
          <div className="flex flex-col items-center gap-2.5 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge tone="brand" dot>
                {statusLabel}
              </Badge>
              <DemoBadge size="xs" />
            </div>
            <CardTitle className="text-[17px]">{headline}</CardTitle>
            <CardDescription className="max-w-xl text-center text-[13px]">
              {summary}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          <div className="rounded-lg border border-line bg-[#0a1120] p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
              <Construction className="h-3.5 w-3.5 text-[#f7c95c]" aria-hidden="true" />
              {title} is intentionally not implemented in Step 1
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {planned.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed text-subtle"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand)]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {children ? <div className="mt-4">{children}</div> : null}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 border-t border-line pt-4">
            <ButtonLink href="/dashboard" variant="outline" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Back to dashboard
            </ButtonLink>
            <ButtonLink href="/cases" variant="ghost" size="sm">
              Open working case list
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
