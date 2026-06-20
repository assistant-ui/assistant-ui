import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { fetchSandboxResource } from "@/lib/xulux/fetch-sandbox";

export const runtime = "nodejs";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB ceiling

function limitBodySize(
  body: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let total = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      total += value.byteLength;
      if (total > MAX_ZIP_BYTES) {
        await reader.cancel("Archive too large.");
        controller.error(new Error("Archive too large."));
        return;
      }

      controller.enqueue(value);
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

export async function GET(req: Request) {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing `url` query parameter." },
      { status: 400 },
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid `url` parameter." },
      { status: 400 },
    );
  }

  const allowed =
    parsed.hostname.endsWith(".bl.run") ||
    parsed.hostname.endsWith(".blaxel.ai");
  if (!allowed) {
    return NextResponse.json(
      { error: "URL host not allowed." },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetchSandboxResource(targetUrl, {
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

    return new NextResponse(limitBodySize(body), {
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
