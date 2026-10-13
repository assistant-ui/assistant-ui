// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
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
  vi.unstubAllGlobals();
});

describe("useExternalStoreRuntime cancel", () => {
  it.each([
    { source: "messages", refreshAfterVote: false },
    { source: "messages", refreshAfterVote: true },
    { source: "messageRepository", refreshAfterVote: true },
  ] as const)(
    "keeps an immediate send after stopping a rated reply with $source (host refresh: $refreshAfterVote)",
    async ({ source, refreshAfterVote }) => {
      const probe = {} as {
        runtime: AssistantRuntime;
        messages: readonly ThreadMessage[];
      };
      let refreshHost!: () => void;
      let replaceHostMessages!: (messages: readonly ThreadMessage[]) => void;
      const setHostMessages = vi.fn((messages: readonly ThreadMessage[]) =>
        replaceHostMessages(messages),
      );
      let sent!: () => void;
      const onNewCalled = new Promise<void>((resolve) => {
        sent = resolve;
      });
      const Host = () => {
        const [messages, setMessages] = useState<readonly ThreadMessage[]>([
          message("u0", "user"),
          message("a0", "assistant"),
        ]);
        refreshHost = () => setMessages((current) => [...current]);
        replaceHostMessages = setMessages;
        probe.messages = messages;
        probe.runtime = useExternalStoreRuntime<ThreadMessage>({
          ...(source === "messages"
            ? { messages }
            : {
                messageRepository: {
                  messages: messages.map((message, index) => ({
                    message,
                    parentId: messages[index - 1]?.id ?? null,
                  })),
                },
              }),
          setMessages: setHostMessages,
          onNew: async () => {
            setMessages((current) => [...current, message("u1", "user")]);
            sent();
          },
          onCancel: async () => {},
          adapters: { feedback: { submit: vi.fn() } },
        });
        return null;
      };
      render(<Host />);

      probe.runtime.thread
        .getMessageById("a0")
        .submitFeedback({ type: "positive" });
      if (refreshAfterVote) act(refreshHost);
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);
      vi.useFakeTimers({ toFake: ["setTimeout"] });
      probe.runtime.thread.cancelRun();
      probe.runtime.thread.append("hello");
      await onNewCalled;
      vi.runAllTimers();
      vi.useRealTimers();

      await waitFor(() =>
        expect(
          probe.runtime.thread.getState().messages.map((m) => m.id),
        ).toEqual(["u0", "a0", "u1"]),
      );
      expect(probe.messages.map((m) => m.id)).toEqual(["u0", "a0", "u1"]);
      expect(setHostMessages).not.toHaveBeenCalled();
    },
  );

  it("keeps a message sent right after a programmatic stop", async () => {
    const probe = {} as {
      runtime: AssistantRuntime;
      messages: readonly ThreadMessage[];
    };
    let sent!: () => void;
    const onNewCalled = new Promise<void>((resolve) => {
      sent = resolve;
    });
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
          sent();
        },
        onCancel: async () => {},
      });
      return null;
    };
    render(<Host />);

    // The resync timer fires before React delivers the host's new messages,
    // and act would deliver them first, so this runs outside act.
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    probe.runtime.thread.cancelRun();
    probe.runtime.thread.append("hello");
    await onNewCalled;
    vi.runAllTimers();
    vi.useRealTimers();

    await waitFor(() =>
      expect(probe.runtime.thread.getState().messages.map((m) => m.id)).toEqual(
        ["u0", "a0", "u1"],
      ),
    );
    expect(probe.messages.map((m) => m.id)).toEqual(["u0", "a0", "u1"]);
  });

  it("keeps a message sent right after a programmatic stop that takes the unanswered message back", async () => {
    const probe = {} as {
      runtime: AssistantRuntime;
      messages: readonly ThreadMessage[];
    };
    let sent!: () => void;
    const onNewCalled = new Promise<void>((resolve) => {
      sent = resolve;
    });
    const Host = () => {
      const [messages, setMessages] = useState<readonly ThreadMessage[]>([
        message("u0", "user"),
        message("a0", "assistant"),
        message("u1", "user"),
      ]);
      const [isRunning, setIsRunning] = useState(true);
      probe.messages = messages;
      probe.runtime = useExternalStoreRuntime<ThreadMessage>({
        messages,
        isRunning,
        setMessages,
        onNew: async () => {
          setMessages((current) => [...current, message("u2", "user")]);
          sent();
        },
        onCancel: async () => {
          setIsRunning(false);
        },
      });
      return null;
    };
    render(<Host />);

    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    probe.runtime.thread.cancelRun();
    probe.runtime.thread.append("hello");
    await onNewCalled;
    vi.runAllTimers();
    vi.useRealTimers();

    await waitFor(() =>
      expect(probe.runtime.thread.getState().messages.map((m) => m.id)).toEqual(
        ["u0", "a0", "u2"],
      ),
    );
    expect(probe.messages.map((m) => m.id)).toEqual(["u0", "a0", "u2"]);
    expect(probe.runtime.thread.composer.getState().text).toBe("u1");
  });
});
