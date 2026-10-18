import { distKm } from "@/lib/geo/bearing";

/**
 * Ops area — Brgy. Nangka, Consolacion, Cebu.
 * Hall coords from OSM Nominatim (Nangka Barangay Hall).
 */
export const CEBU_AREA = {
  name: "Brgy. Nangka, Consolacion, Cebu",
  label: "Nangka ops area",
  /** Nangka Barangay Hall · Nangka Purok 1–Purok 6 Access Road */
  center: { lat: 10.3708662, lng: 123.9590464 },
  zoom: 16,
  boundsPadding: 0.004,
} as const;

export type LatLng = { lat: number; lng: number };

/** True if a pin is within the Nangka ops radius (not old Mabolo, etc.). */
export function isNearOpsArea(
  lat: number,
  lng: number,
  maxKm = 3,
): boolean {
  return distKm(CEBU_AREA.center, { lat, lng }) <= maxKm;
}

/**
 * Metro Cebu coverage for device GPS. Remote testers (e.g. Singapore judges)
 * sit far outside this — clamp them to the barangay hall so demo pins stay
 * on the ops map.
 */
export const SERVICE_COVERAGE_KM = 80;

export function clampToOpsCoverage(
  lat: number,
  lng: number,
  maxKm = SERVICE_COVERAGE_KM,
): { lat: number; lng: number; remapped: boolean } {
  if (distKm(CEBU_AREA.center, { lat, lng }) <= maxKm) {
    return { lat, lng, remapped: false };
  }
  return {
    lat: CEBU_AREA.center.lat,
    lng: CEBU_AREA.center.lng,
    remapped: true,
  };
}

/** True when most mapped households sit inside the current ops barangay. */
export function rosterMatchesOpsArea(
  households: { lat: number | null; lng: number | null }[],
): boolean {
  const mapped = households.filter(
    (h): h is { lat: number; lng: number } => h.lat != null && h.lng != null,
  );
  if (mapped.length === 0) return false;
  const near = mapped.filter((h) => isNearOpsArea(h.lat, h.lng));
  return near.length >= Math.ceil(mapped.length / 2);
}
