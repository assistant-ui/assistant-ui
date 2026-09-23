// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../types/message";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

const message = (id: string, role: "user" | "assistant"): ThreadMessage =>
  ({
    id,
    role,
    createdAt: new Date(0),
    content: [{ type: "text", text: id }],
    attachments: [],
    status:
      role === "assistant" ? { type: "complete", reason: "stop" } : undefined,
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useExternalStoreRuntime cancel", () => {
  it("keeps a message sent right after a programmatic stop", async () => {
    const probe = {} as {
      runtime: AssistantRuntime;
      messages: readonly ThreadMessage[];
    };
    const Host = () => {
      const [messages, setMessages] = useState<readonly ThreadMessage[]>([
        message("u0", "user"),
        message("a0", "assistant"),
      ]);
      probe.messages = messages;
      probe.runtime = useExternalStoreRuntime<ThreadMessage>({
        messages,
        setMessages,
        onNew: async () => {
          setMessages((current) => [...current, message("u1", "user")]);
        },
        onCancel: async () => {},
      });
      return null;
    };
    render(<Host />);

    // The resync timer fires before React delivers the host's new messages.
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    probe.runtime.thread.cancelRun();
    probe.runtime.thread.append("hello");
    await Promise.resolve();
    vi.runAllTimers();
    vi.useRealTimers();

    await waitFor(() =>
      expect(probe.runtime.thread.getState().messages.map((m) => m.id)).toEqual(
        ["u0", "a0", "u1"],
      ),
    );
    expect(probe.messages.map((m) => m.id)).toEqual(["u0", "a0", "u1"]);
  });
});
