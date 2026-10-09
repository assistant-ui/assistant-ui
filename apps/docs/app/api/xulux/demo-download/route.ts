import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import {
  createDemoZip,
  getDemoArchiveFilename,
} from "@/lib/xulux/demo-downloads/create-demo-zip";
import { getDemoDownloadManifest } from "@/lib/xulux/demo-downloads/manifest";
import { zipDownloadResponse } from "@/lib/xulux/demo-downloads/zip-response";

export async function GET(req: Request) {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const manifest = getDemoDownloadManifest(slug);

  if (!manifest) {
    return NextResponse.json(
      { error: `Unsupported demo slug: ${slug}` },
      { status: 404 },
    );
  }

  try {
    const zip = await createDemoZip(manifest.slug);
    return zipDownloadResponse({
      filename: getDemoArchiveFilename(manifest.slug),
      bytes: zip,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate demo download.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
