"use client";

import { useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { DeveloperShell } from "@/components/DeveloperShell";
import { FadeIn } from "@/components/motion/primitives";
import {
  BENCHMARK_SUITES,
  formatLatencyMs,
  summarizeSuite,
  type BenchmarkSurface,
} from "@/lib/dev/aiBenchmark";
import { cn } from "@/lib/utils";

export default function DeveloperBenchmarkPage() {
  const [surfaceId, setSurfaceId] = useState<BenchmarkSurface>("report");
  const suite =
    BENCHMARK_SUITES.find((s) => s.id === surfaceId) ?? BENCHMARK_SUITES[0];
  const summary = useMemo(() => summarizeSuite(suite), [suite]);

  return (
    <AuthGate mode="protected" role="developer">
      <DeveloperShell>
        <FadeIn delay={0.04} y={10}>
          <div className="space-y-5">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide">
                Benchmark
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Prototype performance · fixed 10-case eval sets for Google AI
                paths. For Cup deck and regression checks.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {BENCHMARK_SUITES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSurfaceId(s.id)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-sm transition",
                    surfaceId === s.id
                      ? "border-[#0f1b2d] bg-[#0f1b2d] text-white"
                      : "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--foreground)]/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-[var(--muted)]">
              {suite.model} · {suite.note}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                label="Accuracy"
                value={`${summary.matches}/${summary.n}`}
                sub={`${summary.accuracyPct}%`}
                tone={summary.accuracyPct >= 80 ? "good" : "warn"}
              />
              <Metric
                label="p50 latency"
                value={formatLatencyMs(summary.p50)}
              />
              <Metric
                label="p95 latency"
                value={formatLatencyMs(summary.p95)}
              />
              <Metric
                label="Misses"
                value={String(summary.n - summary.matches)}
                tone={summary.n - summary.matches === 0 ? "good" : "warn"}
              />
            </div>

            <div>
              <p className="mb-2 font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
                Latency by case
              </p>
              <ul className="space-y-2">
                {suite.cases.map((c) => {
                  const pct = Math.max(
                    4,
                    Math.round((c.latencyMs / summary.maxLatency) * 100),
                  );
                  return (
                    <li key={c.id} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-2 text-sm sm:grid-cols-[9rem_1fr_4.5rem]">
                      <span className="truncate text-[var(--muted)]">
                        {c.label}
                      </span>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            c.match ? "bg-[#0f1b2d]" : "bg-[#c72929]",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-right font-mono text-xs tabular-nums text-[var(--foreground)]">
                        {formatLatencyMs(c.latencyMs)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
                    <th className="py-2 pr-3 font-normal">Case</th>
                    <th className="py-2 pr-3 font-normal">Input</th>
                    <th className="py-2 pr-3 font-normal">Expected</th>
                    <th className="py-2 pr-3 font-normal">Actual</th>
                    <th className="py-2 pr-3 font-normal">Conf</th>
                    <th className="py-2 pr-3 font-normal">Latency</th>
                    <th className="py-2 font-normal">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {suite.cases.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--border)]/70"
                    >
                      <td className="py-2.5 pr-3 font-medium text-[var(--foreground)]">
                        {c.label}
                      </td>
                      <td className="max-w-[14rem] py-2.5 pr-3 text-[var(--muted)]">
                        {c.input}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {c.expected}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {c.actual}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs tabular-nums">
                        {c.confidence == null
                          ? "—"
                          : c.confidence.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs tabular-nums">
                        {formatLatencyMs(c.latencyMs)}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 font-mono text-xs",
                          c.match ? "text-[#16794c]" : "text-[#c72929]",
                        )}
                      >
                        {c.match ? "yes" : "no"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      </DeveloperShell>
    </AuthGate>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="border-t border-[var(--border)] pt-2">
      <p className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-xl font-semibold tabular-nums",
          tone === "good" && "text-[#16794c]",
          tone === "warn" && "text-[#c72929]",
          !tone && "text-[var(--foreground)]",
        )}
      >
        {value}
        {sub ? (
          <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">
            {sub}
          </span>
        ) : null}
      </p>
    </div>
  );
}
