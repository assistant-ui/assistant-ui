import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { LearnRegistryError } from "@/lib/xulux/learn/registry";
import {
  createLearnStageZip,
  getLearnStageArchiveFilename,
} from "@/lib/xulux/learn/stage-source";
import { zipDownloadResponse } from "@/lib/xulux/demo-downloads/zip-response";

export async function GET(request: Request) {
  if (!isAiPlaygroundEnabled) {
    return zipDownloadResponse();
  }

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const stageId = url.searchParams.get("stageId") ?? "";

  try {
    const zip = await createLearnStageZip(courseId, stageId);
    return zipDownloadResponse({
      filename: getLearnStageArchiveFilename(courseId, stageId),
      bytes: zip,
    });
  } catch (error) {
    if (error instanceof LearnRegistryError) {
      return zipDownloadResponse();
    }
    return NextResponse.json(
      { error: "Failed to generate Learn stage download." },
      { status: 500 },
    );
  }
}
