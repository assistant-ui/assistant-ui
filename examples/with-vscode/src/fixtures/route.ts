import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { playFixture } from "./fixtures";
import { fixtureStepsFor } from "./request";

export async function POST(req: Request): Promise<Response> {
  const steps = await fixtureStepsFor(req);
  // A call the fixture answers runs on the server; the rest wait for the client.
  const serverToolCalls = new Set(
    steps.flatMap((s) =>
      s.type === "tool-call" && s.result !== undefined ? [s.toolCallId] : [],
    ),
  );

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let open: { kind: "text" | "reasoning"; id: string } | undefined;
      const closeOpen = () => {
        if (open === undefined) return;
        writer.write({ type: `${open.kind}-end`, id: open.id });
        open = undefined;
      };
      const openPart = (kind: "text" | "reasoning", id: string) => {
        if (open?.id === id) return;
        closeOpen();
        open = { kind, id };
        writer.write({ type: `${kind}-start`, id });
      };

      writer.write({ type: "start-step" });
      for await (const event of playFixture(steps, { signal: req.signal })) {
        switch (event.type) {
          case "text-delta":
            openPart("text", event.id);
            writer.write({
              type: "text-delta",
              id: event.id,
              delta: event.delta,
            });
            break;
          case "reasoning-delta":
            openPart("reasoning", event.id);
            writer.write({
              type: "reasoning-delta",
              id: event.id,
              delta: event.delta,
            });
            break;
          case "tool-call":
            closeOpen();
            writer.write({
              type: "tool-input-available",
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              input: event.args,
              providerExecuted: serverToolCalls.has(event.toolCallId),
            });
            break;
          case "tool-result":
            writer.write(
              event.isError
                ? {
                    type: "tool-output-error",
                    toolCallId: event.toolCallId,
                    errorText:
                      typeof event.result === "string"
                        ? event.result
                        : JSON.stringify(event.result),
                    providerExecuted: true,
                  }
                : {
                    type: "tool-output-available",
                    toolCallId: event.toolCallId,
                    output: event.result,
                    providerExecuted: true,
                  },
            );
            break;
          case "source":
            closeOpen();
            writer.write({
              type: "source-url",
              sourceId: event.id,
              url: event.url,
              ...(event.title !== undefined && { title: event.title }),
            });
            break;
          case "file":
            closeOpen();
            writer.write({
              type: "file",
              url: event.data,
              mediaType: event.mediaType,
            });
            break;
          case "data":
            closeOpen();
            writer.write({ type: `data-${event.name}`, data: event.data });
            break;
          case "error":
            closeOpen();
            writer.write({ type: "error", errorText: event.message });
            return;
        }
      }
      closeOpen();
      writer.write({ type: "finish-step" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
