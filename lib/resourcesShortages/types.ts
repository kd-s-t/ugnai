import type { SupplyNeedKind } from "@/lib/workspace/reportNeed";
import type { AllocationOption } from "@/lib/workspace/allocationOptions";

/** Cached Gemini allocation draft on the shortage doc. */
export type ShortageAllocationDraft = {
  planKey: string;
  options: AllocationOption[];
  source: "gemini" | "local";
  prompt: string | null;
  raw: string | null;
  model: string | null;
  error: string | null;
  savedAt: string;
};

/** Parent shortage record. Doc id is the public code (e.g. RS-001). */
export type ResourceShortage = {
  id: string;
  kind: SupplyNeedKind;
  resourceLabel: string;
  resourceBlurb: string;
  totalNeededL: number;
  availableL: number;
  shortageL: number;
  communityCount: number;
  advisory: string;
  reportIds: string[];
  primaryReportId: string;
  compareHref: string;
  /** Persisted compare-options draft (prompt + return) so Gemini is not re-run. */
  allocation: ShortageAllocationDraft | null;
  /** Selected option id from compare (e.g. feasible | even | need). */
  selectedOptionId: string | null;
  /** review_draft | approved */
  reviewStatus: "review_draft" | "approved" | null;
  /**
   * Allocation plan stepper progress so officers can continue later.
   * 1 compare · 2 review & approve · 3 track assistance
   */
  workflowStep: 1 | 2 | 3 | null;
  createdAt: string;
  updatedAt: string;
};

export const SHORTAGE_WORKFLOW_STEPS = [
  { n: 1 as const, label: "Compare options", short: "Compare" },
  { n: 2 as const, label: "Review & approve", short: "Review" },
  { n: 3 as const, label: "Track assistance", short: "Track" },
];

export function shortageWorkflowStepLabel(
  step: 1 | 2 | 3 | null | undefined,
): string {
  if (step === 1) return "1 · Compare options";
  if (step === 2) return "2 · Review & approve";
  if (step === 3) return "3 · Track assistance";
  return "Desk";
}

export function hrefForShortageWorkflow(
  shortageId: string,
  step: 1 | 2 | 3 | null | undefined,
): string {
  const id = shortageId.trim().toUpperCase();
  if (!id) return "/admin/resources";
  if (step === 3) {
    return `/admin/resources/track/${encodeURIComponent(id)}`;
  }
  if (step === 2) {
    return `/admin/resources/review/${encodeURIComponent(id)}`;
  }
  if (step === 1) {
    return `/admin/resources/compare/${encodeURIComponent(id)}`;
  }
  return `/admin/resources/${encodeURIComponent(id)}`;
}

export function hrefForShortageDesk(shortageId: string): string {
  const id = shortageId.trim().toUpperCase();
  if (!id) return "/admin/resources";
  return `/admin/resources/${encodeURIComponent(id)}`;
}
