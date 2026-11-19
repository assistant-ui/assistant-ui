// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import type { HttpAgent } from "@ag-ui/client";
import { z } from "zod";
import { useAgUiRuntime } from "./useAgUiRuntime";

type Subscriber = Record<string, ((payload: any) => void) | undefined>;

const flush = () =>
  act(async () => void (await new Promise((r) => setTimeout(r, 0))));

const send = (subscriber: Subscriber, event: Record<string, unknown>) => {
  const name = `on${String(event.type)
    .toLowerCase()
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join("")}Event`;
  subscriber[name]?.({ event });
};

const reason = (subscriber: Subscriber, id: string, text: string) => {
  send(subscriber, { type: "REASONING_START", messageId: id });
  send(subscriber, { type: "REASONING_MESSAGE_START", messageId: id });
  if (text)
    send(subscriber, {
      type: "REASONING_MESSAGE_CONTENT",
      messageId: id,
      delta: text,
    });
  send(subscriber, { type: "REASONING_MESSAGE_END", messageId: id });
  send(subscriber, {
    type: "REASONING_ENCRYPTED_VALUE",
    subtype: "message",
    entityId: id,
    encryptedValue: `sig-${id}`,
  });
  send(subscriber, { type: "REASONING_END", messageId: id });
};

const say = (subscriber: Subscriber, id: string, text: string) => {
  send(subscriber, { type: "TEXT_MESSAGE_START", messageId: id });
  send(subscriber, {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: id,
    delta: text,
  });
  send(subscriber, { type: "TEXT_MESSAGE_END", messageId: id });
};

const call = (
  subscriber: Subscriber,
  id: string,
  name: string,
  parent: string,
  args: string,
) => {
  send(subscriber, {
    type: "TOOL_CALL_START",
    toolCallId: id,
    toolCallName: name,
    parentMessageId: parent,
  });
  send(subscriber, { type: "TOOL_CALL_ARGS", toolCallId: id, delta: args });
  send(subscriber, { type: "TOOL_CALL_END", toolCallId: id });
};

// The shape the backend rebuilds its history from: record order, roles, and
// the reasoning payloads it must get back exactly.
const shape = (messages: any[]) =>
  messages.map((message) => {
    if (message.role === "reasoning")
      return `reasoning:${message.id}:${message.content}:${message.encryptedValue ?? ""}`;
    if (message.role === "assistant")
      return `assistant:${message.content ?? ""}:${(message.toolCalls ?? [])
        .map((c: any) => c.id)
        .join(",")}`;
    if (message.role === "tool") return `tool:${message.toolCallId}`;
    return `${message.role}:${typeof message.content === "string" ? message.content : ""}`;
  });

afterEach(() => cleanup());

describe("useAgUiRuntime concat-content round-trip", () => {
  it.each([true, false])(
    "replays every step in arrival order across a frontend tool pause (showThinking=%s)",
    async (showThinking) => {
      const runAgent = vi.fn(
        async (_input: unknown, subscriber: Subscriber) => {
          const run = runAgent.mock.calls.length;
          send(subscriber, { type: "RUN_STARTED", runId: `run-${run}` });
          if (run === 1) {
            // Step 1: signed reasoning, prose, a backend tool and its result.
            reason(subscriber, "r1", "Look it up.");
            say(subscriber, "m1", "Checking.");
            call(subscriber, "tc-1", "lookup", "m1", '{"q":"a"}');
            send(subscriber, {
              type: "TOOL_CALL_RESULT",
              messageId: "tool-1",
              toolCallId: "tc-1",
              content: "found",
            });
            // Step 2: a redacted block (no text) and a frontend tool.
            reason(subscriber, "r2", "");
            call(subscriber, "tc-2", "confirm", "m2", '{"ok":true}');
          } else if (run === 2) {
            // Step 3: reasoning and the final answer.
            reason(subscriber, "r3", "Done.");
            say(subscriber, "m3", "All set.");
          } else {
            say(subscriber, "m4", "Sure.");
          }
          send(subscriber, { type: "RUN_FINISHED", runId: `run-${run}` });
          subscriber.onRunFinalized?.(undefined);
        },
      );
      const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;

      const ConfirmTool = () => {
        useAssistantTool({
          toolName: "confirm",
          description: "confirm",
          parameters: z.object({ ok: z.boolean() }),
          execute: async () => "confirmed",
        });
        return null;
      };

      const { result } = renderHook(() =>
        useAgUiRuntime({
          agent,
          joinStrategy: "concat-content",
          showThinking,
        }),
      );
      render(
        <AssistantRuntimeProvider runtime={result.current}>
          <ConfirmTool />
        </AssistantRuntimeProvider>,
      );
      await flush();

      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text: "go" }],
        });
      });
      for (let i = 0; i < 5; i++) await flush();

      expect(runAgent).toHaveBeenCalledTimes(2);
      const resumed = runAgent.mock.calls[1]![0] as { messages: any[] };
      const step1 = [
        showThinking
          ? "reasoning:r1:Look it up.:sig-r1"
          : "reasoning:r1::sig-r1",
      ];
      expect(shape(resumed.messages)).toEqual([
        "user:go",
        ...step1,
        "assistant:Checking.:tc-1",
        "tool:tc-1",
        "reasoning:r2::sig-r2",
        "assistant::tc-2",
        "tool:tc-2",
      ]);

      expect(
        resumed.messages
          .filter((message) => message.role !== "user")
          .map((message) =>
            message.role === "tool"
              ? [message.id, message.content]
              : message.role === "assistant"
                ? [
                    message.id,
                    message.toolCalls.map((c: any) => c.function.arguments),
                  ]
                : [message.id],
          ),
      ).toEqual([
        ["r1"],
        ["m1", ['{"q":"a"}']],
        ["tool-1", "found"],
        ["r2"],
        ["m2", ['{"ok":true}']],
        ["tc-2:tool", "confirmed"],
      ]);

      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text: "again" }],
        });
      });
      for (let i = 0; i < 5; i++) await flush();

      const followUp = runAgent.mock.calls[2]![0] as { messages: any[] };
      expect(shape(followUp.messages)).toEqual([
        "user:go",
        ...step1,
        "assistant:Checking.:tc-1",
        "tool:tc-1",
        "reasoning:r2::sig-r2",
        "assistant::tc-2",
        "tool:tc-2",
        showThinking ? "reasoning:r3:Done.:sig-r3" : "reasoning:r3::sig-r3",
        "assistant:All set.:",
        "user:again",
      ]);
    },
  );

  it("leaves the default strategy's per-message records as they were", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      const run = runAgent.mock.calls.length;
      send(subscriber, { type: "RUN_STARTED", runId: `run-${run}` });
      if (run === 1) {
        reason(subscriber, "r1", "Look it up.");
        say(subscriber, "m1", "Checking.");
        call(subscriber, "tc-1", "lookup", "m1", '{"q":"a"}');
        send(subscriber, {
          type: "TOOL_CALL_RESULT",
          messageId: "tool-1",
          toolCallId: "tc-1",
          content: "found",
        });
        reason(subscriber, "r2", "Answer now.");
        say(subscriber, "m2", "All set.");
      } else {
        say(subscriber, "m3", "Sure.");
      }
      send(subscriber, { type: "RUN_FINISHED", runId: `run-${run}` });
      subscriber.onRunFinalized?.(undefined);
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, showThinking: true }),
    );
    await flush();
    for (const text of ["go", "again"]) {
      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text }],
        });
      });
      for (let i = 0; i < 5; i++) await flush();
    }

    const followUp = runAgent.mock.calls[1]![0] as { messages: any[] };
    expect(
      followUp.messages.map((message) => [message.role, message.id]),
    ).toEqual([
      ["user", expect.any(String)],
      ["reasoning", "r1"],
      ["assistant", "m1"],
      ["tool", "tool-1"],
      ["reasoning", "r2"],
      ["assistant", "m2"],
      ["user", expect.any(String)],
    ]);
    expect(shape(followUp.messages)).toEqual([
      "user:go",
      "reasoning:r1:Look it up.:sig-r1",
      "assistant:Checking.:tc-1",
      "tool:tc-1",
      "reasoning:r2:Answer now.:sig-r2",
      "assistant:All set.:",
      "user:again",
    ]);
  });
});
