"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AllocationPlanStepper } from "@/components/AllocationPlanStepper";
import { useCommandWorkspace } from "@/components/CommandWorkspaceProvider";
import {
  getShortageById,
  patchShortageAllocationLines,
  saveShortageWorkflowStep,
} from "@/lib/resourcesShortages/api";
import type { ResourceShortage } from "@/lib/resourcesShortages/types";
import type { AllocationLine } from "@/lib/workspace/allocationOptions";
import {
  resourceEpicStorageId,
} from "@/lib/workspace/resourceEpicScope";
import {
  apasSitioWaterReports,
  buildSupplyShortagePlan,
  reportsForEpicCode,
} from "@/lib/workspace/supplyShortagePlan";
import { verifyDeliveryAccess } from "@/lib/workspace/verifyDeliveryAccess";
import { cn } from "@/lib/utils";

type TabId = "deliveries" | "pending" | "all";

type DemoDelivery = {
  community: string;
  reportId: string;
  needL: number;
  quantityL: number;
  vehicle: string;
  vehicleCapL: number;
  status: "dispatched" | "en_route" | "delivered";
  etaDate: string;
  etaTime: string;
};

function fmtL(n: number): string {
  return `${n.toLocaleString("en-PH")} L`;
}

function etaTomorrowParts(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return {
    date: new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    }).format(d),
    time: new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    }).format(d),
  };
}

function activityTimeLabel(offsetMin: number): string {
  const d = new Date(Date.now() - offsetMin * 60 * 1000);
  const clock = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(d);
  return `Today, ${clock}`;
}

export function TrackAssistance() {
  const params = useParams();
  const { reports, scopedReports, reportScope } = useCommandWorkspace();
  const rsCode =
    String(params.id ?? "RS-001").trim().toUpperCase() || "RS-001";
  const storageId = useMemo(
    () => resourceEpicStorageId(rsCode, reportScope),
    [rsCode, reportScope],
  );

  const [shortage, setShortage] = useState<ResourceShortage | null>(null);
  const [tab, setTab] = useState<TabId>("deliveries");
  const [linesOverride, setLinesOverride] = useState<AllocationLine[] | null>(
    null,
  );
  const [verifyBusyId, setVerifyBusyId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<
    Record<string, { ok: boolean; message: string; checkedAt: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const doc = await getShortageById(storageId);
      if (cancelled) return;
      setShortage(doc);
      setLinesOverride(null);
      try {
        await saveShortageWorkflowStep(storageId, 3);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageId]);

  const selectedOptionId = useMemo(() => {
    const options = shortage?.allocation?.options ?? [];
    return shortage?.selectedOptionId || options[0]?.id || "";
  }, [shortage]);

  const lines = useMemo((): AllocationLine[] => {
    if (linesOverride) return linesOverride;
    const options = shortage?.allocation?.options ?? [];
    const opt =
      options.find((o) => o.id === selectedOptionId) ?? options[0];
    return opt?.lines ?? [];
  }, [shortage, selectedOptionId, linesOverride]);

  const planMeta = useMemo(() => {
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

  async function onVerifyAccess(line: AllocationLine) {
    if (line.constraint !== "access_unverified") return;
    setVerifyBusyId(line.reportId);
    try {
      const row = planMeta?.rows.find(
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
      setLinesOverride(nextLines);
      setVerifyResults((prev) => ({
        ...prev,
        [line.reportId]: { ok: result.ok, message, checkedAt },
      }));
      if (!selectedOptionId) {
        throw new Error("No allocation option selected to save.");
      }
      await patchShortageAllocationLines(
        storageId,
        selectedOptionId,
        nextLines,
      );
      setShortage((prev) => {
        if (!prev?.allocation) return prev;
        return {
          ...prev,
          allocation: {
            ...prev.allocation,
            options: prev.allocation.options.map((o) =>
              o.id === selectedOptionId ? { ...o, lines: nextLines } : o,
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

  const readyLines = useMemo(
    () => lines.filter((l) => l.constraint === "no_blockers" && l.allocateL > 0),
    [lines],
  );
  const pendingLines = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.constraint === "access_unverified" ||
          l.constraint === "no_transport",
      ),
    [lines],
  );

  const deliveries: DemoDelivery[] = useMemo(() => {
    const first = readyLines[0];
    if (!first) return [];
    const eta = etaTomorrowParts();
    return [
      {
        community: first.community,
        reportId: first.reportId,
        needL: first.needL,
        quantityL: first.allocateL,
        vehicle: "LGU Water Truck 01",
        vehicleCapL: 2000,
        status: "dispatched",
        etaDate: eta.date,
        etaTime: eta.time,
      },
    ];
  }, [readyLines]);

  const totalNeededL =
    shortage?.totalNeededL ??
    planMeta?.totalNeededL ??
    lines.reduce((s, l) => s + l.needL, 0);
  const committedL = deliveries.reduce((s, d) => s + d.quantityL, 0);
  const pendingL = pendingLines.reduce(
    (s, l) => s + Math.max(l.allocateL, l.needL),
    0,
  );
  const unmetL = Math.max(0, totalNeededL - committedL - pendingL);
  const pendingCommunityCount = pendingLines.length;
  const communityCount =
    shortage?.communityCount ?? planMeta?.communityCount ?? lines.length;

  const pct = (n: number) =>
    totalNeededL > 0 ? Math.round((n / totalNeededL) * 100) : 0;

  const transportHref = (reportId: string) =>
    `/admin/resources/track/${encodeURIComponent(rsCode)}/transport?report=${encodeURIComponent(reportId)}`;

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "deliveries", label: "Deliveries", count: deliveries.length },
    { id: "pending", label: "Pending needs", count: pendingLines.length },
    { id: "all", label: "All communities", count: lines.length || communityCount },
  ];

  const activity = [
    {
      time: activityTimeLabel(0),
      title: "Delivery dispatched",
      detail: deliveries[0]
        ? `${deliveries[0].community} · ${fmtL(deliveries[0].quantityL)} · ${deliveries[0].vehicle}`
        : "Plan approved",
    },
    {
      time: activityTimeLabel(75),
      title: "Access verification requested",
      detail: pendingLines.find((l) => l.constraint === "access_unverified")
        ? `${pendingLines.find((l) => l.constraint === "access_unverified")!.community} · ground check`
        : "Pending communities flagged",
    },
    {
      time: activityTimeLabel(120),
      title: "Transport needed",
      detail: pendingLines.find((l) => l.constraint === "no_transport")
        ? `${pendingLines.find((l) => l.constraint === "no_transport")!.community} · no vehicle confirmed`
        : "No transport blockers",
    },
  ];

  const lastUpdated = shortage?.updatedAt
    ? new Date(shortage.updatedAt).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      })
    : "—";
  const placeLabel =
    reportScope.mode === "barangay"
      ? `${reportScope.barangay}, ${reportScope.lgu}`
      : reportScope.lgu;
  const targetDateLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    }).format(d);
  })();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#f5f7fb] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href="/admin/resources"
          className="text-sm font-medium text-[#2f5f9e] hover:underline"
        >
          ← Back to resources
        </Link>
        <div className="text-right text-[12px] text-[var(--muted)]">
          <p className="font-medium text-[var(--foreground)]">{placeLabel}</p>
          <p className="mt-0.5">Last updated {lastUpdated}</p>
        </div>
      </div>

      <AllocationPlanStepper current={3} className="mt-4" />

      <div className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
          Track assistance
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Monitor the status of approved deliveries, pending requests, and
          remaining needs.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total needed"
          value={fmtL(totalNeededL)}
          hint={`From ${communityCount} ${communityCount === 1 ? "community" : "communities"}`}
          tone="blue"
          icon="box"
        />
        <KpiCard
          label="Committed for delivery"
          value={fmtL(committedL)}
          hint={`${deliveries.length} ${deliveries.length === 1 ? "delivery" : "deliveries"}`}
          tone="green"
          icon="truck"
        />
        <KpiCard
          label="Pending"
          value={fmtL(pendingL)}
          hint={`${pendingCommunityCount} ${
            pendingCommunityCount === 1 ? "community" : "communities"
          }`}
          tone="amber"
          icon="clock"
        />
        <KpiCard
          label="Unmet need"
          value={fmtL(unmetL)}
          hint="After this plan"
          tone="red"
          icon="warn"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.72fr)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3 py-2.5 text-sm font-medium transition",
                  tab === t.id
                    ? "text-[#2f5f9e]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {t.label} ({t.count})
                {tab === t.id ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#2f5f9e]" />
                ) : null}
              </button>
            ))}
          </div>

          {(tab === "deliveries" || tab === "all") && (
            <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[#eef2f7] px-4 py-3 sm:px-5">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  Approved deliveries
                </h2>
              </div>
              {deliveries.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted)] sm:px-5">
                  No deliveries dispatched yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
                        <th className="px-4 py-2.5 sm:px-5">Community</th>
                        <th className="px-3 py-2.5">Quantity</th>
                        <th className="px-3 py-2.5">Vehicle</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">ETA / delivery date</th>
                        <th className="px-4 py-2.5 sm:px-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map((d) => (
                        <tr
                          key={d.reportId}
                          className="border-b border-[#eef2f7] last:border-b-0"
                        >
                          <td className="px-4 py-3.5 sm:px-5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8eef8] text-[11px] font-semibold text-[#2f5f9e]">
                                {d.community.replace(/^Sitio\s+/i, "").slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <p className="font-semibold text-[var(--foreground)]">
                                  {d.community}
                                </p>
                                <p className="text-[11px] text-[var(--muted)]">
                                  {fmtL(d.needL)} needed
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 tabular-nums font-semibold">
                            {fmtL(d.quantityL)}
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2f5f9e]"
                                aria-hidden
                              >
                                <KpiGlyph kind="truck" />
                              </span>
                              <div>
                                <p className="font-semibold">{d.vehicle}</p>
                                <p className="text-[11px] text-[var(--muted)]">
                                  {fmtL(d.vehicleCapL)} capacity
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <DeliveryStatus status={d.status} />
                          </td>
                          <td className="px-3 py-3.5 text-[12px] leading-snug text-[var(--muted)]">
                            <span className="block font-medium text-[var(--foreground)]">
                              {d.etaDate}
                            </span>
                            <span className="block">{d.etaTime}</span>
                          </td>
                          <td className="px-4 py-3.5 sm:px-5">
                            <Link
                              href={`/admin/incidents/${encodeURIComponent(d.reportId)}`}
                              className="inline-flex rounded-lg border border-[#93c5fd] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2f5f9e] transition hover:bg-[#eff6ff]"
                            >
                              View details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {(tab === "pending" || tab === "all" || tab === "deliveries") && (
            <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[#eef2f7] px-4 py-3 sm:px-5">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  {tab === "deliveries" ? "Operational issues" : "Pending needs"}
                </h2>
              </div>
              {Object.values(verifyResults).length > 0 ? (
                <div
                  className="space-y-2 border-b border-[#eef2f7] px-4 py-3 sm:px-5"
                  role="status"
                  aria-live="polite"
                >
                  {Object.entries(verifyResults).map(([id, r]) => (
                    <p
                      key={id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-[12px] leading-snug",
                        r.ok
                          ? "bg-[#ecfdf3] text-[#16794c]"
                          : "bg-[#fffbeb] text-[#92400e]",
                      )}
                    >
                      {r.message}
                    </p>
                  ))}
                </div>
              ) : null}
              {pendingLines.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted)] sm:px-5">
                  No pending blockers on this plan.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    className={cn(
                      "w-full text-left text-[13px]",
                      tab === "deliveries" ? "min-w-[640px]" : "min-w-[760px]",
                    )}
                  >
                    <thead>
                      <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
                        {tab !== "deliveries" ? (
                          <>
                            <th className="px-4 py-2.5 sm:px-5">Community</th>
                            <th className="px-3 py-2.5">Quantity</th>
                          </>
                        ) : null}
                        <th className="px-4 py-2.5 sm:px-5">Issue</th>
                        <th className="px-3 py-2.5">Next step</th>
                        <th className="px-3 py-2.5">Target date</th>
                        <th className="px-4 py-2.5 sm:px-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLines.map((l) => {
                        const qty = Math.max(l.allocateL, l.needL);
                        const isTransport = l.constraint === "no_transport";
                        const result = verifyResults[l.reportId];
                        return (
                          <tr
                            key={l.reportId}
                            className="border-b border-[#eef2f7] last:border-b-0"
                          >
                            {tab !== "deliveries" ? (
                              <>
                                <td className="px-4 py-3.5 font-semibold sm:px-5">
                                  {l.community}
                                </td>
                                <td className="px-3 py-3.5 tabular-nums font-semibold">
                                  {fmtL(qty)}
                                </td>
                              </>
                            ) : null}
                            <td className="px-4 py-3.5 sm:px-5">
                              <div className="flex items-start gap-2">
                                <IssueGlyph
                                  kind={isTransport ? "block" : "warn"}
                                />
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "text-[13px] font-semibold",
                                      isTransport
                                        ? "text-[#b91c1c]"
                                        : "text-[#b45309]",
                                    )}
                                  >
                                    {l.constraintLabel}
                                  </p>
                                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                                    {isTransport
                                      ? "No vehicle available for delivery."
                                      : l.constraintLabel ===
                                            "Verified road block" ||
                                          l.constraintLabel ===
                                            "Road block nearby"
                                        ? "A verified road block is on the route."
                                        : "Road conditions and security status unknown."}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[14rem] px-3 py-3.5 text-[12px] leading-snug text-[var(--muted)]">
                              {result ? (
                                <>
                                  <span className="block">{result.message}</span>
                                  <span className="mt-0.5 block text-[11px]">
                                    Checked{" "}
                                    {new Intl.DateTimeFormat("en-PH", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      timeZone: "Asia/Manila",
                                    }).format(new Date(result.checkedAt))}
                                  </span>
                                </>
                              ) : isTransport ? (
                                "Find a vehicle, schedule a later delivery, or request partner transport."
                              ) : (
                                `Verify access to ${l.community}.`
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-[12px] text-[var(--muted)]">
                              {targetDateLabel}
                            </td>
                            <td className="px-4 py-3.5 sm:px-5">
                              {isTransport ? (
                                <Link
                                  href={transportHref(l.reportId)}
                                  className="inline-flex rounded-lg border border-[#93c5fd] px-3 py-1.5 text-[12px] font-semibold text-[#2f5f9e] hover:bg-[#eff6ff]"
                                >
                                  Resolve transport
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  disabled={verifyBusyId === l.reportId}
                                  onClick={() => void onVerifyAccess(l)}
                                  className="inline-flex rounded-lg border border-[#93c5fd] px-3 py-1.5 text-[12px] font-semibold text-[#2f5f9e] hover:bg-[#eff6ff] disabled:opacity-50"
                                >
                                  {verifyBusyId === l.reportId
                                    ? `Checking ${l.community}…`
                                    : result
                                      ? `Verify access to ${l.community} again`
                                      : `Verify access to ${l.community}`}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Total progress
              </h2>
              <p className="text-[12px] text-[var(--muted)]">
                Total needed {fmtL(totalNeededL)}
              </p>
            </div>
            <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-[#e8edf5]">
              <span
                className="bg-[#2f5f9e]"
                style={{ width: `${pct(committedL)}%` }}
                title="Committed"
              />
              <span
                className="bg-[#eab308]"
                style={{ width: `${pct(pendingL)}%` }}
                title="Pending"
              />
              <span
                className="bg-[#cbd5e1]"
                style={{ width: `${pct(unmetL)}%` }}
                title="Unmet"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#2f5f9e]" />
                <span className="font-semibold text-[#2f5f9e]">
                  {pct(committedL)}%
                </span>{" "}
                Committed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#eab308]" />
                <span className="font-semibold text-[#b45309]">
                  {pct(pendingL)}%
                </span>{" "}
                Pending
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#cbd5e1]" />
                <span className="font-semibold text-[var(--foreground)]">
                  {pct(unmetL)}%
                </span>{" "}
                Unmet
              </span>
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4">
          <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
              <h2 className="text-[15px] font-semibold">Map view</h2>
              <Link
                href={`/admin/resources/${encodeURIComponent(rsCode)}`}
                className="text-[12px] font-medium text-[#2f5f9e] hover:underline"
              >
                View full map
              </Link>
            </div>
            <TrackMapPanel lines={lines} deliveries={deliveries} />
          </section>

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="text-[15px] font-semibold">Community progress</h2>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#2f5f9e]" /> Committed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#eab308]" /> Pending
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#cbd5e1]" /> Unmet
              </span>
            </div>
            <ul className="mt-3 space-y-3.5">
              {(lines.length > 0 ? lines : []).slice(0, 5).map((l) => {
                const need = Math.max(l.needL, 1);
                const delivered =
                  l.constraint === "no_blockers" ? l.allocateL : 0;
                const pending =
                  l.constraint === "access_unverified" ||
                  l.constraint === "no_transport"
                    ? Math.max(l.allocateL, 0)
                    : 0;
                const deliveredPct = Math.min(100, (delivered / need) * 100);
                const pendingPct = Math.min(
                  100 - deliveredPct,
                  (pending / need) * 100,
                );
                const shownL =
                  delivered > 0 ? delivered : pending > 0 ? pending : 0;
                return (
                  <li key={l.reportId}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-semibold">
                        {l.community}
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">
                        {fmtL(l.needL)} needed
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[#e8edf5]">
                      <span
                        className="bg-[#2f5f9e]"
                        style={{ width: `${deliveredPct}%` }}
                      />
                      <span
                        className="bg-[#eab308]"
                        style={{ width: `${pendingPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] font-medium tabular-nums text-[var(--muted)]">
                      {fmtL(shownL)}
                    </p>
                  </li>
                );
              })}
              {lines.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">
                  No community rows yet.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold">Recent activity</h2>
              <span className="text-[11px] font-medium text-[#2f5f9e]">
                View all
              </span>
            </div>
            <ul className="mt-3 space-y-3.5">
              {activity.map((a, i) => (
                <li key={a.title} className="flex gap-3">
                  <ActivityGlyph index={i} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-[11px] text-[var(--muted)]">{a.time}</p>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
                      {a.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "blue" | "green" | "amber" | "red";
  icon: "box" | "truck" | "clock" | "warn";
}) {
  const shell =
    tone === "blue"
      ? "border-[#bfdbfe] bg-[#eff6ff]"
      : tone === "green"
        ? "border-[#bbf7d0] bg-[#f0fdf4]"
        : tone === "amber"
          ? "border-[#fde68a] bg-[#fffbeb]"
          : "border-[#fecaca] bg-[#fef2f2]";
  const valueColor =
    tone === "blue"
      ? "text-[#1d4ed8]"
      : tone === "green"
        ? "text-[#15803d]"
        : tone === "amber"
          ? "text-[#b45309]"
          : "text-[#b91c1c]";
  const iconShell =
    tone === "blue"
      ? "bg-[#dbeafe] text-[#1d4ed8]"
      : tone === "green"
        ? "bg-[#dcfce7] text-[#15803d]"
        : tone === "amber"
          ? "bg-[#fef3c7] text-[#b45309]"
          : "bg-[#fee2e2] text-[#b91c1c]";
  return (
    <div className={cn("rounded-xl border px-4 py-3.5", shell)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            iconShell,
          )}
          aria-hidden
        >
          <KpiGlyph kind={icon} />
        </span>
      </div>
      <p className={cn("mt-1 text-[1.75rem] font-semibold tabular-nums leading-none", valueColor)}>
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function KpiGlyph({ kind }: { kind: "box" | "truck" | "clock" | "warn" }) {
  if (kind === "box") {
    return (
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
        <path d="M2.5 5.5 8 2.5l5.5 3v6L8 14.5 2.5 11.5v-6Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 8v6.5M2.5 5.5 8 8.5l5.5-3" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (kind === "truck") {
    return (
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
        <path d="M1.5 10.5V4.5h8v6h-8Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9.5 6.5h2.5l2 2.5v1.5H9.5V6.5Z" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="4.5" cy="11.5" r="1.2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12" cy="11.5" r="1.2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "clock") {
    return (
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v3.2L10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <path d="M8 2.5 14 13.5H2L8 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.5v3.2M8 11.2h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IssueGlyph({ kind }: { kind: "warn" | "block" }) {
  if (kind === "block") {
    return (
      <span
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-[11px] font-bold text-[#b91c1c]"
        aria-hidden
      >
        ×
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[#b45309]"
      aria-hidden
    >
      <KpiGlyph kind="warn" />
    </span>
  );
}

function ActivityGlyph({ index }: { index: number }) {
  const tone =
    index === 0
      ? "bg-[#dbeafe] text-[#1d4ed8]"
      : index === 1
        ? "bg-[#fef3c7] text-[#b45309]"
        : "bg-[#fee2e2] text-[#b91c1c]";
  return (
    <span
      className={cn(
        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
        tone,
      )}
      aria-hidden
    >
      {index === 0 ? (
        <KpiGlyph kind="truck" />
      ) : index === 1 ? (
        <KpiGlyph kind="warn" />
      ) : (
        <span className="text-[12px] font-bold">×</span>
      )}
    </span>
  );
}

function TrackMapPanel({
  lines,
  deliveries,
}: {
  lines: AllocationLine[];
  deliveries: DemoDelivery[];
}) {
  const deliveredIds = new Set(deliveries.map((d) => d.reportId));
  const ranked = [...lines].sort((a, b) => {
    const rank = (l: AllocationLine) =>
      deliveredIds.has(l.reportId)
        ? 0
        : l.constraint === "access_unverified"
          ? 1
          : l.constraint === "no_transport"
            ? 2
            : 3;
    return rank(a) - rank(b);
  });
  const slots = [
    { x: 22, y: 58 },
    { x: 52, y: 34 },
    { x: 78, y: 62 },
  ];
  const pins = ranked.slice(0, 3).map((l, i) => {
    const delivered = deliveredIds.has(l.reportId);
    const color = delivered
      ? "#2f5f9e"
      : l.constraint === "access_unverified"
        ? "#eab308"
        : l.constraint === "no_transport"
          ? "#b91c1c"
          : "#64748b";
    const status = delivered
      ? "Dispatched"
      : l.constraint === "access_unverified"
        ? "Pending"
        : l.constraint === "no_transport"
          ? "Not scheduled"
          : "Queued";
    return {
      letter: String.fromCharCode(65 + i),
      label: l.community,
      status,
      color,
      ...slots[i]!,
    };
  });

  return (
    <div className="relative h-52 overflow-hidden bg-[linear-gradient(165deg,#c5d8ee_0%,#e8eef6_42%,#d5dee9_100%)]">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M5 72 C 18 40, 35 80, 48 36 S 72 28, 95 60"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.4"
          opacity="0.45"
        />
        {pins.length >= 2 ? (
          <path
            d={pins
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ")}
            fill="none"
            stroke="#2f5f9e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
      {pins.map((p) => (
        <div
          key={p.letter}
          className="absolute flex -translate-x-1/2 -translate-y-[85%] flex-col items-center"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <span className="relative">
            <span
              className="flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-md ring-2 ring-white"
              style={{ background: p.color }}
            >
              {p.letter}
            </span>
            <span
              className="absolute left-1/2 top-[85%] h-2 w-2 -translate-x-1/2 rotate-45"
              style={{ background: p.color }}
              aria-hidden
            />
          </span>
          <p className="mt-2 max-w-[5rem] truncate text-center text-[10px] font-semibold text-[var(--foreground)]">
            {p.label}
          </p>
          <p className="text-[9px] text-[var(--muted)]">{p.status}</p>
        </div>
      ))}
      {pins.length === 0 ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">
          No communities on this plan yet.
        </p>
      ) : null}
    </div>
  );
}

function DeliveryStatus({
  status,
}: {
  status: DemoDelivery["status"];
}) {
  const steps = [
    { id: "dispatched", label: "Dispatched" },
    { id: "en_route", label: "En route" },
    { id: "delivered", label: "Delivered" },
  ] as const;
  const idx = steps.findIndex((s) => s.id === status);
  return (
    <div className="min-w-[12rem]">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-[11px] font-semibold text-[#1d4ed8]">
        <span
          className="flex size-3.5 items-center justify-center rounded-full bg-[#2563eb] text-[8px] font-bold text-white"
          aria-hidden
        >
          ✓
        </span>
        {steps[idx]?.label ?? status}
      </span>
      <div className="mt-2 flex items-start gap-0">
        {steps.map((s, i) => (
          <span key={s.id} className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  i <= idx ? "bg-[#2f5f9e]" : "bg-[#cbd5e1]",
                )}
              />
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "mx-0.5 h-0.5 flex-1",
                    i < idx ? "bg-[#2f5f9e]" : "bg-[#e2e8f0]",
                  )}
                />
              ) : null}
            </span>
            <span
              className={cn(
                "mt-1 pr-1 text-[9px] leading-tight",
                i === idx
                  ? "font-semibold text-[#2f5f9e]"
                  : "text-[var(--muted)]",
              )}
            >
              {s.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
