"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { DeveloperShell } from "@/components/DeveloperShell";
import { FadeIn } from "@/components/motion/primitives";
import {
  formatLatencyMs,
  reportsToBenchmarkRows,
  summarizeLiveRows,
  type LiveBenchmarkRow,
  type VerdictKey,
} from "@/lib/dev/aiBenchmark";
import { subscribeAllReports } from "@/lib/reports/api";
import type { HazardReport } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

type FilterId = "all" | "mismatch" | VerdictKey;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "validated", label: "Validated" },
  { id: "rejected", label: "Rejected" },
  { id: "needs_review", label: "Needs review" },
  { id: "mismatch", label: "Mismatch" },
];

export default function DeveloperBenchmarkPage() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAllReports((next) => {
      setReports(next);
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => reportsToBenchmarkRows(reports), [reports]);
  const summary = useMemo(() => summarizeLiveRows(rows), [rows]);
  const showGeminiLatency = summary.withLatency > 0;
  const showVertexLatency = summary.withVertex > 0;

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "all") return true;
      if (filter === "mismatch") return r.match === false;
      return r.ai === filter;
    });
  }, [rows, filter]);

  const mixTotal =
    summary.mix.validated + summary.mix.rejected + summary.mix.needs_review;

  return (
    <AuthGate mode="protected" role="developer">
      <DeveloperShell>
        <FadeIn delay={0.04} y={10}>
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--accent)] uppercase">
                  Prototype performance
                </p>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide">
                  Benchmark
                </h1>
                <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
                  Only incidents with stored AI latency and prompt/return.
                  Seeds and empty traces are excluded.
                </p>
              </div>
              {!loading ? (
                <p className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
                  {summary.scored} with traces · {reports.length} total
                </p>
              ) : null}
            </div>

            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading reports…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No reports with AI latency + response yet. Submit a new
                incident so Vertex/Gemini traces are saved.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatBlock
                    label="Agreement"
                    value={
                      summary.agreementPct == null
                        ? "—"
                        : `${summary.agreementPct}%`
                    }
                    detail={
                      summary.agreementPct == null
                        ? "Waiting on officer decisions"
                        : `${summary.matches} of ${summary.comparable} decided`
                    }
                    tone={
                      summary.agreementPct == null
                        ? undefined
                        : summary.agreementPct >= 80
                          ? "good"
                          : "warn"
                    }
                    bar={
                      summary.agreementPct == null
                        ? null
                        : summary.agreementPct
                    }
                  />
                  <StatBlock
                    label="Avg confidence"
                    value={
                      summary.avgConfidence == null
                        ? "—"
                        : summary.avgConfidence.toFixed(2)
                    }
                    detail="Mean AI confidence"
                    bar={
                      summary.avgConfidence == null
                        ? null
                        : Math.round(summary.avgConfidence * 100)
                    }
                  />
                  <StatBlock
                    label="Gemini median"
                    value={formatLatencyReadable(summary.p50)}
                    detail={
                      showGeminiLatency
                        ? `Typical response · ${summary.withLatency} timed`
                        : "Not recorded on these docs"
                    }
                  />
                  <StatBlock
                    label="Vertex AI median"
                    value={formatLatencyReadable(summary.vertexP50)}
                    detail={
                      showVertexLatency
                        ? `Typical response · ${summary.withVertex} timed`
                        : "Not recorded on these docs"
                    }
                  />
                </div>

                {mixTotal > 0 ? (
                  <div>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
                        AI verdict mix
                      </p>
                      <p className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
                        {mixTotal}
                      </p>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-[var(--border)]">
                      {(
                        [
                          ["validated", summary.mix.validated, "bg-[#16794c]"],
                          ["rejected", summary.mix.rejected, "bg-[#c72929]"],
                          [
                            "needs_review",
                            summary.mix.needs_review,
                            "bg-[#b7791f]",
                          ],
                        ] as const
                      ).map(([key, count, color]) =>
                        count > 0 ? (
                          <div
                            key={key}
                            className={cn("h-full", color)}
                            style={{
                              width: `${(count / mixTotal) * 100}%`,
                            }}
                            title={`${key}: ${count}`}
                          />
                        ) : null,
                      )}
                    </div>
                    <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                      <MixLegend
                        tone="validated"
                        count={summary.mix.validated}
                        total={mixTotal}
                      />
                      <MixLegend
                        tone="rejected"
                        count={summary.mix.rejected}
                        total={mixTotal}
                      />
                      <MixLegend
                        tone="needs_review"
                        count={summary.mix.needs_review}
                        total={mixTotal}
                      />
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((f) => {
                    const count =
                      f.id === "all"
                        ? rows.length
                        : f.id === "mismatch"
                          ? rows.filter((r) => r.match === false).length
                          : rows.filter((r) => r.ai === f.id).length;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={cn(
                          "rounded-xl border px-3 py-1.5 text-sm transition",
                          filter === f.id
                            ? "border-[#0f1b2d] bg-[#0f1b2d] text-white"
                            : "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--foreground)]/40",
                        )}
                      >
                        {f.label}
                        <span
                          className={cn(
                            "ml-1.5 font-mono text-[11px] tabular-nums",
                            filter === f.id
                              ? "text-white/70"
                              : "text-[var(--muted)]",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                  <ul className="divide-y divide-[var(--border)]">
                    {filtered.length === 0 ? (
                      <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        No rows in this filter.
                      </li>
                    ) : (
                      filtered.map((row) => (
                        <BenchmarkIncident
                          key={row.id}
                          row={row}
                          open={openId === row.id}
                          onToggle={() =>
                            setOpenId((cur) =>
                              cur === row.id ? null : row.id,
                            )
                          }
                        />
                      ))
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </FadeIn>
      </DeveloperShell>
    </AuthGate>
  );
}

function callHasTrace(
  latencyMs: number | null,
  prompt: string | null,
  rawReturn: string | null,
): boolean {
  return (
    latencyMs != null &&
    Number.isFinite(latencyMs) &&
    Boolean(prompt?.trim() || rawReturn?.trim())
  );
}

function BenchmarkIncident({
  row,
  open,
  onToggle,
}: {
  row: LiveBenchmarkRow;
  open: boolean;
  onToggle: () => void;
}) {
  const showVertex = callHasTrace(
    row.vertexLatencyMs,
    row.vertexPrompt,
    row.vertexRaw,
  );
  const showGemini = callHasTrace(row.latencyMs, row.aiPrompt, row.aiRaw);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition hover:bg-[#fafbfc]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-[var(--foreground)]">
            {row.id}
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {row.hazard} · {row.place}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictPill verdict={row.ai} />
          {showVertex ? (
            <LatencyChip
              name="Vertex AI"
              latencyMs={row.vertexLatencyMs}
            />
          ) : null}
          {showGemini ? (
            <LatencyChip name="Gemini" latencyMs={row.latencyMs} />
          ) : null}
          <MatchPill match={row.match} />
          <span className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
            {open ? "Hide" : "Open"}
          </span>
        </div>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[var(--border)] bg-[#f7f8fa] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
            <span>
              Officer{" "}
              <span className="text-[var(--foreground)]">
                {row.officer ?? "—"}
              </span>
              {" · "}
              Confidence{" "}
              <span className="font-mono tabular-nums text-[var(--foreground)]">
                {row.confidence == null ? "—" : row.confidence.toFixed(2)}
              </span>
            </span>
            <Link
              href={`/dev/incidents/${encodeURIComponent(row.id)}`}
              className="underline-offset-2 hover:underline"
            >
              Open incident
            </Link>
          </div>

          <div
            className={cn(
              "grid gap-3",
              showVertex && showGemini ? "lg:grid-cols-2" : "grid-cols-1",
            )}
          >
            {showVertex ? (
              <AiCallPanel
                title="Vertex AI"
                latencyMs={row.vertexLatencyMs!}
                prompt={row.vertexPrompt}
                rawReturn={row.vertexRaw}
                requestLabel="API request"
                returnLabel="API response"
              />
            ) : null}
            {showGemini ? (
              <AiCallPanel
                title="Gemini"
                latencyMs={row.latencyMs!}
                prompt={row.aiPrompt}
                rawReturn={row.aiRaw}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function formatLatencyReadable(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  const n = seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1);
  return `${n} seconds`;
}

function LatencyChip({
  name,
  latencyMs,
}: {
  name: string;
  latencyMs: number | null;
}) {
  return (
    <span
      className="inline-flex flex-col border border-[var(--border)] bg-white px-2 py-1 leading-tight"
      title={`${name} response time`}
    >
      <span className="text-[10px] font-medium text-[var(--foreground)]">
        {name}
      </span>
      <span className="font-mono text-[11px] tabular-nums text-[var(--foreground)]">
        {formatLatencyReadable(latencyMs)}
      </span>
    </span>
  );
}

function AiCallPanel({
  title,
  latencyMs,
  prompt,
  rawReturn,
  requestLabel = "Raw prompt",
  returnLabel = "Raw return",
}: {
  title: string;
  latencyMs: number;
  prompt: string | null;
  rawReturn: string | null;
  requestLabel?: string;
  returnLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
          {title}
        </p>
        <p className="font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">
          <span className="mr-1.5 text-[10px] font-normal tracking-wider text-[var(--muted)] uppercase">
            Latency
          </span>
          {formatLatencyMs(latencyMs)}
        </p>
      </div>
      {prompt?.trim() ? (
        <TraceBlock label={requestLabel} value={prompt} />
      ) : null}
      {rawReturn?.trim() ? (
        <TraceBlock label={returnLabel} value={rawReturn} />
      ) : null}
    </div>
  );
}

function TraceBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="mb-1 font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#0f1b2d] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-white/90">
        {value}
      </pre>
    </div>
  );
}

function StatBlock({
  label,
  value,
  detail,
  tone,
  bar,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "warn";
  bar?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3.5">
      <p className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums",
          tone === "good" && "text-[#16794c]",
          tone === "warn" && "text-[#c72929]",
          !tone && "text-[var(--foreground)]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
      {bar != null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className={cn(
              "h-full rounded-full",
              tone === "warn" ? "bg-[#c72929]" : "bg-[#0f1b2d]",
            )}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: VerdictKey | null }) {
  if (!verdict) {
    return <span className="text-xs text-[var(--muted)]">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase",
        verdict === "validated" &&
          "border-transparent bg-[#16794c] text-white",
        verdict === "rejected" &&
          "border-transparent bg-[#c72929] text-white",
        verdict === "needs_review" &&
          "border-transparent bg-[#b7791f] text-white",
      )}
    >
      {verdict === "needs_review" ? "review" : verdict}
    </span>
  );
}

function MatchPill({ match }: { match: boolean | null }) {
  if (match == null) {
    return <span className="text-xs text-[var(--muted)]">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase",
        match
          ? "border-[#16794c]/30 bg-[#16794c]/10 text-[#16794c]"
          : "border-[#c72929]/30 bg-[#c72929]/10 text-[#c72929]",
      )}
    >
      {match ? "yes" : "no"}
    </span>
  );
}

function MixLegend({
  tone,
  count,
  total,
}: {
  tone: VerdictKey;
  count: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <li className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "validated" && "bg-[#16794c]",
          tone === "rejected" && "bg-[#c72929]",
          tone === "needs_review" && "bg-[#b7791f]",
        )}
      />
      <span>
        {tone === "needs_review" ? "needs review" : tone}{" "}
        <span className="font-mono tabular-nums">
          {count} ({pct}%)
        </span>
      </span>
    </li>
  );
}
