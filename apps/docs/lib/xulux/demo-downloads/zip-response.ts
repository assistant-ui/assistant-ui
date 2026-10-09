import { NextResponse } from "next/server";

export function zipDownloadResponse(archive?: {
  filename: string;
  bytes: Buffer<ArrayBuffer>;
}) {
  if (!archive) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new NextResponse(archive.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archive.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
