import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import type { ThreadAssistantMessage } from "../../types/message";
import { ThreadMessageClient } from "./thread-message-client";

describe("ThreadMessageClient", () => {
  it("normalizes an upstream complete reason on a running detached message", () => {
    const part = {
      type: "text",
      text: "done",
      status: { type: "complete", reason: "unknown" },
    } as unknown as ThreadAssistantMessage["content"][number];
    const message: ThreadAssistantMessage = {
      id: "message-1",
      role: "assistant",
      createdAt: new Date(0),
      content: [part],
      status: { type: "running" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    const root = createTapRoot(function ThreadMessageRoot() {
      return useResource(ThreadMessageClient({ message, index: 0 }));
    });

    try {
      expect(root.getValue().getState().parts[0]?.status).toEqual({
        type: "complete",
      });
    } finally {
      root.unmount();
    }
  });
});
