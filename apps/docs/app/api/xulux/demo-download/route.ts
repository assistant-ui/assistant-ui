import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import {
  createDemoZip,
  getDemoArchiveFilename,
} from "@/lib/xulux/demo-downloads/create-demo-zip";
import { getDemoDownloadManifest } from "@/lib/xulux/demo-downloads/manifest";

export const runtime = "nodejs";

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
    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${getDemoArchiveFilename(manifest.slug)}"`,
        "Cache-Control": "no-store",
      },
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
