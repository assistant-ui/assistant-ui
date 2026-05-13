import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { exportWorkspaceArchive } from "../blaxel-sandbox";

export const maxDuration = 120;

export async function POST(request: Request) {
  let cleanup: (() => Promise<void>) | undefined;
  const runCleanup = () => {
    const current = cleanup;
    cleanup = undefined;
    return current?.().catch(() => {});
  };

  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const body = (await request.json().catch(() => null)) as {
      sessionId?: unknown;
    } | null;
    const sessionId = body?.sessionId;
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      return NextResponse.json(
        { error: "Missing sessionId." },
        { status: 400 },
      );
    }

    const archive = await exportWorkspaceArchive(sessionId);
    cleanup = archive.cleanup;
    const stream = Readable.toWeb(archive.stream) as ReadableStream;
    archive.stream.on("close", () => {
      void runCleanup();
    });
    archive.stream.on("error", () => {
      void runCleanup();
    });

    return new Response(stream, {
      headers: {
        "Content-Type": archive.contentType,
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to download Xulux workspace archive", error);
    await runCleanup();
    return NextResponse.json(
      { error: "Failed to download workspace." },
      { status: 500 },
    );
  }
}
