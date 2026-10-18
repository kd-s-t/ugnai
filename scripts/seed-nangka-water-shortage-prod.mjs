#!/usr/bin/env node
/**
 * Upsert 5 Nangka purok drinking-water shortage reports into prod Firestore.
 * Used for RS-001 shortage desk demos when NEXT_PUBLIC_SIMULATION_ON=false.
 *
 * Usage: node scripts/seed-nangka-water-shortage-prod.mjs
 * Auth: gcloud auth print-access-token (Owner/Editor on nice-pen-181017)
 */
import { execSync } from "node:child_process";

const PROJECT =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "nice-pen-181017";

const PREFIX = "CEB-CON-NANG";
const NOW = new Date().toISOString();

const SAMPLES = [
  {
    id: `${PREFIX}-261017-9201`,
    purok: "Purok 6",
    name: "Rosa V.",
    email: "rosa.villanueva@nangka.resource.demo",
    phone: "+63 917 200 9201",
    lat: 10.3694,
    lng: 123.9621,
    waterL: 1200,
    people: 320,
    localStockL: 0,
    readiness: "Access road open.",
  },
  {
    id: `${PREFIX}-261017-9202`,
    purok: "Purok 3",
    name: "Benito Cruz",
    email: "benito.cruz@nangka.resource.demo",
    phone: "+63 917 200 9202",
    lat: 10.371,
    lng: 123.9605,
    waterL: 1000,
    people: 250,
    localStockL: 200,
    readiness: "Access unknown pending ground check.",
  },
  {
    id: `${PREFIX}-261017-9203`,
    purok: "Purok 1",
    name: "Ana Dela Peña",
    email: "ana.delapena@nangka.resource.demo",
    phone: "+63 917 200 9203",
    lat: 10.3682,
    lng: 123.9588,
    waterL: 800,
    people: 180,
    localStockL: 300,
    readiness: "No transport for tanker delivery.",
  },
  {
    id: `${PREFIX}-261017-9204`,
    purok: "Purok 4",
    name: "Carlo Mendoza",
    email: "carlo.mendoza@nangka.resource.demo",
    phone: "+63 917 200 9204",
    lat: 10.3702,
    lng: 123.9612,
    waterL: 900,
    people: 210,
    localStockL: 0,
    readiness: "Access road open.",
  },
  {
    id: `${PREFIX}-261017-9205`,
    purok: "Purok 2",
    name: "Liza Tan",
    email: "liza.tan@nangka.resource.demo",
    phone: "+63 917 200 9205",
    lat: 10.3675,
    lng: 123.9595,
    waterL: 700,
    people: 190,
    localStockL: 150,
    readiness: "Access unknown pending ground check.",
  },
];

function token() {
  return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
}

function authHeaders(tok) {
  return {
    Authorization: `Bearer ${tok}`,
    "Content-Type": "application/json",
    "x-goog-user-project": PROJECT,
  };
}

function sv(s) {
  return { stringValue: s == null ? "" : String(s) };
}
function bv(b) {
  return { booleanValue: Boolean(b) };
}
function nv(n) {
  return { doubleValue: Number(n) };
}
function iv(n) {
  return { integerValue: String(Math.trunc(n)) };
}
function nullV() {
  return { nullValue: null };
}
function mapV(fields) {
  return { mapValue: { fields } };
}

function docUrl(id) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/reports/${encodeURIComponent(id)}`;
}

function fieldsFor(sample) {
  const stockLine =
    sample.localStockL === 0
      ? "Local stock empty (0 L local)."
      : `${sample.localStockL} L local stock on hand.`;
  const title = `Need ${sample.waterL} L drinking water · ${sample.purok}`;
  const notes = `${sample.people} people affected in ${sample.purok}. ${stockLine} Need ${sample.waterL} L drinking water. ${sample.readiness}`;

  return {
    citizenUid: sv("demo-map-seed"),
    citizenName: sv(sample.name),
    citizenPurok: sv(sample.purok),
    barangay: sv("Nangka"),
    lgu: sv("Consolacion"),
    citizenPhotoURL: nullV(),
    title: sv(title),
    notes: sv(notes),
    hazardHint: sv("flood"),
    mediaType: sv("photo"),
    mediaPath: sv("/reports/flood-road-chapel.png"),
    mediaUrl: sv("/reports/flood-road-chapel.png"),
    mediaMime: sv("image/png"),
    mediaSource: sv("mobile-camera"),
    lat: nv(sample.lat),
    lng: nv(sample.lng),
    locationAccuracyM: nv(28),
    locationLabel: sv(`${sample.lat.toFixed(5)}, ${sample.lng.toFixed(5)}`),
    device: sv("Android · mobile"),
    ipAddress: nullV(),
    status: sv("legit"),
    aiVerdict: sv("legit"),
    aiConfidence: nv(0.91),
    aiReason: sv("Verified · drinking water shortage for Resources desk demo."),
    aiSource: sv("local"),
    aiModel: sv("resource-seed"),
    aiLatencyMs: iv(640),
    aiPrompt: nullV(),
    aiRaw: nullV(),
    aiPriority: sv("high"),
    aiPriorityFactors: mapV({
      immediateSeverity: sv(
        "Drinking water shortage · households need supply.",
      ),
      peopleAffected: sv(`${sample.people} people in ${sample.purok}.`),
      existingCoverage: sv("Local stock cannot cover the gap."),
      deliveryFeasibility: sv(sample.readiness),
      evidenceQuality: sv("Seeded verified shortage for Resources desk demos."),
    }),
    vertexClass: nullV(),
    vertexConfidence: nullV(),
    vertexLatencyMs: nullV(),
    vertexPrompt: nullV(),
    vertexRaw: nullV(),
    vertexLocationLabel: nullV(),
    vertexLocationConfidence: nullV(),
    vertexLocationPlaceId: nullV(),
    vertexLocationPlaceLabel: nullV(),
    validatedAt: sv(NOW),
    autoResponderCallAt: nullV(),
    dispatchedAt: nullV(),
    reporterDispatchNotifiedAt: nullV(),
    dispatchLog: nullV(),
    manualDispatchChecked: bv(false),
    proposalChecklist: mapV({}),
    fieldEvidence: { arrayValue: { values: [] } },
    fieldNotes: nullV(),
    fieldNotesAt: nullV(),
    reporterIdVerified: bv(true),
    reporterEmail: sv(sample.email),
    reporterPhone: sv(sample.phone),
    reporterEmailVerified: bv(true),
    trustScore: iv(88),
    reactionCounts: mapV({}),
    commentCount: iv(0),
    createdAt: sv(NOW),
    updatedAt: sv(NOW),
  };
}

async function upsert(tok, sample) {
  const fields = fieldsFor(sample);
  const res = await fetch(`${docUrl(sample.id)}?currentDocument.exists=false`, {
    method: "PATCH",
    headers: authHeaders(tok),
    body: JSON.stringify({ fields }),
  });
  if (res.status === 409 || res.status === 400) {
    // Exists — overwrite key shortage fields.
    const updateMask = [
      "title",
      "notes",
      "status",
      "hazardHint",
      "citizenPurok",
      "citizenName",
      "barangay",
      "lgu",
      "lat",
      "lng",
      "aiVerdict",
      "aiConfidence",
      "aiReason",
      "updatedAt",
      "reporterPhone",
      "reporterEmail",
    ]
      .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
      .join("&");
    const patch = await fetch(`${docUrl(sample.id)}?${updateMask}`, {
      method: "PATCH",
      headers: authHeaders(tok),
      body: JSON.stringify({
        fields: {
          title: fields.title,
          notes: fields.notes,
          status: fields.status,
          hazardHint: fields.hazardHint,
          citizenPurok: fields.citizenPurok,
          citizenName: fields.citizenName,
          barangay: fields.barangay,
          lgu: fields.lgu,
          lat: fields.lat,
          lng: fields.lng,
          aiVerdict: fields.aiVerdict,
          aiConfidence: fields.aiConfidence,
          aiReason: fields.aiReason,
          updatedAt: fields.updatedAt,
          reporterPhone: fields.reporterPhone,
          reporterEmail: fields.reporterEmail,
        },
      }),
    });
    if (!patch.ok) {
      throw new Error(`update ${sample.id}: ${patch.status} ${await patch.text()}`);
    }
    console.log("updated", sample.id, sample.purok, `${sample.waterL} L`);
    return;
  }
  if (!res.ok) {
    // Try plain PATCH create/replace
    const put = await fetch(docUrl(sample.id), {
      method: "PATCH",
      headers: authHeaders(tok),
      body: JSON.stringify({ fields }),
    });
    if (!put.ok) {
      throw new Error(`put ${sample.id}: ${put.status} ${await put.text()}`);
    }
    console.log("wrote", sample.id, sample.purok, `${sample.waterL} L`);
    return;
  }
  console.log("created", sample.id, sample.purok, `${sample.waterL} L`);
}

async function main() {
  const tok = token();
  console.log("project", PROJECT);
  for (const sample of SAMPLES) {
    await upsert(tok, sample);
  }
  console.log("done · 5 Nangka water shortage reports ready for RS-001");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
