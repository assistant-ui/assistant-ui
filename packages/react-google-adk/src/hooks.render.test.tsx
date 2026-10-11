// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { AssistantRuntime, ToolCallMessagePart } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { describe, expect, it, vi } from "vitest";
import {
  useAdkAppState,
  useAdkAuthRequests,
  useAdkConfirmTool,
  useAdkSubmitAuth,
  useAdkSubmitInput,
} from "./hooks";
import type {
  AdkAuthRequest,
  AdkEvent,
  AdkMessage,
  AdkStreamCallback,
} from "./types";
import { useAdkRuntime } from "./useAdkRuntime";

describe("ADK state hook rendering", () => {
  it("keeps app state stable across unrelated store updates", async () => {
    const deltas = [
      {
        "app:visible": 1,
        "app:__proto__": { source: "provider" },
      },
      { unrelated: true },
      { "app:visible": 2 },
    ];
    const stream = vi.fn(async function* () {
      const call = stream.mock.calls.length - 1;
      yield {
        id: `event-${call}`,
        author: "agent",
        actions: { stateDelta: deltas[call] },
        turnComplete: true,
      } satisfies AdkEvent;
    });

    let runtime: AssistantRuntime | undefined;
    let appState: Record<string, unknown> | undefined;

    const Probe = () => {
      appState = useAdkAppState();
      return null;
    };

    const App = () => {
      runtime = useAdkRuntime({
        stream,
        create: async () => ({ externalId: "thread-1" }),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    const send = (text: string) =>
      act(async () => {
        await runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text }],
        });
      });

    await send("first");
    await waitFor(() => expect(appState?.visible).toBe(1));

    const initial = appState;
    expect(Object.hasOwn(initial!, "__proto__")).toBe(true);
    expect(initial?.["__proto__"]).toEqual({ source: "provider" });

    await send("second");
    expect(appState).toBe(initial);

    await send("third");
    await waitFor(() => expect(appState?.visible).toBe(2));
    expect(appState).not.toBe(initial);
  });
});

describe("useAdkSubmitAuth", () => {
  it("batches same-tick credential answers and preserves their request config", async () => {
    const authConfig = {
      authScheme: { type: "apiKey", in: "header", name: "x-api-key" },
      credentialKey: "weather",
    };
    const stream = vi.fn(async function* () {
      if (stream.mock.calls.length === 1) {
        yield {
          id: "event-1",
          author: "agent",
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "cred-1",
                  name: "adk_request_credential",
                  args: { function_call_id: "tc-1", auth_config: authConfig },
                },
              },
              {
                functionCall: {
                  id: "cred-2",
                  name: "adk_request_credential",
                  args: { function_call_id: "tc-2", auth_config: authConfig },
                },
              },
            ],
          },
          longRunningToolIds: ["cred-1", "cred-2"],
          turnComplete: true,
        } satisfies AdkEvent;
        return;
      }
      yield {
        id: "event-2",
        author: "agent",
        content: { role: "model", parts: [{ text: "Sunny" }] },
        turnComplete: true,
      } satisfies AdkEvent;
    });

    let runtime: AssistantRuntime | undefined;
    let authRequests: AdkAuthRequest[] | undefined;
    let submitAuth: ReturnType<typeof useAdkSubmitAuth> | undefined;

    const Probe = () => {
      authRequests = useAdkAuthRequests();
      submitAuth = useAdkSubmitAuth();
      return null;
    };

    const App = () => {
      runtime = useAdkRuntime({
        stream,
        create: async () => ({ externalId: "thread-1" }),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await act(async () => {
      await runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "weather?" }],
      });
    });
    await waitFor(() =>
      expect(authRequests).toEqual([
        { toolCallId: "cred-1", authConfig },
        { toolCallId: "cred-2", authConfig },
      ]),
    );

    await act(async () => {
      await Promise.all([
        submitAuth!("cred-1", { authType: "apiKey", apiKey: "secret" }),
        submitAuth!("cred-2", { authType: "apiKey", apiKey: "secret-2" }),
      ]);
    });

    const [replied] = stream.mock.calls[1] as unknown as [AdkMessage[]];
    expect(replied).toHaveLength(2);
    expect(
      replied.map((message) =>
        message.type === "tool" ? message.tool_call_id : undefined,
      ),
    ).toEqual(["cred-1", "cred-2"]);
    expect(
      replied.map((message) =>
        message.type === "tool" ? JSON.parse(message.content) : undefined,
      ),
    ).toEqual([
      {
        ...authConfig,
        exchangedAuthCredential: { authType: "apiKey", apiKey: "secret" },
      },
      {
        ...authConfig,
        exchangedAuthCredential: { authType: "apiKey", apiKey: "secret-2" },
      },
    ]);
    await waitFor(() => expect(authRequests).toEqual([]));

    expect(() =>
      submitAuth!("cred-1", { authType: "apiKey", apiKey: "again" }),
    ).toThrow('No pending ADK auth request for tool call id "cred-1"');
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it("sends answered HITL calls together without waiting for an unanswered sibling", async () => {
    const authConfig = {
      authScheme: { type: "apiKey", in: "header", name: "x-api-key" },
      credentialKey: "weather",
    };
    let finishFirstRun!: () => void;
    let publishFollowup!: () => void;
    const firstRunHold = new Promise<void>((resolve) => {
      finishFirstRun = resolve;
    });
    const followupGate = new Promise<void>((resolve) => {
      publishFollowup = resolve;
    });
    const stream = vi.fn(async function* (
      _messages: AdkMessage[],
      _config: Parameters<AdkStreamCallback>[1],
    ) {
      if (stream.mock.calls.length === 1) {
        yield {
          id: "event-1",
          invocationId: "run-1",
          author: "agent",
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "confirm-hook",
                  name: "adk_request_confirmation",
                  args: {
                    originalFunctionCall: {
                      id: "delete-hook",
                      name: "delete_file",
                    },
                    toolConfirmation: { hint: "Delete this file?" },
                  },
                },
              },
              {
                functionCall: {
                  id: "credential-1",
                  name: "adk_request_credential",
                  args: {
                    function_call_id: "weather-call",
                    auth_config: authConfig,
                  },
                },
              },
              {
                functionCall: {
                  id: "input-1",
                  name: "adk_request_input",
                  args: { prompt: "City?" },
                },
              },
              {
                functionCall: {
                  id: "input-unanswered",
                  name: "adk_request_input",
                  args: { prompt: "Continue?" },
                },
              },
              {
                functionCall: {
                  id: "delete-callback",
                  name: "delete_file",
                  args: {},
                },
              },
              {
                functionCall: {
                  id: "approval-callback",
                  name: "adk_request_confirmation",
                  args: {
                    originalFunctionCall: {
                      id: "delete-callback",
                      name: "delete_file",
                    },
                    toolConfirmation: { hint: "Delete this file?" },
                  },
                },
              },
            ],
          },
          longRunningToolIds: [
            "confirm-hook",
            "credential-1",
            "input-1",
            "input-unanswered",
            "delete-callback",
            "approval-callback",
          ],
          turnComplete: true,
        } satisfies AdkEvent;
        await followupGate;
        yield {
          id: "event-followup",
          invocationId: "run-1",
          author: "agent",
          content: { role: "model", parts: [{ text: "Still working" }] },
        } satisfies AdkEvent;
        await firstRunHold;
        return;
      }
      yield {
        id: "event-2",
        invocationId: "run-2",
        author: "agent",
        content: { role: "model", parts: [{ text: "Done" }] },
        turnComplete: true,
      } satisfies AdkEvent;
    });

    let runtime: AssistantRuntime | undefined;
    let authRequests: AdkAuthRequest[] | undefined;
    let confirmTool: ReturnType<typeof useAdkConfirmTool> | undefined;
    let submitAuth: ReturnType<typeof useAdkSubmitAuth> | undefined;
    let submitInput: ReturnType<typeof useAdkSubmitInput> | undefined;

    const Probe = () => {
      authRequests = useAdkAuthRequests();
      confirmTool = useAdkConfirmTool();
      submitAuth = useAdkSubmitAuth();
      submitInput = useAdkSubmitInput();
      return null;
    };

    const App = () => {
      runtime = useAdkRuntime({
        stream,
        create: async () => ({ externalId: "thread-1" }),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    act(() => {
      runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "Handle these requests" }],
      });
    });
    await waitFor(() => {
      expect(stream).toHaveBeenCalledOnce();
      expect(authRequests).toEqual([
        { toolCallId: "credential-1", authConfig },
      ]);
    });

    const messageIndex = runtime!.thread
      .getState()
      .messages.findIndex((message) =>
        message.content.some(
          (part) =>
            part.type === "tool-call" && part.toolCallId === "delete-callback",
        ),
      );
    const replies: Promise<void>[] = [];
    act(() => {
      replies.push(confirmTool!("confirm-hook", true));
      replies.push(
        submitAuth!("credential-1", {
          authType: "apiKey",
          apiKey: "secret",
        }),
      );
      replies.push(submitInput!("input-1", { city: "Paris" }));
      replies.push(
        runtime!.thread
          .getMessageByIndex(messageIndex)
          .getMessagePartByToolCallId("delete-callback")
          .respondToToolApproval({ approved: true }),
      );
    });

    expect(stream).toHaveBeenCalledOnce();
    const answeredWhileRunActive = runtime!.thread
      .getState()
      .messages.flatMap((message) =>
        Array.isArray(message.content)
          ? message.content.flatMap((part) => {
              const toolCall = part as ToolCallMessagePart;
              return toolCall.type === "tool-call" &&
                (toolCall.result !== undefined ||
                  toolCall.approval?.approved !== undefined)
                ? [toolCall.toolCallId]
                : [];
            })
          : [],
      );
    expect(answeredWhileRunActive).toEqual(
      expect.arrayContaining([
        "confirm-hook",
        "credential-1",
        "input-1",
        "approval-callback",
      ]),
    );
    publishFollowup();
    await waitFor(() =>
      expect(
        runtime!.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "text" && part.text === "Still working",
            ),
          ),
      ).toBe(true),
    );
    expect(
      runtime!.thread
        .getState()
        .messages.some((message) =>
          message.content.some(
            (part) =>
              part.type === "tool-call" &&
              part.toolCallId === "input-1" &&
              part.result !== undefined,
          ),
        ),
    ).toBe(true);
    finishFirstRun();
    await act(async () => {
      await Promise.all(replies);
    });

    expect(stream).toHaveBeenCalledTimes(2);
    const [sentReplies] = stream.mock.calls[1]!;
    expect(
      sentReplies.map((message) =>
        message.type === "tool" ? message.tool_call_id : undefined,
      ),
    ).toEqual(["confirm-hook", "credential-1", "input-1", "approval-callback"]);
  });
});
