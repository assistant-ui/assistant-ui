import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import type {
  MessagePartRuntime,
  MessagePartState,
} from "../../runtime/api/message-part-runtime";
import { MessagePartClient } from "./message-part-runtime-client";

describe("MessagePartClient", () => {
  it("omits recording when the runtime does not provide it", () => {
    const state: MessagePartState = {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "weather",
      args: {},
      argsText: "{}",
      status: { type: "complete" },
    };
    const runtime: MessagePartRuntime = {
      path: {
        ref: "threads.main.messages[0].content[0]",
        threadSelector: { type: "main" },
        messageSelector: { type: "index", index: 0 },
        messagePartSelector: { type: "index", index: 0 },
      },
      getState: () => state,
      subscribe: () => () => {},
      addToolResult: () => {},
      resumeToolCall: () => {},
      respondToToolApproval: async () => {},
    };
    const root = createTapRoot(function MessagePartClientRoot() {
      return useResource(MessagePartClient({ runtime }));
    });

    try {
      expect(root.getValue().unstable_recordInteraction).toBeUndefined();
    } finally {
      root.unmount();
    }
  });
});
