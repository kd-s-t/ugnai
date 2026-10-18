"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AllocationPlanStepper } from "@/components/AllocationPlanStepper";
import { useCommandWorkspace } from "@/components/CommandWorkspaceProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isOfficer } from "@/lib/auth/types";
import {
  readAllocationCache,
  takeShortageFlash,
} from "@/lib/resourcesShortages/allocationCache";
import {
  getShortageById,
  patchShortageAllocationLines,
  saveShortageAllocationDraft,
  saveShortageWorkflowStep,
  setShortageReviewStatus,
  upsertShortageFromPlan,
} from "@/lib/resourcesShortages/api";
import type { ResourceShortage } from "@/lib/resourcesShortages/types";
import { scopeLabel } from "@/lib/reports/barangayScope";
import {
  buildLocalAllocationOptions,
  type AllocationLine,
  type AllocationOption,
} from "@/lib/workspace/allocationOptions";
import {
  resourceEpicStorageId,
} from "@/lib/workspace/resourceEpicScope";
import {
  apasSitioWaterReports,
  buildSupplyShortagePlan,
  reportsForEpicCode,
  type SupplyShortagePlan,
} from "@/lib/workspace/supplyShortagePlan";
import { verifyDeliveryAccess } from "@/lib/workspace/verifyDeliveryAccess";
import { cn } from "@/lib/utils";

function fmtL(n: number): string {
  return `${n.toLocaleString("en-PH")} L`;
}

function noteFor(line: AllocationLine): string {
  if (line.constraint === "no_blockers") {
    return "Can proceed after final checks.";
  }
  if (line.constraint === "no_transport") {
    return "Transport needed to deliver supplies.";
  }
  return "Requires access confirmation before delivery.";
}

function followUpCopy(line: AllocationLine): string {
  if (line.constraint === "no_transport") {
    return "Find a vehicle, schedule a later delivery, or request partner transport.";
  }
  if (
    line.constraintLabel === "Verified road block" ||
    line.constraintLabel === "Road block nearby"
  ) {
    return "A verified road block is on the route. Clear it on Incidents, then verify again.";
  }
  return "Checks the incident map for a verified road block, then saves the result.";
}

function verifyCheckedAtLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function constraintTone(constraint: AllocationLine["constraint"]) {
  if (constraint === "no_blockers") return "text-[#16794c]";
  if (constraint === "no_transport") return "text-[#b91c1c]";
  return "text-[#b45309]";
}

function constraintPill(constraint: AllocationLine["constraint"]) {
  if (constraint === "no_blockers") {
    return "bg-[#ecfdf3] text-[#16794c] ring-[#86efac]/60";
  }
  if (constraint === "no_transport") {
    return "bg-[#fef2f2] text-[#b91c1c] ring-[#fecaca]";
  }
  return "bg-[#fffbeb] text-[#b45309] ring-[#fde68a]";
}

function optionLabel(opt: AllocationOption, index: number): string {
  return `Option ${index + 1} - ${opt.title}`;
}

export function ReviewAllocationPlan() {
  const { profile } = useAuth();
  const { reports, scopedReports, reportScope } = useCommandWorkspace();
  const router = useRouter();
  const params = useParams();
  const rsCode = String(params.id ?? "RS-001").trim().toUpperCase() || "RS-001";

  const storageId = useMemo(
    () => resourceEpicStorageId(rsCode, reportScope),
    [rsCode, reportScope],
  );

  const flashRef = useRef<ResourceShortage | null | undefined>(undefined);
  if (flashRef.current === undefined) {
    flashRef.current = takeShortageFlash(storageId);
  }

  const [shortage, setShortage] = useState<ResourceShortage | null>(
    () => flashRef.current ?? null,
  );
  const [fallbackOptions, setFallbackOptions] = useState<AllocationOption[]>(
    [],
  );
  const [fallbackSelectedId, setFallbackSelectedId] = useState<string | null>(
    null,
  );
  const [loadingShortage, setLoadingShortage] = useState(
    () => !flashRef.current,
  );
  const [lines, setLines] = useState<AllocationLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [verifyBusyId, setVerifyBusyId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<
    Record<string, { ok: boolean; message: string; checkedAt: string }>
  >({});

  const placeHint = useMemo(() => {
    if (isOfficer(profile)) {
      const b = profile.barangay?.trim();
      if (b) return b;
    }
    return scopeLabel(reportScope);
  }, [profile, reportScope]);

  const plan = useMemo((): SupplyShortagePlan | null => {
    const apasDesk =
      reportScope.mode === "barangay" && /apas/i.test(reportScope.barangay);
    if (apasDesk) {
      const apasWater = apasSitioWaterReports(reports);
      if (apasWater.length >= 2) {
        return buildSupplyShortagePlan(
          "water",
          apasWater,
          scopedReports,
          rsCode,
        );
      }
    }
    const matched = reportsForEpicCode(rsCode, scopedReports);
    if (!matched) return null;
    return buildSupplyShortagePlan(
      matched.kind,
      matched.reports,
      scopedReports,
      rsCode,
    );
  }, [reports, scopedReports, rsCode, reportScope]);

  const planKey = useMemo(() => {
    if (!plan) return "";
    return [
      plan.code,
      plan.availableL,
      plan.totalNeededL,
      ...plan.rows.map(
        (r) => `${r.reportId}:${r.gapL}:${r.readiness}:${r.needL}`,
      ),
    ].join("|");
  }, [plan]);

  useEffect(() => {
    let cancelled = false;
    if (!shortage) setLoadingShortage(true);
    void (async () => {
      try {
        const existing = await getShortageById(storageId);
        if (cancelled) return;

        if (
          existing?.allocation &&
          existing.allocation.options.length >= 3
        ) {
          setShortage(existing);
          setFallbackOptions([]);
          setFallbackSelectedId(null);
          if (
            existing.reviewStatus !== "approved" &&
            existing.workflowStep !== 3
          ) {
            try {
              await saveShortageWorkflowStep(storageId, 2);
              if (!cancelled) {
                setShortage(await getShortageById(storageId));
              }
            } catch {
              /* offline */
            }
          }
          return;
        }

        const cached = planKey ? readAllocationCache(planKey) : null;
        const local =
          plan && plan.rows.length > 0
            ? buildLocalAllocationOptions(
                plan.rows,
                plan.availableL,
                plan.totalNeededL,
                plan.resourceLabel,
              )
            : null;
        const recovered =
          cached?.options && cached.options.length >= 3
            ? cached.options
            : local?.options && local.options.length >= 3
              ? local.options
              : [];
        const recoveredId =
          existing?.selectedOptionId ||
          cached?.selectedOptionId ||
          recovered.find((o) => o.suggested)?.id ||
          recovered[0]?.id ||
          null;

        if (recovered.length >= 3 && plan) {
          try {
            await upsertShortageFromPlan(plan, storageId);
            await saveShortageAllocationDraft(storageId, {
              planKey: planKey || `${plan.code}:recovered`,
              options: recovered,
              source: cached?.source ?? "local",
              prompt: cached?.debug?.prompt ?? null,
              raw: cached?.debug?.raw ?? null,
              model: cached?.debug?.model ?? null,
              error: cached?.debug?.error ?? null,
              savedAt: new Date().toISOString(),
            });
            if (recoveredId) {
              await saveShortageWorkflowStep(storageId, 2, {
                selectedOptionId: recoveredId,
                reviewStatus: "review_draft",
              });
            }
            if (!cancelled) {
              setShortage(await getShortageById(storageId));
              setFallbackOptions([]);
              setFallbackSelectedId(null);
              return;
            }
          } catch {
            /* use in-memory fallback below */
          }
        }

        if (!cancelled) {
          setShortage(existing);
          setFallbackOptions(recovered);
          setFallbackSelectedId(recoveredId);
        }
      } finally {
        if (!cancelled) setLoadingShortage(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageId, planKey, plan]);

  const allocationOptions = useMemo(() => {
    const fromDb = shortage?.allocation?.options ?? [];
    if (fromDb.length >= 3) return fromDb;
    return fallbackOptions;
  }, [shortage, fallbackOptions]);

  const selectedOption = useMemo(() => {
    if (allocationOptions.length === 0) return null;
    const id =
      shortage?.selectedOptionId ||
      fallbackSelectedId ||
      allocationOptions[0]?.id ||
      "";
    return (
      allocationOptions.find((o) => o.id === id) ??
      allocationOptions[0] ??
      null
    );
  }, [shortage, fallbackSelectedId, allocationOptions]);

  const selectedIndex = useMemo(() => {
    if (!selectedOption) return 0;
    const i = allocationOptions.findIndex((o) => o.id === selectedOption.id);
    return i >= 0 ? i : 0;
  }, [allocationOptions, selectedOption]);

  useEffect(() => {
    if (selectedOption?.lines) {
      setLines(selectedOption.lines.map((l) => ({ ...l })));
    }
  }, [selectedOption]);

  const proposedTotal = useMemo(
    () => lines.reduce((s, l) => s + Math.max(0, l.allocateL), 0),
    [lines],
  );
  const availableL = plan?.availableL ?? shortage?.availableL ?? 0;
  const totalNeededL = plan?.totalNeededL ?? shortage?.totalNeededL ?? 0;
  const unmetL = Math.max(0, totalNeededL - proposedTotal);
  const approved = shortage?.reviewStatus === "approved";

  const followUps = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.constraint === "access_unverified" ||
          l.constraint === "no_transport",
      ),
    [lines],
  );

  async function onVerifyAccess(line: AllocationLine) {
    if (line.constraint !== "access_unverified" || approved) return;
    setVerifyBusyId(line.reportId);
    try {
      const row = plan?.rows.find(
        (r) =>
          r.reportId === line.reportId || r.reportIds.includes(line.reportId),
      );
      const report =
        scopedReports.find((r) => r.id === line.reportId) ||
        reports.find((r) => r.id === line.reportId);
      const result = verifyDeliveryAccess({
        reports: scopedReports,
        lat: row?.lat ?? report?.lat,
        lng: row?.lng ?? report?.lng,
        barangay:
          report?.barangay ??
          row?.barangayLabel?.replace(/^Brgy\.\s*/i, "") ??
          null,
      });
      const checkedAt = new Date().toISOString();
      const nextLines = lines.map((l) => {
        if (l.reportId !== line.reportId) return l;
        if (!result.ok) {
          return {
            ...l,
            constraint: "access_unverified" as const,
            constraintLabel: "Verified road block",
          };
        }
        return {
          ...l,
          readiness: "ready" as const,
          constraint: "no_blockers" as const,
          constraintLabel: "No blockers",
        };
      });
      const message = result.ok
        ? `Access to ${line.community} OK. No verified road block nearby.`
        : `Verified road block near ${line.community} (${result.block.title || result.block.id}). Clear it on Incidents, then verify again.`;
      setLines(nextLines);
      setVerifyResults((prev) => ({
        ...prev,
        [line.reportId]: { ok: result.ok, message, checkedAt },
      }));
      if (!selectedOption) {
        throw new Error("No allocation option selected to save.");
      }
      await patchShortageAllocationLines(
        storageId,
        selectedOption.id,
        nextLines,
      );
      setShortage((prev) => {
        if (!prev?.allocation) return prev;
        return {
          ...prev,
          allocation: {
            ...prev.allocation,
            options: prev.allocation.options.map((o) =>
              o.id === selectedOption.id ? { ...o, lines: nextLines } : o,
            ),
            savedAt: checkedAt,
          },
        };
      });
    } catch (err) {
      setVerifyResults((prev) => ({
        ...prev,
        [line.reportId]: {
          ok: false,
          message:
            err instanceof Error ? err.message : "Could not verify access",
          checkedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setVerifyBusyId(null);
    }
  }

  async function onSaveDraft() {
    setSaving(true);
    try {
      await setShortageReviewStatus(storageId, "review_draft");
      const next = await getShortageById(storageId);
      setShortage(next);
    } finally {
      setSaving(false);
    }
  }

  async function onApprove() {
    setApproving(true);
    try {
      await setShortageReviewStatus(storageId, "approved");
      const next = await getShortageById(storageId);
      setShortage(next);
      router.push(
        `/admin/resources/track/${encodeURIComponent(rsCode)}`,
      );
    } finally {
      setApproving(false);
    }
  }

  if (loadingShortage && !shortage && fallbackOptions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-sm text-[var(--muted)]">Loading plan review…</p>
      </div>
    );
  }

  if (!plan && !shortage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <p className="font-medium text-[var(--foreground)]">
          No allocation plan in scope
        </p>
        <Link
          href="/admin/resources"
          className="mt-4 inline-flex rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium"
        >
          Back to Resources
        </Link>
      </div>
    );
  }

  if (!selectedOption) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <p className="font-medium text-[var(--foreground)]">
          Choose an allocation option first
        </p>
        <Link
          href={`/admin/resources/compare/${encodeURIComponent(rsCode)}`}
          className="mt-4 inline-flex rounded-xl bg-[#2f5f9e] px-4 py-2.5 text-sm font-medium text-white"
        >
          Compare options
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href={`/admin/resources/${encodeURIComponent(rsCode)}`}
          className="text-[12px] font-medium text-[#2f5f9e] hover:underline"
        >
          ← Back to resources
        </Link>
        <div className="text-right text-[12px] text-[var(--muted)]">
          <p>{placeHint}</p>
          <p className="mt-0.5">
            Last updated{" "}
            {shortage?.updatedAt
              ? new Date(shortage.updatedAt).toLocaleString()
              : "-"}
          </p>
        </div>
      </div>

      <AllocationPlanStepper
        current={approved ? 3 : 2}
        className="mt-4"
      />

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide text-[var(--foreground)] sm:text-[2rem]">
              Review allocation plan
            </h1>
            <span className="rounded-md bg-[#e2e8f0] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--muted)]">
              {approved ? "APPROVED" : "DRAFT"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Review the proposed distribution, check delivery constraints, and
            take next actions before approval.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/admin/resources/compare/${encodeURIComponent(rsCode)}`,
            )
          }
          className="inline-flex rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)]/25"
        >
          Change option
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
          <p className="text-[12px] text-[var(--muted)]">Total needed</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-wide text-[#2f5f9e]">
            {fmtL(totalNeededL)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            From {plan?.communityCount ?? lines.length}{" "}
            {(plan?.communityCount ?? lines.length) === 1
              ? "community"
              : "communities"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
          <p className="text-[12px] text-[var(--muted)]">Available supply</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-wide text-[#16794c]">
            {fmtL(availableL)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            In LGU warehouse
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
          <p className="text-[12px] text-[var(--muted)]">Proposed allocation</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-wide text-[#2f5f9e]">
            {fmtL(proposedTotal)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {availableL > 0
              ? `${Math.round((proposedTotal / availableL) * 100)}% of available supply`
              : "Of available supply"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#fecaca] bg-[#fff7f7] px-4 py-4 shadow-sm">
          <p className="text-[12px] text-[var(--muted)]">Projected unmet need</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-wide text-[#c72929]">
            {fmtL(unmetL)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            Remaining after the proposed plan
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wide">
              Community allocation
            </h2>
            <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[11px] font-medium text-[#2f5f9e] ring-1 ring-[#bfdbfe]">
              {optionLabel(selectedOption, selectedIndex)} (Selected)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[#f8fafc] text-[12px] text-[var(--muted)]">
                  <th className="px-4 py-2.5 font-medium sm:px-5">
                    Community
                  </th>
                  <th className="px-3 py-2.5 font-medium">Need (L)</th>
                  <th className="px-3 py-2.5 font-medium">
                    Proposed allocation (L)
                  </th>
                  <th className="px-3 py-2.5 font-medium">% of supply</th>
                  <th className="px-3 py-2.5 font-medium">Delivery status</th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const pct =
                    availableL > 0
                      ? Math.round((line.allocateL / availableL) * 100)
                      : 0;
                  return (
                    <tr
                      key={`${line.reportId}-${line.community}`}
                      className="border-b border-[var(--border)]"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <p className="font-medium text-[var(--foreground)]">
                          {line.community}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {fmtL(line.needL)} needed
                        </p>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {line.needL.toLocaleString("en-PH")}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          disabled={approved}
                          value={line.allocateL}
                          onChange={(e) => {
                            const next = Number(e.target.value) || 0;
                            setLines((prev) =>
                              prev.map((row, idx) =>
                                idx === i
                                  ? { ...row, allocateL: next }
                                  : row,
                              ),
                            );
                          }}
                          className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-[13px] tabular-nums"
                        >
                          {Array.from(
                            new Set([
                              0,
                              line.allocateL,
                              ...[0, 100, 200, 240, 300, 400, 500, 600, 700, 800, 900, 1000, 1200].filter(
                                (n) => n <= Math.max(line.needL, line.allocateL),
                              ),
                            ]),
                          )
                            .sort((a, b) => a - b)
                            .map((n) => (
                              <option key={n} value={n}>
                                {n.toLocaleString("en-PH")}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-[5.5rem] flex-col gap-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                            <div
                              className="h-full rounded-full bg-[#2f5f9e]"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-[12px] text-[var(--muted)]">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                            constraintPill(line.constraint),
                          )}
                        >
                          {line.constraintLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--muted)] sm:px-5">
                        {noteFor(line)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#f8fafc] font-semibold">
                  <td className="px-4 py-3 sm:px-5">Total</td>
                  <td className="px-3 py-3 tabular-nums">
                    {totalNeededL.toLocaleString("en-PH")}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {proposedTotal.toLocaleString("en-PH")}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[5.5rem] flex-col gap-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                        <div
                          className="h-full rounded-full bg-[#2f5f9e]"
                          style={{
                            width: `${
                              availableL > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (proposedTotal / availableL) * 100,
                                    ),
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-[12px] text-[var(--muted)]">
                        {availableL > 0
                          ? `${Math.round((proposedTotal / availableL) * 100)}%`
                          : "-"}
                      </span>
                    </div>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--muted)] sm:px-5">
            Warehouse supply only. Community local stock is provisional and
            excluded until reconciled.
          </p>
        </section>

        <aside className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wide">
              Communities that require follow-up
            </h2>
            {followUps.length > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2f5f9e] text-[11px] font-semibold text-white">
                {followUps.length}
              </span>
            ) : null}
          </div>
          <div className="mt-3 space-y-3">
            {followUps.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No delivery blockers on the selected option.
              </p>
            ) : (
              followUps.map((line) => {
                const pct =
                  availableL > 0
                    ? Math.round((line.allocateL / availableL) * 100)
                    : 0;
                const result = verifyResults[line.reportId];
                return (
                  <div
                    key={`${line.reportId}-follow`}
                    className="rounded-xl border border-[var(--border)] bg-[#f8fafc] px-3.5 py-3"
                  >
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {line.community}{" "}
                      <span className={constraintTone(line.constraint)}>
                        - {line.constraintLabel}
                      </span>
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">
                      {fmtL(line.allocateL)} proposed ({pct}% of supply)
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-[var(--muted)]">
                      {followUpCopy(line)}
                    </p>
                    {line.constraint === "no_transport" ? (
                      <Link
                        href={`/admin/resources/track/${encodeURIComponent(rsCode)}/transport?report=${encodeURIComponent(line.reportId)}`}
                        className="mt-3 inline-flex rounded-lg border border-[#93c5fd] bg-white px-3 py-2 text-[12px] font-medium text-[#2f5f9e] transition hover:border-[#3b6fb6]"
                      >
                        Explore transport options
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={approved || verifyBusyId === line.reportId}
                        onClick={() => void onVerifyAccess(line)}
                        className="mt-3 inline-flex rounded-lg border border-[#93c5fd] bg-white px-3 py-2 text-[12px] font-medium text-[#2f5f9e] transition hover:border-[#3b6fb6] disabled:opacity-50"
                      >
                        {verifyBusyId === line.reportId
                          ? `Checking ${line.community}…`
                          : result
                            ? `Verify access to ${line.community} again`
                            : `Verify access to ${line.community}`}
                      </button>
                    )}
                    {result ? (
                      <div
                        className={cn(
                          "mt-2 rounded-lg px-2.5 py-2 text-[12px] leading-snug",
                          result.ok
                            ? "bg-[#ecfdf3] text-[#16794c]"
                            : "bg-[#fffbeb] text-[#92400e]",
                        )}
                        role="status"
                      >
                        <p>{result.message}</p>
                        <p className="mt-1 text-[11px] opacity-80">
                          Checked {verifyCheckedAtLabel(result.checkedAt)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <div className="mt-5 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[var(--foreground)]">
        <span className="font-semibold text-[#2f5f9e]">Important.</span>{" "}
        Proposed quantities are not yet reserved or approved. Deliveries require
        resolved access and transport constraints and final approval.
      </div>

      <div className="mt-4 mb-2 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={saving || approved}
          onClick={() => void onSaveDraft()}
          className="inline-flex rounded-lg border border-[#93c5fd] bg-white px-4 py-2.5 text-sm font-medium text-[#2f5f9e] transition hover:border-[#3b6fb6] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save as draft"}
        </button>
        {approved ? (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/admin/resources/track/${encodeURIComponent(rsCode)}`,
              )
            }
            className="inline-flex rounded-lg bg-[#2f5f9e] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#254d82]"
          >
            Continue to track assistance
          </button>
        ) : (
          <button
            type="button"
            disabled={approving || proposedTotal <= 0}
            onClick={() => void onApprove()}
            className="inline-flex rounded-lg bg-[#2f5f9e] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#254d82] disabled:opacity-50"
          >
            {approving ? "Approving…" : "Approve selected deliveries"}
          </button>
        )}
      </div>
    </div>
  );
}
