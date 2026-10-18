import type { AllocationOption } from "@/lib/workspace/allocationOptions";
import type { ResourceShortage } from "@/lib/resourcesShortages/types";

const CACHE_PREFIX = "ugnai.allocationOptions.v1:";
const SHORTAGE_FLASH_PREFIX = "ugnai.shortage.flash.v1:";

export type CachedAllocation = {
  options: AllocationOption[];
  source: "gemini" | "local";
  debug?: {
    prompt?: string | null;
    raw?: string | null;
    model?: string;
    error?: string;
  } | null;
  savedAt: string;
  selectedOptionId?: string | null;
};

function cacheKey(planKey: string): string {
  return `${CACHE_PREFIX}${planKey}`;
}

export function readAllocationCache(planKey: string): CachedAllocation | null {
  if (typeof window === "undefined" || !planKey) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(planKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAllocation;
    if (!Array.isArray(parsed.options) || parsed.options.length < 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAllocationCache(
  planKey: string,
  value: CachedAllocation,
): void {
  if (typeof window === "undefined" || !planKey) return;
  try {
    sessionStorage.setItem(cacheKey(planKey), JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

/** One-shot shortage snapshot so review remount does not blank to loading. */
export function writeShortageFlash(
  shortageId: string,
  shortage: ResourceShortage,
): void {
  if (typeof window === "undefined" || !shortageId) return;
  try {
    sessionStorage.setItem(
      `${SHORTAGE_FLASH_PREFIX}${shortageId}`,
      JSON.stringify(shortage),
    );
  } catch {
    /* quota / private mode */
  }
}

export function takeShortageFlash(
  shortageId: string,
): ResourceShortage | null {
  if (typeof window === "undefined" || !shortageId) return null;
  try {
    const key = `${SHORTAGE_FLASH_PREFIX}${shortageId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw) as ResourceShortage;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}
