import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { exportWorkspaceArchive } from "../blaxel-sandbox";

export const maxDuration = 120;

export async function POST(request: Request) {
  let cleanup: (() => Promise<void>) | undefined;
  try {
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
      void cleanup?.();
      cleanup = undefined;
    });
    archive.stream.on("error", () => {
      void cleanup?.();
      cleanup = undefined;
    });

    return new Response(stream, {
      headers: {
        "Content-Type": archive.contentType,
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await cleanup?.().catch(() => {});
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
