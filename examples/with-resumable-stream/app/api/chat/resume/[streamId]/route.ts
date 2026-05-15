import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";
import { getResumableStreamContext } from "@/lib/resumable-context";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  context: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await context.params;
  const ctx = await getResumableStreamContext();
  const stream = await ctx.resume(streamId);

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
