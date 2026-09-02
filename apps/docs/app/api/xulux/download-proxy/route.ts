import { NextResponse } from "next/server";
import { requirePublicAssistantSession } from "@/lib/anonymous-session";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { checkXuluxDownloadProxyRateLimit } from "@/lib/rate-limit";
import { fetchSandboxResource } from "@/lib/xulux/fetch-sandbox";
import { resolveSandboxDownloadUrl } from "@/lib/xulux/sandbox-download-url";
import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";

export const runtime = "nodejs";
// The platform default, stated so the ceiling is reviewable rather than
// inherited. The archive streams for as long as the client takes to read it.
export const maxDuration = 300;

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB ceiling
// Bounds the wait for the sandbox to respond. It deliberately stops at the
// headers so a slow client cannot look like a stalled sandbox.
const SANDBOX_RESPONSE_TIMEOUT_MS = 30_000;

function limitArchiveSize(body: ReadableStream<Uint8Array>) {
  let total = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength;
        if (total > MAX_ZIP_BYTES) {
          controller.error(new Error("Archive too large."));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

export async function GET(req: Request) {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const session = requirePublicAssistantSession(req);
  if (session instanceof Response) return session;

  const rateLimitResponse = await checkXuluxDownloadProxyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

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
      timeoutMs: SANDBOX_RESPONSE_TIMEOUT_MS,
      timeoutScope: "response",
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

    return new NextResponse(limitArchiveSize(body), {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        ...(contentLengthHeader
          ? { "Content-Length": contentLengthHeader }
          : {}),
        "Cache-Control": "private, max-age=3600",
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
