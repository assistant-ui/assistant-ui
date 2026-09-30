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
      let openText: string | undefined;
      const closeText = () => {
        if (openText === undefined) return;
        writer.write({ type: "text-end", id: openText });
        openText = undefined;
      };

      writer.write({ type: "start-step" });
      for await (const event of playFixture(steps, { signal: req.signal })) {
        switch (event.type) {
          case "text-delta":
            if (openText !== event.id) {
              closeText();
              openText = event.id;
              writer.write({ type: "text-start", id: event.id });
            }
            writer.write({
              type: "text-delta",
              id: event.id,
              delta: event.delta,
            });
            break;
          case "tool-call":
            closeText();
            writer.write({
              type: "tool-input-available",
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              input: event.args,
              providerExecuted: serverToolCalls.has(event.toolCallId),
            });
            break;
          case "tool-result":
            writer.write({
              type: "tool-output-available",
              toolCallId: event.toolCallId,
              output: event.result,
              providerExecuted: true,
            });
            break;
          case "error":
            closeText();
            writer.write({ type: "error", errorText: event.message });
            return;
        }
      }
      closeText();
      writer.write({ type: "finish-step" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
