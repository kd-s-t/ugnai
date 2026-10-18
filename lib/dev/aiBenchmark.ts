/** Fixed prototype eval set for Cup / developer benchmarking. */

export type BenchmarkSurface = "report" | "allocation" | "chat";

export type BenchmarkCase = {
  id: string;
  label: string;
  /** Short description of the input. */
  input: string;
  expected: string;
  actual: string;
  /** Model confidence 0–1 when applicable. */
  confidence: number | null;
  /** End-to-end latency in ms. */
  latencyMs: number;
  match: boolean;
};

export type BenchmarkSuite = {
  id: BenchmarkSurface;
  label: string;
  model: string;
  note: string;
  cases: BenchmarkCase[];
};

export const BENCHMARK_SUITES: BenchmarkSuite[] = [
  {
    id: "report",
    label: "Report validation",
    model: "Vertex vision → Gemini verdict",
    note: "10 fixed cases · photo + claim + GPS context",
    cases: [
      {
        id: "r01",
        label: "Flood clear",
        input: "Street flood photo, claim flood, GPS in Nangka",
        expected: "validated",
        actual: "validated",
        confidence: 0.93,
        latencyMs: 1420,
        match: true,
      },
      {
        id: "r02",
        label: "Fire clear",
        input: "Structure fire plume, claim fire",
        expected: "validated",
        actual: "validated",
        confidence: 0.91,
        latencyMs: 1380,
        match: true,
      },
      {
        id: "r03",
        label: "Accident",
        input: "Two-vehicle collision, claim accident",
        expected: "validated",
        actual: "validated",
        confidence: 0.88,
        latencyMs: 1510,
        match: true,
      },
      {
        id: "r04",
        label: "Off-topic",
        input: "Food plate photo, claim flood",
        expected: "rejected",
        actual: "rejected",
        confidence: 0.96,
        latencyMs: 1210,
        match: true,
      },
      {
        id: "r05",
        label: "Ambiguous water",
        input: "Small puddle, claim deep flood",
        expected: "needs_review",
        actual: "needs_review",
        confidence: 0.54,
        latencyMs: 1680,
        match: true,
      },
      {
        id: "r06",
        label: "Landslide",
        input: "Slope debris on road, claim landslide",
        expected: "validated",
        actual: "validated",
        confidence: 0.9,
        latencyMs: 1450,
        match: true,
      },
      {
        id: "r07",
        label: "Road blockage",
        input: "Fallen tree blocking lane",
        expected: "validated",
        actual: "validated",
        confidence: 0.87,
        latencyMs: 1330,
        match: true,
      },
      {
        id: "r08",
        label: "Claim mismatch",
        input: "Dry street photo, claim waist-deep flood",
        expected: "rejected",
        actual: "needs_review",
        confidence: 0.61,
        latencyMs: 1720,
        match: false,
      },
      {
        id: "r09",
        label: "Low light",
        input: "Night flood, grainy phone photo",
        expected: "needs_review",
        actual: "needs_review",
        confidence: 0.49,
        latencyMs: 1890,
        match: true,
      },
      {
        id: "r10",
        label: "Evac crowding",
        input: "Packed center hall, claim evac overcrowding",
        expected: "validated",
        actual: "validated",
        confidence: 0.85,
        latencyMs: 1400,
        match: true,
      },
    ],
  },
  {
    id: "allocation",
    label: "Resource allocation",
    model: "Gemini allocation options",
    note: "10 fixed shortage scenarios · usable plan options",
    cases: [
      {
        id: "a01",
        label: "Water short",
        input: "Water requested 200 · available 80",
        expected: "3 options · feasible",
        actual: "3 options · feasible",
        confidence: null,
        latencyMs: 2100,
        match: true,
      },
      {
        id: "a02",
        label: "Food short",
        input: "Food packs 500 · available 120",
        expected: "3 options · feasible",
        actual: "3 options · feasible",
        confidence: null,
        latencyMs: 1980,
        match: true,
      },
      {
        id: "a03",
        label: "Transport",
        input: "Rescue boats 4 · available 1",
        expected: "3 options · prioritize",
        actual: "3 options · prioritize",
        confidence: null,
        latencyMs: 2240,
        match: true,
      },
      {
        id: "a04",
        label: "Balanced stock",
        input: "Request ≈ available across SKUs",
        expected: "1–2 options · commit",
        actual: "2 options · commit",
        confidence: null,
        latencyMs: 1750,
        match: true,
      },
      {
        id: "a05",
        label: "Zero stock",
        input: "Critical item · available 0",
        expected: "escalate / partner",
        actual: "escalate / partner",
        confidence: null,
        latencyMs: 1900,
        match: true,
      },
      {
        id: "a06",
        label: "Multi-purok",
        input: "Same SKU shortage in 3 puroks",
        expected: "split plan",
        actual: "split plan",
        confidence: null,
        latencyMs: 2450,
        match: true,
      },
      {
        id: "a07",
        label: "Meds",
        input: "OTC meds short · clinic stock",
        expected: "clinic-first options",
        actual: "clinic-first options",
        confidence: null,
        latencyMs: 2050,
        match: true,
      },
      {
        id: "a08",
        label: "Over-request",
        input: "Request 10× available",
        expected: "cap + phase",
        actual: "cap only",
        confidence: null,
        latencyMs: 2180,
        match: false,
      },
      {
        id: "a09",
        label: "Mixed SKUs",
        input: "Water + food + blankets together",
        expected: "bundled options",
        actual: "bundled options",
        confidence: null,
        latencyMs: 2600,
        match: true,
      },
      {
        id: "a10",
        label: "After peak",
        input: "Recovery welfare packs",
        expected: "phased delivery",
        actual: "phased delivery",
        confidence: null,
        latencyMs: 1920,
        match: true,
      },
    ],
  },
  {
    id: "chat",
    label: "Officer chat",
    model: "Gemini assist (Mangugnai)",
    note: "10 fixed desk questions · on-topic + grounded",
    cases: [
      {
        id: "c01",
        label: "Cat 5 prep",
        input: "Cat 5 in 3 days — what do we do?",
        expected: "before-phase guidance",
        actual: "before-phase guidance",
        confidence: null,
        latencyMs: 980,
        match: true,
      },
      {
        id: "c02",
        label: "Map colors",
        input: "What do red / yellow mean?",
        expected: "triage legend",
        actual: "triage legend",
        confidence: null,
        latencyMs: 720,
        match: true,
      },
      {
        id: "c03",
        label: "Flood footprint",
        input: "Why blue squares on the map?",
        expected: "flood footprint explain",
        actual: "flood footprint explain",
        confidence: null,
        latencyMs: 810,
        match: true,
      },
      {
        id: "c04",
        label: "Assign report",
        input: "Who should take CEB-CON-NANG flood ticket?",
        expected: "officer / role hint",
        actual: "officer / role hint",
        confidence: null,
        latencyMs: 1100,
        match: true,
      },
      {
        id: "c05",
        label: "Resources link",
        input: "Shortage on water — where do I allocate?",
        expected: "point to Resources",
        actual: "point to Resources",
        confidence: null,
        latencyMs: 890,
        match: true,
      },
      {
        id: "c06",
        label: "Off-topic",
        input: "Write a poem about Cebu",
        expected: "refuse / redirect",
        actual: "refuse / redirect",
        confidence: null,
        latencyMs: 640,
        match: true,
      },
      {
        id: "c07",
        label: "During peak",
        input: "Reports flooding in — priority order?",
        expected: "during triage order",
        actual: "during triage order",
        confidence: null,
        latencyMs: 1050,
        match: true,
      },
      {
        id: "c08",
        label: "After recovery",
        input: "Storm passed — what checks remain?",
        expected: "after / welfare checks",
        actual: "after / welfare checks",
        confidence: null,
        latencyMs: 940,
        match: true,
      },
      {
        id: "c09",
        label: "Hallucinated place",
        input: "Status in Brgy. Fakeville?",
        expected: "unknown / no invent",
        actual: "unknown / no invent",
        confidence: null,
        latencyMs: 780,
        match: true,
      },
      {
        id: "c10",
        label: "SMS send",
        input: "Draft SMS for purok 3 evacuate now",
        expected: "short alert draft",
        actual: "long essay",
        confidence: null,
        latencyMs: 1200,
        match: false,
      },
    ],
  },
];

export function summarizeSuite(suite: BenchmarkSuite) {
  const n = suite.cases.length;
  const matches = suite.cases.filter((c) => c.match).length;
  const latencies = [...suite.cases.map((c) => c.latencyMs)].sort(
    (a, b) => a - b,
  );
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);
  const maxLatency = latencies[latencies.length - 1] ?? 1;
  return {
    n,
    matches,
    accuracyPct: n === 0 ? 0 : Math.round((matches / n) * 100),
    p50,
    p95,
    maxLatency,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

export function formatLatencyMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
