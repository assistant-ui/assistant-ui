import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import type { ThreadAssistantMessage } from "../../types/message";
import { ThreadMessageClient } from "./thread-message-client";

describe("ThreadMessageClient", () => {
  const getPartStatus = (
    part: ThreadAssistantMessage["content"][number],
    status: ThreadAssistantMessage["status"],
  ) => {
    const message: ThreadAssistantMessage = {
      id: "message-1",
      role: "assistant",
      createdAt: new Date(0),
      content: [part],
      status,
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
      return root.getValue().getState().parts[0]?.status;
    } finally {
      root.unmount();
    }
  };

  it("preserves a running part status on a running detached message", () => {
    const part = {
      type: "text",
      text: "done",
      status: { type: "running" },
    } as unknown as ThreadAssistantMessage["content"][number];

    expect(getPartStatus(part, { type: "running" })).toEqual({
      type: "running",
    });
  });

  it("normalizes an unknown incomplete reason on a running detached message", () => {
    const part = {
      type: "text",
      text: "done",
      status: { type: "incomplete", reason: "unknown" },
    } as unknown as ThreadAssistantMessage["content"][number];

    expect(getPartStatus(part, { type: "running" })).toEqual({
      type: "incomplete",
      reason: "other",
    });
  });

  it("normalizes an upstream complete reason on a running detached message", () => {
    const part = {
      type: "text",
      text: "done",
      status: { type: "complete", reason: "unknown" },
    } as unknown as ThreadAssistantMessage["content"][number];

    expect(getPartStatus(part, { type: "running" })).toEqual({
      type: "complete",
    });
  });

  it("marks parts complete on a non-running detached message", () => {
    const part = {
      type: "text",
      text: "done",
      status: { type: "running" },
    } as unknown as ThreadAssistantMessage["content"][number];

    expect(getPartStatus(part, { type: "complete", reason: "stop" })).toEqual({
      type: "complete",
    });
  });
});
