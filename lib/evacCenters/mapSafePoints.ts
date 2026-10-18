import type { EvacCenter } from "@/lib/evacCenters/types";
import type { SafePoint } from "@/lib/geo/safePoints";

/**
 * Overlay live evacCenters directory (people + stock) onto map safe pins.
 * Match by curated id first, then by name.
 */
export function applyEvacDirectoryToSafePoints(
  points: SafePoint[],
  centers: EvacCenter[],
): SafePoint[] {
  if (centers.length === 0) return points;
  const byId = new Map(centers.map((c) => [c.id, c]));
  const byName = new Map(
    centers.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  return points.map((sp) => {
    if (!sp.isEvacCenter && sp.kind !== "evac_center" && sp.kind !== "school") {
      return sp;
    }
    const row =
      byId.get(sp.id) ?? byName.get(sp.name.trim().toLowerCase()) ?? null;
    if (!row) return sp;
    return {
      ...sp,
      occupancy: row.occupancy,
      capacity: row.maxCapacity,
      stock: row.stock,
      condition: row.condition,
      locationLabel: row.locationLabel || sp.locationLabel,
      updatedAt: row.updatedAt || sp.updatedAt,
      notes: row.notes?.trim() || sp.notes,
    };
  });
}
