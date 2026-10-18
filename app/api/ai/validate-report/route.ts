import { NextResponse } from "next/server";
import { validateHazardReport } from "@/lib/ai/validateHazardReport";
import { downloadGuestMediaBytes } from "@/lib/reports/serverGuestWrite";
import type { ReportHazardHint, ReportMediaType } from "@/lib/reports/types";

export const runtime = "nodejs";
/** Photo + Vertex + Gemini can exceed default serverless budgets. */
export const maxDuration = 60;

type Body = {
  title: string;
  notes: string;
  hazardHint: ReportHazardHint;
  mediaType: ReportMediaType;
  mediaMime: string;
  /** Base64 without data: prefix — preferred for emulator Storage. */
  mediaBase64?: string;
  /** Storage object path when inline base64 was skipped (large photo). */
  mediaPath?: string;
  /** Speech-to-text for voice-only / voice+photo reports. */
  voiceTranscript?: string;
  fileName?: string;
  model?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const mediaType = body.mediaType === "video" ? "video" : "photo";
  let mediaMime = body.mediaMime || "";
  let mediaBase64 = body.mediaBase64?.trim() || undefined;

  if (!mediaBase64 && mediaType === "photo") {
    const mediaPath =
      typeof body.mediaPath === "string" ? body.mediaPath.trim() : "";
    if (mediaPath) {
      try {
        const downloaded = await downloadGuestMediaBytes(mediaPath);
        if (downloaded && downloaded.bytes.length > 0) {
          // Cap inline size for model request budget (~4MB).
          if (downloaded.bytes.length <= 4 * 1024 * 1024) {
            mediaBase64 = downloaded.bytes.toString("base64");
            mediaMime = downloaded.contentType || mediaMime || "image/jpeg";
          }
        }
      } catch (err) {
        console.error("[validate-report] media download failed", err);
      }
    }
  }

  const result = await validateHazardReport({
    title,
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    hazardHint: body.hazardHint ?? "other",
    mediaType,
    mediaMime: mediaMime || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    mediaBase64,
    voiceTranscript:
      typeof body.voiceTranscript === "string"
        ? body.voiceTranscript.trim()
        : undefined,
    fileName: body.fileName,
    model: body.model,
  });

  return NextResponse.json(result);
}
