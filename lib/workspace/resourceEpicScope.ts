import type { ReportScope } from "@/lib/reports/barangayScope";
import type { ResourceSuggestion } from "@/lib/resourcesSuggestions/types";
import type { ResourceSuggestionRequest } from "@/lib/resourcesSuggestions/types";

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Public epic code stays RS-001 in the URL; Firestore docs are per barangay. */
export function resourceEpicStorageId(
  code: string,
  scope: ReportScope,
): string {
  const epic = code.trim().toUpperCase() || "RS-001";
  if (scope.mode === "barangay") {
    return `${epic}__${slug(scope.lgu)}__${slug(scope.barangay)}`;
  }
  return `${epic}__${slug(scope.lgu)}`;
}

export function suggestionRequestInScope(
  request: ResourceSuggestionRequest,
  scope: ReportScope,
  scopedReportIds?: Set<string>,
): boolean {
  if (scopedReportIds && scopedReportIds.size > 0) {
    const ids =
      request.reportIds.length > 0 ? request.reportIds : [request.reportId];
    if (ids.some((id) => id && scopedReportIds.has(id))) return true;
  }
  const label = `${request.barangayLabel} ${request.community}`.toLowerCase();
  if (scope.mode === "barangay") {
    return (
      label.includes(scope.barangay.toLowerCase()) ||
      label.includes(`brgy. ${scope.barangay.toLowerCase()}`)
    );
  }
  return label.includes(scope.lgu.toLowerCase());
}

/** Keep only suggestion plans/requests that belong to this workspace. */
export function filterSuggestionsForScope(
  rows: ResourceSuggestion[],
  scope: ReportScope,
  scopedReportIds?: Set<string>,
): ResourceSuggestion[] {
  const out: ResourceSuggestion[] = [];
  for (const row of rows) {
    const requests = row.requests.filter((r) =>
      suggestionRequestInScope(r, scope, scopedReportIds),
    );
    if (requests.length === 0) continue;
    const totalNeededL = requests.reduce((s, r) => s + r.needL, 0);
    const gapSum = requests.reduce((s, r) => s + Math.max(0, r.gapL), 0);
    out.push({
      ...row,
      // Keep public epic in links (RS-001), not the storage suffix.
      id: row.shortageId || row.epicCode || row.id.split("__")[0] || row.id,
      requests,
      requestCount: requests.length,
      totalNeededL,
      shortageL: Math.max(0, gapSum - (row.availableL || 0)),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
