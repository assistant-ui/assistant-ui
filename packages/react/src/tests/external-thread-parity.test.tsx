// @vitest-environment jsdom

// Legacy-runtime parity: part statuses derive from the message status, and
// imperative composer call sequences observe writes before React re-renders.

import { render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect, vi } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  ExternalThread,
  type ExternalThreadProps,
  type ExternalThreadMessage,
} from "../client/ExternalThread";

const renderThread = (props: ExternalThreadProps) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ threadProps: ExternalThreadProps }> = ({ threadProps }) => {
    const aui = useAui({ thread: ExternalThread(threadProps) });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  const utils = render(<App threadProps={props} />);
  return {
    aui: () => captured.aui!,
    rerender: (next: ExternalThreadProps) =>
      utils.rerender(<App threadProps={next} />),
  };
};

const assistantMessageWithContent = (
  status: ThreadMessage["status"],
  content: ExternalThreadMessage["content"],
  id = "a1",
): ExternalThreadMessage =>
  ({
    id,
    role: "assistant",
    content,
    createdAt: new Date(0),
    status,
    metadata: { custom: {} },
  }) as unknown as ExternalThreadMessage;

const assistantMessage = (
  status: ThreadMessage["status"],
  result?: string,
): ExternalThreadMessage =>
  assistantMessageWithContent(status, [
    { type: "text", text: "let me check" },
    {
      type: "tool-call",
      toolCallId: "tc1",
      toolName: "probe_tool",
      args: {},
      argsText: "{}",
      ...(result !== undefined && { result }),
    },
  ]);

describe("ExternalThread part status", () => {
  it("gives an unresolved tool call its message's status", () => {
    const { aui } = renderThread({
      messages: [assistantMessage({ type: "running" })],
      isRunning: true,
    });
    const part = (toolCallId: string) =>
      aui().thread.message({ id: "a1" }).part({ toolCallId }).getState();
    expect(part("tc1").status).toEqual({ type: "running" });
  });

  it("uses positional fallback for statusless parts and resolved tool calls", () => {
    const { aui } = renderThread({
      messages: [
        assistantMessage({ type: "running" }, "ok"),
        assistantMessageWithContent(
          { type: "running" },
          [
            { type: "text", text: "first" },
            { type: "reasoning", text: "last" },
          ],
          "a2",
        ),
      ],
      isRunning: true,
    });
    const state = aui().thread.message({ id: "a1" }).getState();
    expect(state.parts[0]!.status).toEqual({ type: "complete" });
    expect(state.parts[1]!.status).toEqual({ type: "complete" });
    const fallbackState = aui().thread.message({ id: "a2" }).getState();
    expect(fallbackState.parts[0]!.status).toEqual({ type: "complete" });
    expect(fallbackState.parts[1]!.status).toEqual({ type: "running" });
  });

  it("honours supplied statuses while the message is running", () => {
    const { aui } = renderThread({
      messages: [
        assistantMessageWithContent({ type: "running" }, [
          { type: "text", text: "first", status: { type: "running" } },
          {
            type: "reasoning",
            text: "last",
            status: { type: "complete" },
          },
        ]),
      ],
      isRunning: true,
    });
    const state = aui().thread.message({ id: "a1" }).getState();

    expect(state.parts[0]!.status).toEqual({ type: "running" });
    expect(state.parts[1]!.status).toEqual({ type: "complete" });
  });

  it("ignores supplied statuses after the message completes", () => {
    const { aui } = renderThread({
      messages: [
        assistantMessageWithContent({ type: "complete", reason: "stop" }, [
          { type: "text", text: "truncated", status: { type: "running" } },
        ]),
      ],
      isRunning: false,
    });

    expect(
      aui().thread.message({ id: "a1" }).part({ index: 0 }).getState().status,
    ).toEqual({ type: "complete", reason: "stop" });
  });

  it("normalizes supplied upstream statuses", () => {
    const { aui } = renderThread({
      messages: [
        assistantMessageWithContent(
          { type: "running" },
          // assistant-stream sends shapes core's MessagePartStatus does not
          // declare (a reason on complete, an unlisted incomplete reason);
          // the normalizer absorbs them.
          [
            {
              type: "text",
              text: "done",
              status: { type: "complete", reason: "unknown" },
            },
            {
              type: "reasoning",
              text: "interrupted",
              status: {
                type: "incomplete",
                reason: "unknown",
                error: "upstream error",
              },
            },
          ] as unknown as ExternalThreadMessage["content"],
        ),
      ],
      isRunning: true,
    });
    const state = aui().thread.message({ id: "a1" }).getState();

    expect(state.parts[0]!.status).toEqual({ type: "complete" });
    expect(state.parts[1]!.status).toEqual({
      type: "incomplete",
      reason: "other",
    });
  });

  it("keeps parts complete on requires-action and user messages", () => {
    const { aui } = renderThread({
      messages: [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "hi" }],
          createdAt: new Date(0),
          attachments: [],
          metadata: { custom: {} },
        } as unknown as ExternalThreadMessage,
        assistantMessage({ type: "requires-action", reason: "tool-calls" }),
      ],
      isRunning: false,
    });
    expect(
      aui().thread.message({ id: "u1" }).part({ index: 0 }).getState().status,
    ).toEqual({ type: "complete" });
    expect(
      aui()
        .thread()
        .message({ id: "a1" })
        .part({ toolCallId: "tc1" })
        .getState().status,
    ).toEqual({ type: "requires-action", reason: "tool-calls" });
    expect(
      aui().thread.message({ id: "a1" }).part({ index: 0 }).getState().status,
    ).toEqual({ type: "complete" });
  });
});

describe("ExternalThread unset optional callbacks", () => {
  it("throws a capability error when the callback prop is not set", () => {
    const { aui } = renderThread({
      messages: [
        assistantMessage({ type: "requires-action", reason: "tool-calls" }),
      ],
      isRunning: false,
    });
    const part = () =>
      aui().thread.message({ id: "a1" }).part({ toolCallId: "tc1" });

    expect(() => part().addToolResult("ok")).toThrow(
      "Runtime does not support tool results (onAddToolResult is not set).",
    );
    expect(() => part().resumeToolCall(undefined)).toThrow(
      "Runtime does not support resuming tool calls (onResumeToolCall is not set).",
    );
    expect(() => aui().thread.resumeRun()).toThrow(
      "Runtime does not support resuming runs (onResume is not set).",
    );
    expect(() => aui().thread.importExternalState({})).toThrow(
      "Runtime does not support importing external states (onLoadExternalState is not set).",
    );
  });
});

describe("ExternalThread composer", () => {
  it("dispatches a synchronous setText + send sequence", async () => {
    const onNew = vi.fn();
    const { aui } = renderThread({ messages: [], isRunning: false, onNew });

    aui().thread.composer().setText("hello");
    aui().thread.composer().send();

    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    expect(onNew.mock.calls[0]![0].content).toEqual([
      { type: "text", text: "hello" },
    ]);
    await waitFor(() => expect(aui().thread.getState().composer.text).toBe(""));
  });

  it("stamps the thread head as parentId on queue-adapter sends", async () => {
    const enqueue = vi.fn();
    const { aui } = renderThread({
      messages: [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "hi" }],
          createdAt: new Date(0),
          attachments: [],
          metadata: { custom: {} },
        } as unknown as ExternalThreadMessage,
      ],
      isRunning: true,
      queue: {
        items: [],
        enqueue,
        steer: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
      },
    });

    aui().thread.composer().setText("queued");
    aui().thread.composer().send();

    await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(1));
    expect(enqueue.mock.calls[0]![0].parentId).toBe("u1");
  });

  it("still refuses to send an empty composer synchronously after a send", async () => {
    const onNew = vi.fn();
    const { aui } = renderThread({ messages: [], isRunning: false, onNew });

    aui().thread.composer().send();
    aui().thread.composer().setText("first");
    aui().thread.composer().send();
    aui().thread.composer().send();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});

describe("ExternalThread duplicate message ids", () => {
  const userMessage = (id: string, text: string): ExternalThreadMessage =>
    ({
      id,
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(0),
      metadata: { custom: {} },
    }) as unknown as ExternalThreadMessage;

  it("warns and keeps the last occurrence instead of throwing on a duplicate id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { aui } = renderThread({
        messages: [
          userMessage("u1", "hi"),
          userMessage("dup", "stale"),
          userMessage("dup", "fresh"),
        ],
      });

      const state = aui().thread.getState();
      expect(state.messages.map((m) => m.id)).toEqual(["u1", "dup"]);

      const dup = aui().thread.message({ id: "dup" }).getState();
      expect(dup.parts[0]).toMatchObject({ type: "text", text: "fresh" });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"dup"'));
    } finally {
      warn.mockRestore();
    }
  });
});
