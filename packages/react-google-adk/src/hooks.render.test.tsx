// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { describe, expect, it, vi } from "vitest";
import { useAdkAppState, useAdkAuthRequests, useAdkSubmitAuth } from "./hooks";
import type { AdkAuthRequest, AdkEvent, AdkMessage } from "./types";
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
  it("answers the pending credential request with its config and the credential", async () => {
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
            ],
          },
          longRunningToolIds: ["cred-1"],
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
      expect(authRequests).toEqual([{ toolCallId: "cred-1", authConfig }]),
    );

    await act(async () => {
      await submitAuth!("cred-1", { authType: "apiKey", apiKey: "secret" });
    });

    const [replied] = stream.mock.calls[1] as unknown as [AdkMessage[]];
    expect(replied).toHaveLength(1);
    expect(replied[0]).toMatchObject({
      type: "tool",
      tool_call_id: "cred-1",
      name: "adk_request_credential",
    });
    expect(JSON.parse((replied[0] as { content: string }).content)).toEqual({
      ...authConfig,
      exchangedAuthCredential: { authType: "apiKey", apiKey: "secret" },
    });
    await waitFor(() => expect(authRequests).toEqual([]));

    expect(() =>
      submitAuth!("cred-1", { authType: "apiKey", apiKey: "again" }),
    ).toThrow('No pending ADK auth request for tool call id "cred-1"');
    expect(stream).toHaveBeenCalledTimes(2);
  });
});
