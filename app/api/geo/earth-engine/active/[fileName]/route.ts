import { NextResponse } from "next/server";
import { readActiveEeDataset } from "@/lib/geo/eeRunHistory";

export const runtime = "nodejs";

type Params = { params: Promise<{ fileName: string }> };

/** Download an active EE dataset from Firestore `ee_datasets`. */
export async function GET(_req: Request, { params }: Params) {
  const { fileName } = await params;
  const file = await readActiveEeDataset(fileName);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
