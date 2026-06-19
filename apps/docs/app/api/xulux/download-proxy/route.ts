import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { fetchSandboxResource } from "@/lib/xulux/fetch-sandbox";

export const runtime = "nodejs";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB ceiling

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
    const upstream = await fetchSandboxResource(targetUrl);

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

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength > MAX_ZIP_BYTES) {
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

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600, immutable",
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
