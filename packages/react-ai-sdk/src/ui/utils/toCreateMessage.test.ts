import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { toCreateMessage } from "./toCreateMessage";

const baseMessage = {
  role: "user",
  parentId: null,
  sourceId: null,
  runConfig: undefined,
  metadata: undefined,
} as const;

describe("toCreateMessage", () => {
  it("converts a data part in message content into a data-<name> part", () => {
    const message = {
      ...baseMessage,
      content: [{ type: "data", name: "workflow", data: { field: 1 } }],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      { type: "data-workflow", data: { field: 1 } },
    ]);
  });

  it("converts a data part inside an attachment without throwing", () => {
    const message = {
      ...baseMessage,
      content: [],
      attachments: [
        {
          id: "some-id",
          type: "document",
          name: "some-name",
          status: { type: "complete" },
          content: [
            {
              type: "data",
              name: "some-content-name",
              data: { field: 1 },
            },
          ],
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      { type: "data-some-content-name", data: { field: 1 } },
    ]);
  });
});
