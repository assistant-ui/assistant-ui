import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../types";
import { auiV0Encode } from "../legacy-runtime/cloud/auiV0";

describe("auiV0Encode", () => {
  it("rejects component message parts", () => {
    const message: ThreadMessage = {
      id: "assistant-1",
      createdAt: new Date("2026-02-14T00:00:00.000Z"),
      role: "assistant",
      content: [
        {
          type: "component",
          name: "status-chip",
          props: { label: "Ready" },
        },
      ],
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };

    expect(() => auiV0Encode(message)).toThrow(
      "Message part type not supported by aui/v0: component",
    );
  });
});
