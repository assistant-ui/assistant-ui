import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { fetchSandboxResource } from "@/lib/xulux/fetch-sandbox";
import { resolveSandboxDownloadUrl } from "@/lib/xulux/sandbox-download-url";
import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";

export const runtime = "nodejs";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB ceiling

async function readLimitedBody(
  body: ReadableStream<Uint8Array>,
): Promise<ArrayBuffer | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > MAX_ZIP_BYTES) {
        await reader.cancel("Archive too large.");
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new ArrayBuffer(total);
  const view = new Uint8Array(result);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function GET(req: Request) {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");
  const versionId = searchParams.get("versionId") ?? undefined;
  const downloadSearch = searchParams.get("downloadSearch") ?? undefined;

  if (!templateId) {
    return NextResponse.json(
      { error: "Missing `templateId` query parameter." },
      { status: 400 },
    );
  }

  const upstreamUrl = resolveSandboxDownloadUrl({
    templates: getXuluxHostedTemplatesCatalog().templates,
    templateId,
    versionId,
    downloadSearch,
  });

  if (!upstreamUrl) {
    return NextResponse.json(
      { error: "Template download URL not allowed." },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetchSandboxResource(upstreamUrl, {
      redirect: "manual",
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return NextResponse.json(
        { error: "Redirects are not allowed." },
        { status: 400 },
      );
    }

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Upstream responded ${upstream.status}.`,
          details: details.slice(0, 500) || undefined,
        },
        { status: 502 },
      );
    }

    const contentLengthHeader = upstream.headers.get("content-length");
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : undefined;
    if (
      contentLength !== undefined &&
      (!Number.isFinite(contentLength) || contentLength > MAX_ZIP_BYTES)
    ) {
      return NextResponse.json(
        { error: "Archive too large." },
        { status: 413 },
      );
    }

    const body = upstream.body;
    if (!body) {
      return NextResponse.json(
        { error: "No body from upstream." },
        { status: 502 },
      );
    }

    const responseBody = await readLimitedBody(body);
    if (!responseBody) {
      return NextResponse.json(
        { error: "Archive too large." },
        { status: 413 },
      );
    }

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : undefined;
    return NextResponse.json(
      {
        error: "Proxy fetch failed.",
        details: err instanceof Error ? err.message : String(err),
        cause,
      },
      { status: 502 },
    );
  }
}
