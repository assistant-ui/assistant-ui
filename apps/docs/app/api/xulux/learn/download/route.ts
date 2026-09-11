import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { LearnRegistryError } from "@/lib/xulux/learn/registry";
import {
  createLearnStageZip,
  getLearnStageArchiveFilename,
} from "@/lib/xulux/learn/stage-source";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const stageId = url.searchParams.get("stageId") ?? "";

  try {
    const zip = await createLearnStageZip(courseId, stageId);
    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${getLearnStageArchiveFilename(courseId, stageId)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof LearnRegistryError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to generate Learn stage download." },
      { status: 500 },
    );
  }
}
