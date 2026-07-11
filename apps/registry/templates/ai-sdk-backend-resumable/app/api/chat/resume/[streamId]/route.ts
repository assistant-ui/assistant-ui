import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";
import { resumableContext } from "@/lib/resumable-context";

export async function GET(
  _req: Request,
  context: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await context.params;
  const stream = await resumableContext.resume(streamId);

  if (!stream) {
    return new Response(JSON.stringify({ error: "stream not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(stream, {
    headers: {
      ...UI_MESSAGE_STREAM_HEADERS,
      [RESUMABLE_STREAM_ID_HEADER]: streamId,
    },
  });
}
