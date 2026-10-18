import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import type {
  ResourceShortage,
  ShortageAllocationDraft,
} from "@/lib/resourcesShortages/types";

function asWorkflowStep(raw: unknown): 1 | 2 | 3 | null {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}
import type { SupplyNeedKind } from "@/lib/workspace/reportNeed";
import type { AllocationOption } from "@/lib/workspace/allocationOptions";
import type { SupplyShortagePlan } from "@/lib/workspace/supplyShortagePlan";

const COL = "resources_shortages";

function mapAllocation(raw: unknown): ShortageAllocationDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const options = Array.isArray(d.options) ? d.options : [];
  if (options.length < 3) return null;
  const planKey = String(d.planKey ?? "").trim();
  if (!planKey) return null;
  const source = d.source === "gemini" ? "gemini" : "local";
  return {
    planKey,
    options: options as AllocationOption[],
    source,
    prompt: typeof d.prompt === "string" ? d.prompt : null,
    raw: typeof d.raw === "string" ? d.raw : null,
    model: typeof d.model === "string" ? d.model : null,
    error: typeof d.error === "string" ? d.error : null,
    savedAt: String(d.savedAt ?? ""),
  };
}

function asIso(value: unknown, serverValue: unknown): string {
  if (typeof value === "string") return value;
  if (
    serverValue &&
    typeof serverValue === "object" &&
    "toDate" in serverValue &&
    typeof (serverValue as { toDate: () => Date }).toDate === "function"
  ) {
    return (serverValue as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

function asKind(raw: unknown): SupplyNeedKind {
  const v = String(raw ?? "");
  if (v === "water" || v === "food" || v === "medical" || v === "relief") {
    return v;
  }
  return "water";
}

function mapDoc(id: string, data: Record<string, unknown>): ResourceShortage {
  const reportIds = Array.isArray(data.reportIds)
    ? data.reportIds.map(String).filter(Boolean)
    : [];
  return {
    id,
    kind: asKind(data.kind),
    resourceLabel: String(data.resourceLabel ?? "Supplies"),
    resourceBlurb: String(data.resourceBlurb ?? ""),
    totalNeededL: Number(data.totalNeededL) || 0,
    availableL: Number(data.availableL) || 0,
    shortageL: Number(data.shortageL) || 0,
    communityCount: Number(data.communityCount) || 0,
    advisory: String(data.advisory ?? ""),
    reportIds,
    primaryReportId: String(data.primaryReportId ?? reportIds[0] ?? ""),
    compareHref: String(
      data.compareHref ??
        `/admin/resources/compare/${encodeURIComponent(id)}`,
    ),
    allocation: mapAllocation(data.allocation),
    selectedOptionId:
      typeof data.selectedOptionId === "string" && data.selectedOptionId.trim()
        ? data.selectedOptionId.trim()
        : null,
    reviewStatus:
      data.reviewStatus === "approved"
        ? "approved"
        : data.reviewStatus === "review_draft"
          ? "review_draft"
          : null,
    workflowStep: asWorkflowStep(data.workflowStep),
    createdAt: asIso(data.createdAt, data.createdAtServer),
    updatedAt: asIso(data.updatedAt, data.updatedAtServer),
  };
}

/**
 * Write shortage under a barangay storage id (e.g. RS-001__consolacion__nangka).
 * Public URL stays `/admin/resources/RS-001`.
 */
export async function upsertShortageFromPlan(
  plan: SupplyShortagePlan,
  storageId?: string,
): Promise<ResourceShortage> {
  const publicCode = plan.code.trim().toUpperCase();
  const id = (storageId?.trim() || publicCode).toUpperCase();
  const ref = doc(getClientDb(), COL, id);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  const reportIds = [
    ...new Set(plan.rows.flatMap((r) => r.reportIds)),
  ];

  const totalNeededL = Math.max(0, Number(plan.totalNeededL) || 0);
  const availableL = Math.max(0, Number(plan.availableL) || 0);
  const shortageL = Math.max(0, Number(plan.shortageL) || 0);
  await setDoc(
    ref,
    {
      kind: plan.kind,
      resourceLabel: plan.resourceLabel || "Supplies",
      resourceBlurb: plan.resourceBlurb || "",
      totalNeededL,
      availableL,
      shortageL,
      communityCount: Number(plan.communityCount) || 0,
      advisory: plan.advisory || "",
      reportIds,
      primaryReportId: plan.primaryReportId,
      publicCode,
      compareHref: `/admin/resources/compare/${encodeURIComponent(publicCode)}`,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
      ...(existing.exists()
        ? {}
        : {
            workflowStep: 1,
            createdAt: now,
            createdAtServer: serverTimestamp(),
          }),
    },
    { merge: true },
  );

  const snap = await getDoc(ref);
  return mapDoc(publicCode, (snap.data() ?? {}) as Record<string, unknown>);
}

/** Persist current allocation-plan stepper step (1–3). */
export async function saveShortageWorkflowStep(
  shortageId: string,
  workflowStep: 1 | 2 | 3,
  extra?: {
    selectedOptionId?: string;
    reviewStatus?: "review_draft" | "approved";
  },
): Promise<void> {
  const id = shortageId.trim().toUpperCase();
  if (!id) return;
  const ref = doc(getClientDb(), COL, id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    throw new Error(
      "Shortage record not found. Open Compare options first, then continue.",
    );
  }
  const now = new Date().toISOString();
  await setDoc(
    ref,
    {
      workflowStep,
      ...(extra?.selectedOptionId
        ? { selectedOptionId: extra.selectedOptionId }
        : {}),
      ...(extra?.reviewStatus ? { reviewStatus: extra.reviewStatus } : {}),
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getShortageById(
  id: string,
): Promise<ResourceShortage | null> {
  const code = id.trim().toUpperCase();
  if (!code) return null;
  const snap = await getDoc(doc(getClientDb(), COL, code));
  if (!snap.exists()) return null;
  const publicCode =
    typeof snap.data()?.publicCode === "string"
      ? String(snap.data()?.publicCode).toUpperCase()
      : code.split("__")[0] || code;
  return mapDoc(publicCode, snap.data() as Record<string, unknown>);
}

/** Persist compare-options Gemini prompt + return on resources_shortages/{id}. */
export async function saveShortageAllocationDraft(
  shortageId: string,
  draft: ShortageAllocationDraft,
): Promise<void> {
  const id = shortageId.trim().toUpperCase();
  if (!id || draft.options.length < 3) return;
  const now = new Date().toISOString();
  const ref = doc(getClientDb(), COL, id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    throw new Error(
      "Shortage record not found. Open the shortage plan, then Compare again.",
    );
  }
  const prevStep = asWorkflowStep(existing.data()?.workflowStep);
  await setDoc(
    ref,
    {
      allocation: {
        planKey: draft.planKey,
        options: draft.options,
        source: draft.source,
        prompt: draft.prompt,
        raw: draft.raw,
        model: draft.model,
        error: draft.error,
        savedAt: draft.savedAt || now,
      },
      // Do not push progress backward when regenerating options mid-review.
      workflowStep: prevStep && prevStep > 1 ? prevStep : 1,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Update lines on one allocation option (e.g. after Verify access). */
export async function patchShortageAllocationLines(
  shortageId: string,
  optionId: string,
  lines: import("@/lib/workspace/allocationOptions").AllocationLine[],
): Promise<void> {
  const id = shortageId.trim().toUpperCase();
  const optId = optionId.trim();
  if (!id || !optId || lines.length === 0) {
    throw new Error("Missing shortage or option to save access check.");
  }
  const ref = doc(getClientDb(), COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Shortage record not found.");
  }
  const data = snap.data() as Record<string, unknown>;
  const allocation =
    data.allocation && typeof data.allocation === "object"
      ? (data.allocation as Record<string, unknown>)
      : null;
  const rawOptions = Array.isArray(allocation?.options)
    ? (allocation!.options as AllocationOption[])
    : [];
  if (rawOptions.length === 0) {
    throw new Error("No allocation options saved yet. Open Compare first.");
  }
  const found = rawOptions.some((o) => o.id === optId);
  if (!found) {
    throw new Error("Selected option not found on shortage record.");
  }
  const options = rawOptions.map((o) =>
    o.id === optId ? { ...o, lines } : o,
  );
  const now = new Date().toISOString();
  await setDoc(
    ref,
    {
      allocation: {
        ...allocation,
        options,
        savedAt: now,
      },
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Persist chosen compare option and move into plan review. */
export async function saveSelectedAllocationOption(
  shortageId: string,
  optionId: string,
): Promise<void> {
  const id = shortageId.trim().toUpperCase();
  const opt = optionId.trim();
  if (!id || !opt) return;
  await saveShortageWorkflowStep(id, 2, {
    selectedOptionId: opt,
    reviewStatus: "review_draft",
  });
}

export async function setShortageReviewStatus(
  shortageId: string,
  reviewStatus: "review_draft" | "approved",
): Promise<void> {
  const id = shortageId.trim().toUpperCase();
  if (!id) return;
  await saveShortageWorkflowStep(id, reviewStatus === "approved" ? 3 : 2, {
    reviewStatus,
  });
}

export function listenShortageById(
  id: string,
  onChange: (row: ResourceShortage | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const code = id.trim().toUpperCase();
  return onSnapshot(
    doc(getClientDb(), COL, code),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const publicCode =
        typeof snap.data()?.publicCode === "string"
          ? String(snap.data()?.publicCode).toUpperCase()
          : code.split("__")[0] || code;
      onChange(mapDoc(publicCode, snap.data() as Record<string, unknown>));
    },
    (err) => onError?.(err),
  );
}

/** All shortage plan docs (for suggested-board step column). */
export function listenAllShortages(
  onChange: (rows: ResourceShortage[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getClientDb(), COL),
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const publicCode =
          typeof data.publicCode === "string"
            ? String(data.publicCode).toUpperCase()
            : d.id.split("__")[0] || d.id;
        return mapDoc(publicCode, data);
      });
      onChange(rows);
    },
    (err) => onError?.(err),
  );
}
