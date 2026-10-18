import { distKm } from "@/lib/geo/bearing";
import type { HazardReport } from "@/lib/reports/types";

const OPEN_VERIFIED = new Set(["legit", "assigned", "dispatched"]);

/** Open, officer/AI-verified road blockage tickets on the incident map. */
export function verifiedRoadBlockReports(
  reports: HazardReport[],
): HazardReport[] {
  return reports.filter(
    (r) =>
      r.hazardHint === "blockage" &&
      OPEN_VERIFIED.has(r.status) &&
      r.lat != null &&
      r.lng != null,
  );
}

/**
 * Access check for a delivery community:
 * look at verified road-block incident reports near the sitio.
 * No nearby verified block → access is OK.
 */
export function verifyDeliveryAccess(input: {
  reports: HazardReport[];
  lat: number | null | undefined;
  lng: number | null | undefined;
  /** Same-barangay blocks still count when coords are missing. */
  barangay?: string | null;
  maxKm?: number;
}):
  | { ok: true }
  | { ok: false; block: HazardReport } {
  const blocks = verifiedRoadBlockReports(input.reports);
  if (blocks.length === 0) return { ok: true };

  /** Sitio-scale radius (Nangka puroks are close; 2.5 km flagged almost everyone). */
  const maxKm = input.maxKm ?? 0.75;
  const lat = input.lat;
  const lng = input.lng;

  if (lat != null && lng != null) {
    let nearest: HazardReport | null = null;
    let best = maxKm;
    for (const b of blocks) {
      if (b.lat == null || b.lng == null) continue;
      const km = distKm({ lat, lng }, { lat: b.lat, lng: b.lng });
      if (km <= best) {
        best = km;
        nearest = b;
      }
    }
    if (nearest) return { ok: false, block: nearest };
    return { ok: true };
  }

  const brgy = input.barangay?.trim().toLowerCase();
  if (brgy) {
    const same = blocks.find(
      (b) => b.barangay?.trim().toLowerCase() === brgy,
    );
    if (same) return { ok: false, block: same };
  }

  return { ok: true };
}
