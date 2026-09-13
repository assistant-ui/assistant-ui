import { test, describe } from "vitest";
import { fromThreadMessageLike } from "@assistant-ui/react";
import { projectConversationMap } from "./conversation-map-projection";

const message = (index: number, text: string) =>
  fromThreadMessageLike(
    { role: index % 2 ? "assistant" : "user", content: text },
    String(index),
    { type: "complete", reason: "stop" },
  );

describe.each([1000, 5000])("conversation map with %i messages", (length) => {
  const messages = Array.from({ length }, (_, i) => message(i, `Message ${i}`));
  const updates = ["First token", "Second token"].map((text) => [
    ...messages.slice(0, -1),
    message(length - 1, text),
  ]);
  for (const update of updates) projectConversationMap(update);

  let fullIndex = 0;
  test("full projection with cached summaries", async ({ bench }) => {
    await bench("full projection with cached summaries", () => {
      projectConversationMap(updates[fullIndex++ % updates.length]!);
    }).run();
  });

  let tailIndex = 0;
  let previous = projectConversationMap(messages);
  test("tail projection with cached summaries", async ({ bench }) => {
    await bench("tail projection with cached summaries", () => {
      previous = projectConversationMap(
        updates[tailIndex++ % updates.length]!,
        previous,
      );
    }).run();
  });
});
