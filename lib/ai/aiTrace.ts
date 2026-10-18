/** Cap stored prompt / raw model text for Firestore. */
const MAX_CHARS = 24_000;

export function clipAiTrace(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const s = String(value);
  if (!s.trim()) return null;
  if (s.length <= MAX_CHARS) return s;
  return `${s.slice(0, MAX_CHARS)}\n…[truncated ${s.length - MAX_CHARS} chars]`;
}

/** Wall-clock ms for Firestore (integer ≥ 0). */
export function normalizeLatencyMs(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}
