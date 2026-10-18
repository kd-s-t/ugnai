import { isSimulationOn } from "@/lib/config/simulation";
import type { HazardReport } from "@/lib/reports/types";
import type { DrrmScenarioPhase } from "@/lib/scenarios/types";

/**
 * Tino Before/During/After map pins + queue sample seeds.
 * These clutter the live Incidents board on prod.
 */
export function isTinoScenarioDemoReport(
  r: Pick<HazardReport, "id" | "citizenUid" | "aiModel">,
): boolean {
  // Apas water/fire ops demos stay visible on the board.
  if (
    r.aiModel === "apas-water-seed" ||
    r.aiModel === "apas-fire-seed" ||
    r.aiModel === "apas-sample-seed"
  ) {
    return false;
  }
  if (r.citizenUid === "demo-map-seed") return true;
  if (r.id.startsWith("rpt-")) return true;
  if (r.aiModel === "sample-seed") return true;
  // Queue samples: …-YYMMDD-9xxx (9001–9999)
  if (/^[A-Z]{2,4}-[A-Z0-9]{2,8}-[A-Z0-9]{2,10}-\d{6}-9\d{3}$/.test(r.id)) {
    return true;
  }
  return false;
}

/** Hide scenario demo tickets on luwasph / when simulation is off. */
export function hideScenarioDemoReportsInUi(): boolean {
  const app = process.env.NEXT_PUBLIC_APP_URL?.toLowerCase() ?? "";
  if (app.includes("luwasph.com")) return true;
  return !isSimulationOn();
}

/**
 * After-Tino recovery demos (residual fire/smoke, welfare, hall wifi/genset).
 * During landfall should not paint these.
 */
export function isAfterScenarioDemoReport(
  r: Pick<HazardReport, "id" | "hazardHint" | "title" | "mediaUrl">,
): boolean {
  if (r.id.startsWith("rpt-after-")) return true;
  // Queue sample …-9003 is residual smoke/fire (After), not landfall During.
  if (/-\d{6}-9003$/.test(r.id)) return true;
  const title = (r.title ?? "").toLowerCase();
  const media = (r.mediaUrl ?? "").toLowerCase();
  if (media.includes("free-generator") || media.includes("free-wifi")) {
    return true;
  }
  if (
    title.includes("smoke near chapel") ||
    title.includes("free wi") ||
    title.includes("free generator") ||
    title.includes("welfare") ||
    title.includes("no contact")
  ) {
    return true;
  }
  if (r.hazardHint === "fire" && /-\d{6}-9\d{3}$/.test(r.id)) return true;
  return false;
}

/** During landfall map/board demos (flood, blockage, active typhoon tickets). */
export function isDuringScenarioDemoReport(
  r: Pick<HazardReport, "id" | "hazardHint" | "title" | "mediaUrl">,
): boolean {
  if (isAfterScenarioDemoReport(r)) return false;
  if (r.id.startsWith("rpt-") && !r.id.startsWith("rpt-after-")) return true;
  if (/-\d{6}-9\d{3}$/.test(r.id)) return true;
  return false;
}

/**
 * When Tino simulation is on, only show demo tickets for the active phase.
 * Live (non-demo) reports always pass.
 */
export function demoReportMatchesPhase(
  r: Pick<
    HazardReport,
    "id" | "citizenUid" | "aiModel" | "hazardHint" | "title" | "mediaUrl"
  >,
  phase: DrrmScenarioPhase,
): boolean {
  if (!isTinoScenarioDemoReport(r)) return true;
  if (phase === "nostorm" || phase === "before") return false;
  if (phase === "during") return isDuringScenarioDemoReport(r);
  if (phase === "after") return isAfterScenarioDemoReport(r);
  return true;
}
