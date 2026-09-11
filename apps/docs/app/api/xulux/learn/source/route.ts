import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { LearnRegistryError } from "@/lib/xulux/learn/registry";
import { resolveStageFiles } from "@/lib/xulux/learn/stage-source";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const stageId = url.searchParams.get("stageId") ?? "";

  try {
    const files = await resolveStageFiles(courseId, stageId);
    return NextResponse.json(
      { courseId, stageId, files },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof LearnRegistryError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to resolve Learn stage source." },
      { status: 500 },
    );
  }
}
