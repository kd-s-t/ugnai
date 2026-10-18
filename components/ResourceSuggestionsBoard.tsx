"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCommandWorkspace } from "@/components/CommandWorkspaceProvider";
import { listenAllShortages } from "@/lib/resourcesShortages/api";
import type { ResourceShortage } from "@/lib/resourcesShortages/types";
import {
  hrefForShortageWorkflow,
  shortageWorkflowStepLabel,
} from "@/lib/resourcesShortages/types";
import { listenAllSuggestions } from "@/lib/resourcesSuggestions/api";
import type { ResourceSuggestion } from "@/lib/resourcesSuggestions/types";
import { filterSuggestionsForScope } from "@/lib/workspace/resourceEpicScope";
import { scopeLabel } from "@/lib/reports/barangayScope";
import { cn } from "@/lib/utils";

function fmtL(n: number): string {
  return `${n.toLocaleString("en-PH")} L`;
}

function stepTone(step: 1 | 2 | 3 | null | undefined) {
  if (step === 3) return "bg-[#ecfdf3] text-[#16794c] ring-[#86efac]/60";
  if (step === 2) return "bg-[#eff6ff] text-[#2f5f9e] ring-[#93c5fd]/70";
  if (step === 1) return "bg-[#fffbeb] text-[#b45309] ring-[#fde68a]";
  return "bg-[#f8fafc] text-[var(--muted)] ring-[var(--border)]";
}

export function ResourceSuggestionsBoard() {
  const { scopedReports, reportScope } = useCommandWorkspace();
  const [rows, setRows] = useState<ResourceSuggestion[]>([]);
  const [shortages, setShortages] = useState<ResourceShortage[]>([]);

  useEffect(() => listenAllSuggestions(setRows), []);
  useEffect(() => listenAllShortages(setShortages), []);

  const scopedIds = useMemo(
    () => new Set(scopedReports.map((r) => r.id)),
    [scopedReports],
  );

  const scopedRows = useMemo(
    () => filterSuggestionsForScope(rows, reportScope, scopedIds),
    [rows, reportScope, scopedIds],
  );

  const shortageByPlanId = useMemo(() => {
    const m = new Map<string, ResourceShortage>();
    for (const s of shortages) {
      m.set(s.id.toUpperCase(), s);
    }
    return m;
  }, [shortages]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-[var(--muted)]">
            <Link
              href="/admin/resources"
              className="text-[#2f5f9e] hover:underline"
            >
              Resources
            </Link>
            <span className="mx-1.5 text-[var(--border)]">/</span>
            Suggested
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide text-[var(--foreground)] sm:text-[2rem]">
            Resources suggested
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Saved plans for {scopeLabel(reportScope)}. Sitio requests are nested
            in each plan.
          </p>
        </div>
        <p className="text-[12px] text-[var(--muted)]">
          {scopedRows.length} {scopedRows.length === 1 ? "plan" : "plans"}
        </p>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[#f8fafc] text-[12px] text-[var(--muted)]">
                <th className="px-4 py-2.5 font-medium sm:px-5">Plan</th>
                <th className="px-3 py-2.5 font-medium">Resource</th>
                <th className="px-3 py-2.5 font-medium">Step</th>
                <th className="px-3 py-2.5 font-medium">Requests</th>
                <th className="px-3 py-2.5 font-medium">Need</th>
                <th className="px-3 py-2.5 font-medium">Gap</th>
                <th className="px-4 py-2.5 font-medium sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {scopedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-[var(--muted)] sm:px-5"
                  >
                    No suggestions yet for this barangay. Open a shortage with
                    Review shortage to save a plan.
                  </td>
                </tr>
              ) : (
                scopedRows.map((row) => {
                  const shortage = shortageByPlanId.get(row.id.toUpperCase());
                  const step = shortage?.workflowStep ?? null;
                  const openHref = hrefForShortageWorkflow(row.id, step);
                  return (
                    <tr
                      key={`${row.id}-${row.requestCount}`}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <Link
                          href={openHref}
                          className="font-medium text-[#2f5f9e] hover:underline"
                        >
                          {row.id}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[var(--muted)]">
                        {row.resourceLabel}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                            stepTone(step),
                          )}
                        >
                          {shortageWorkflowStepLabel(step)}
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {row.requestCount || row.requests.length} sitios
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {fmtL(row.totalNeededL)}
                      </td>
                      <td className="px-3 py-3 tabular-nums font-semibold text-[#c72929]">
                        {fmtL(row.shortageL)}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <Link
                          href={openHref}
                          className="inline-flex rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)]/25"
                        >
                          {step === 3
                            ? "Continue track"
                            : step === 2
                              ? "Continue review"
                              : step === 1
                                ? "Continue compare"
                                : "Open plan"}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
