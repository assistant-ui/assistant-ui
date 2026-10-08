import { useState } from "react";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import type { ThreadAssistantMessage } from "../../types/message";
import { ThreadMessageClient } from "./thread-message-client";

describe("ThreadMessageClient", () => {
  it("keeps a part client with its id when parts swap", () => {
    const initial: ThreadAssistantMessage = {
      id: "message-1",
      role: "assistant",
      createdAt: new Date(0),
      content: [
        { type: "text", id: "p1", text: "first" },
        { type: "text", id: "p2", text: "second" },
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
    let setMessage!: (message: ThreadAssistantMessage) => void;
    const root = createTapRoot(function ThreadMessageRoot() {
      const [message, setValue] = useState(initial);
      setMessage = setValue;
      return useResource(ThreadMessageClient({ message, index: 0 }));
    });

    try {
      const first = root.getValue().part({ index: 0 });
      flushTapSync(() =>
        setMessage({
          ...initial,
          content: [
            { type: "text", id: "p2", text: "second streamed" },
            { type: "text", id: "p1", text: "first streamed" },
          ],
        }),
      );
      expect(root.getValue().part({ index: 1 })).toBe(first);
      expect(first.getState()).toMatchObject({ text: "first streamed" });
    } finally {
      root.unmount();
    }
  });

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

  it("resolves interaction recording for historical messages", async () => {
    const message: ThreadAssistantMessage = {
      id: "message-1",
      role: "assistant",
      createdAt: new Date(0),
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "weather",
          args: {},
          argsText: "{}",
        },
        {
          type: "tool-call",
          toolCallId: "call-2",
          toolName: "weather",
          args: { city: "Tokyo" },
          argsText: '{"city":"Tokyo"}',
        },
        {
          type: "tool-call",
          toolCallId: "call-3",
          toolName: "weather",
          args: { city: "Paris" },
          argsText: '{"city":"Paris"}',
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
    const root = createTapRoot(function ThreadMessageRoot() {
      return useResource(ThreadMessageClient({ message, index: 0 }));
    });

    try {
      expect(root.getValue().part({ toolCallId: "call-1" }).getState()).toEqual(
        root.getValue().part({ index: 0 }).getState(),
      );
      for (const [index, part] of message.content.entries()) {
        if (part.type !== "tool-call") throw new Error("expected tool call");
        const state = root
          .getValue()
          .part({ toolCallId: part.toolCallId })
          .getState();
        expect(state).toMatchObject(part);
        expect(state).toEqual(root.getValue().part({ index }).getState());
      }
      await expect(
        root.getValue().part({ index: 0 }).unstable_recordInteraction!({
          type: "action",
          payload: {},
        }),
      ).resolves.toBeUndefined();
    } finally {
      root.unmount();
    }
  });
});
