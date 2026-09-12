import { unstable_getInteractableVersions } from "@assistant-ui/core";
import { describe, test } from "vitest";

const makeMessages = (size: number) => {
  const items = Array.from({ length: size }, (_, index) => ({
    id: `item-${index}`,
    value: 0,
  }));
  const patches = Array.from({ length: size }, (_, index) => ({
    id: `item-${index}`,
    value: 1,
  }));

  return [
    {
      role: "user",
      metadata: {
        custom: {
          interactables: [{ id: "board", name: "board", state: { items } }],
        },
      },
    },
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "update-1",
          toolName: "update_board",
          args: { id: "board", items: { update: patches } },
          result: { success: true },
        },
      ],
    },
  ];
};

describe("core: id-keyed interactable array patches", () => {
  for (const size of [1_000, 5_000]) {
    const messages = makeMessages(size);

    test(`${size} items and patches`, async ({ bench }) => {
      await bench(`${size} items and patches`, () => {
        unstable_getInteractableVersions([...messages], "board", "board");
      }).run();
    });
  }
});
