export function zipDownloadResponse(archive: {
  filename: string;
  bytes: Buffer<ArrayBuffer>;
}) {
  return new Response(archive.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archive.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
