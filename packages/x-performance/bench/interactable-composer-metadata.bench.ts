import { bench, describe } from "vitest";
import { unstable_getInteractableVersions } from "@assistant-ui/core";

const sizes = [1_000, 5_000];

const makeMessages = (size: number) =>
  [
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "item-0",
          toolName: "note",
          args: {
            items: Array.from({ length: size }, (_, i) => ({
              id: `item-${i}`,
              value: i,
            })),
          },
        },
      ],
    },
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: `update-${size}`,
          toolName: "update_note",
          args: {
            id: "item-0",
            items: {
              update: Array.from({ length: size }, (_, i) => ({
                id: `item-${i}`,
                value: i + 1,
              })),
            },
          },
        },
      ],
    },
  ] as const;

describe("core: ID-keyed interactable array updates", () => {
  for (const size of sizes) {
    const messages = makeMessages(size);
    bench(`${size} items and patches`, () => {
      unstable_getInteractableVersions([...messages], "item-0", "note");
    });
  }
});
