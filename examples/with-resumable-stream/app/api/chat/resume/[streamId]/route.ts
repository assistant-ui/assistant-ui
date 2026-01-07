import { JsonToSseTransformStream, createUIMessageStream } from "ai";
import { getStreamContext } from "../../route";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;

  const streamContext = getStreamContext();

  if (!streamContext) {
    return new Response(
      JSON.stringify({ error: "Resumable streams not available" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const emptyStream = createUIMessageStream({
    execute: () => {},
  });

  try {
    const stream = await streamContext.resumableStream(streamId, () =>
      emptyStream.pipeThrough(new JsonToSseTransformStream()),
    );

    if (!stream) {
      return new Response(
        JSON.stringify({ error: "Stream not found or completed" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Stream-Id": streamId,
      },
    });
  } catch (error) {
    console.error("Failed to resume stream:", error);
    const errorMessage =
      error instanceof Error && error.message.includes("timeout")
        ? "Redis connection timeout - ensure Redis is running"
        : "Failed to resume stream";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
