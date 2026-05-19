import type { ThreadMessageLike } from "@assistant-ui/react";

const assistantParagraphs = [
  "This seeded assistant response is intentionally tall enough to make the viewport overflow. It gives the initial scroll code real layout work to do after messages commit.",
  "The repro keeps the rendering primitive and headless so the diagnosis can focus on ThreadPrimitive.Viewport rather than a themed thread wrapper.",
  "When this page opens correctly, the final seeded turn should be visible immediately at the bottom of the scroll container.",
  "When it fails, the first seeded turn remains visible and the diagnostics report scrollTop near zero.",
];

const userPrompts = [
  "Open the existing chat history.",
  "Keep the viewport pinned to the latest turn.",
  "Check whether initial messages are visible from the bottom.",
  "Report the scroll metrics after mount.",
];

const repeat = (value: string, count: number) =>
  Array.from({ length: count }, () => value).join("\n\n");

export const makeIssue4009Messages = (
  sessionId = "initial",
): ThreadMessageLike[] => {
  return Array.from({ length: 48 }, (_, index): ThreadMessageLike => {
    const turn = Math.floor(index / 2) + 1;

    if (index % 2 === 0) {
      return {
        id: `issue-4009-${sessionId}-user-${turn}`,
        role: "user",
        content: `${userPrompts[turn % userPrompts.length]} Turn ${turn}.`,
      };
    }

    const paragraph = assistantParagraphs[turn % assistantParagraphs.length];
    return {
      id: `issue-4009-${sessionId}-assistant-${turn}`,
      role: "assistant",
      content: repeat(`Assistant turn ${turn}. ${paragraph}`, 2 + (turn % 3)),
      status: { type: "complete", reason: "stop" },
    };
  });
};
