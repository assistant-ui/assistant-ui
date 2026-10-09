import { NextResponse } from "next/server";

export function zipDownloadResponse(archive: {
  filename: string;
  bytes: Buffer<ArrayBuffer>;
}) {
  return new NextResponse(archive.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archive.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
