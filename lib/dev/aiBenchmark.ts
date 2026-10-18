import {
  hazardHintLabel,
  type HazardReport,
  type ReportStatus,
} from "@/lib/reports/types";

export type VerdictKey = "validated" | "rejected" | "needs_review";

/** Display label for AI / ops verdict (never show raw "legit"). */
export function verdictLabel(
  v: "legit" | "rejected" | "needs_review" | null | undefined,
): VerdictKey | null {
  if (v === "legit") return "validated";
  if (v === "rejected") return "rejected";
  if (v === "needs_review") return "needs_review";
  return null;
}

/** Officer / ops outcome that can be compared to aiVerdict. */
export function officerOutcome(
  status: ReportStatus,
): "legit" | "rejected" | "needs_review" | null {
  switch (status) {
    case "legit":
    case "assigned":
    case "dispatched":
    case "done":
      return "legit";
    case "rejected":
      return "rejected";
    case "needs_review":
      return "needs_review";
    default:
      return null;
  }
}

export type LiveBenchmarkRow = {
  id: string;
  hazard: string;
  place: string;
  officer: VerdictKey | null;
  ai: VerdictKey | null;
  confidence: number | null;
  latencyMs: number | null;
  vertexLatencyMs: number | null;
  aiPrompt: string | null;
  aiRaw: string | null;
  vertexPrompt: string | null;
  vertexRaw: string | null;
  match: boolean | null;
  createdAt: string;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Gemini call has latency + stored response (prompt or raw return). */
export function hasGeminiTrace(r: HazardReport): boolean {
  return (
    typeof r.aiLatencyMs === "number" &&
    Number.isFinite(r.aiLatencyMs) &&
    (hasText(r.aiRaw) || hasText(r.aiPrompt))
  );
}

/** Vertex call has latency + stored response (prompt or raw return). */
export function hasVertexTrace(r: HazardReport): boolean {
  return (
    typeof r.vertexLatencyMs === "number" &&
    Number.isFinite(r.vertexLatencyMs) &&
    (hasText(r.vertexRaw) || hasText(r.vertexPrompt))
  );
}

/**
 * Only reports with real AI telemetry (latency + prompt/return).
 * Seeds / old docs without traces are excluded.
 */
export function reportsToBenchmarkRows(
  reports: HazardReport[],
): LiveBenchmarkRow[] {
  const scored = reports.filter(
    (r) => hasGeminiTrace(r) || hasVertexTrace(r),
  );

  return scored.map((r) => {
    const outcome = officerOutcome(r.status);
    const match =
      outcome != null && r.aiVerdict != null ? outcome === r.aiVerdict : null;
    return {
      id: r.id,
      hazard: hazardHintLabel(r.hazardHint),
      place: [r.barangay, r.lgu].filter(Boolean).join(", ") || "—",
      officer: outcome ? verdictLabel(outcome) : null,
      ai: verdictLabel(r.aiVerdict),
      confidence:
        typeof r.aiConfidence === "number" && Number.isFinite(r.aiConfidence)
          ? r.aiConfidence
          : null,
      latencyMs:
        typeof r.aiLatencyMs === "number" && Number.isFinite(r.aiLatencyMs)
          ? Math.max(0, Math.round(r.aiLatencyMs))
          : null,
      vertexLatencyMs:
        typeof r.vertexLatencyMs === "number" &&
        Number.isFinite(r.vertexLatencyMs)
          ? Math.max(0, Math.round(r.vertexLatencyMs))
          : null,
      aiPrompt: r.aiPrompt,
      aiRaw: r.aiRaw,
      vertexPrompt: r.vertexPrompt,
      vertexRaw: r.vertexRaw,
      match,
      createdAt: r.createdAt,
    };
  });
}

export function summarizeLiveRows(rows: LiveBenchmarkRow[]) {
  const withLatency = rows
    .map((r) => r.latencyMs)
    .filter((ms): ms is number => ms != null)
    .sort((a, b) => a - b);
  const withVertex = rows
    .map((r) => r.vertexLatencyMs)
    .filter((ms): ms is number => ms != null)
    .sort((a, b) => a - b);
  const comparable = rows.filter((r) => r.match != null);
  const matches = comparable.filter((r) => r.match === true).length;
  const n = comparable.length;
  const confidences = rows
    .map((r) => r.confidence)
    .filter((c): c is number => c != null);
  const avgConfidence =
    confidences.length === 0
      ? null
      : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const mix: Record<VerdictKey, number> = {
    validated: 0,
    rejected: 0,
    needs_review: 0,
  };
  for (const r of rows) {
    if (r.ai) mix[r.ai] += 1;
  }

  return {
    scored: rows.length,
    comparable: n,
    matches,
    agreementPct: n === 0 ? null : Math.round((matches / n) * 100),
    misses: Math.max(0, n - matches),
    p50: percentile(withLatency, 0.5),
    p95: percentile(withLatency, 0.95),
    maxLatency: withLatency[withLatency.length - 1] ?? 0,
    withLatency: withLatency.length,
    vertexP50: percentile(withVertex, 0.5),
    vertexP95: percentile(withVertex, 0.95),
    withVertex: withVertex.length,
    avgConfidence,
    mix,
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[idx] ?? null;
}

export function formatLatencyMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
