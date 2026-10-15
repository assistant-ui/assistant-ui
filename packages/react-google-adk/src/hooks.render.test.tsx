// @vitest-environment jsdom

import { act, render, waitFor as waitForDefault } from "@testing-library/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useAdkAppState,
  useAdkAuthRequests,
  useAdkConfirmTool,
  useAdkLongRunningToolIds,
  useAdkSend,
  useAdkSubmitAuth,
  useAdkSubmitInput,
  useAdkToolConfirmations,
} from "./hooks";
import type { AdkAuthRequest, AdkEvent, AdkMessage } from "./types";
import { useAdkRuntime } from "./useAdkRuntime";
import { createAdkStream } from "./AdkClient";
import { settleOutsideAct } from "./tests/settleOutsideAct";

const waitFor: typeof waitForDefault = (callback, options) =>
  waitForDefault(callback, { interval: 10, ...options });

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
    expect(Object.getPrototypeOf(initial)).toBe(Object.prototype);
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

type RequestRecord = {
  ids: string[];
  texts: string[];
  aborted: boolean;
  abortedBeforeFetch: boolean;
};

const adapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({ remoteId: "adk-1", externalId: "adk-1" })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "ADK session",
  })),
});

const eventFor = (
  calls: { id: string; name: string; args?: Record<string, unknown> }[],
): AdkEvent => ({
  id: "calls",
  invocationId: "producer",
  author: "agent",
  longRunningToolIds: calls.map((call) => call.id),
  content: {
    role: "model",
    parts: calls.map((call) => ({
      functionCall: { ...call, args: call.args ?? {} },
    })),
  },
});

const mount = async (
  calls: { id: string; name: string; args?: Record<string, unknown> }[],
  holdProducer = false,
  holdFirstReply = false,
) => {
  const requests: RequestRecord[] = [];
  let closeProducer!: () => void;
  let closeFirstReply!: () => void;
  const firstReply = new ReadableStream<Uint8Array>({
    start(controller) {
      closeFirstReply = () => controller.close();
    },
  });
  const producer = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify(eventFor(calls))}\n\n`,
        ),
      );
      closeProducer = () => controller.close();
      if (!holdProducer) controller.close();
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string) as {
        newMessage: {
          parts: { functionResponse?: { id: string }; text?: string }[];
        };
      };
      const signal = init!.signal!;
      const record: RequestRecord = {
        ids: body.newMessage.parts.flatMap((part) =>
          part.functionResponse ? [part.functionResponse.id] : [],
        ),
        texts: body.newMessage.parts.flatMap((part) =>
          part.text === undefined ? [] : [part.text],
        ),
        aborted: signal.aborted,
        abortedBeforeFetch: signal.aborted,
      };
      requests.push(record);
      signal.addEventListener("abort", () => {
        record.aborted = true;
      });
      return new Response(
        requests.length === 1
          ? producer
          : requests.length === 2 && holdFirstReply
            ? firstReply
            : "",
        { headers: { "Content-Type": "text/event-stream" } },
      );
    }),
  );
  const capture: {
    runtime?: AssistantRuntime;
    confirm?: ReturnType<typeof useAdkConfirmTool>;
    input?: ReturnType<typeof useAdkSubmitInput>;
    auth?: ReturnType<typeof useAdkSubmitAuth>;
    send?: ReturnType<typeof useAdkSend>;
    confirmations?: ReturnType<typeof useAdkToolConfirmations>;
    authRequests?: ReturnType<typeof useAdkAuthRequests>;
    longRunningToolIds?: ReturnType<typeof useAdkLongRunningToolIds>;
  } = {};
  const Helpers = () => {
    capture.confirm = useAdkConfirmTool();
    capture.input = useAdkSubmitInput();
    capture.auth = useAdkSubmitAuth();
    capture.send = useAdkSend();
    capture.confirmations = useAdkToolConfirmations();
    capture.authRequests = useAdkAuthRequests();
    capture.longRunningToolIds = useAdkLongRunningToolIds();
    return null;
  };
  const App = () => {
    const runtime = useAdkRuntime({
      stream: createAdkStream({
        api: "http://localhost:8000",
        appName: "app",
        userId: "user",
      }),
      sessionAdapter: adapter(),
      unstable_allowCancellation: true,
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Helpers />
      </AssistantRuntimeProvider>
    );
  };
  await act(async () => {
    render(<App />);
  });
  await settleOutsideAct(() =>
    capture.runtime!.threads.switchToThread("adk-1"),
  );
  act(() => {
    void capture.runtime!.thread.append({
      role: "user",
      content: [{ type: "text", text: "start" }],
    });
  });
  await waitFor(() => expect(requests).toHaveLength(1));
  await waitFor(() =>
    expect(
      capture
        .runtime!.thread.getState()
        .messages.some((message) =>
          message.content.some(
            (part) =>
              part.type === "tool-call" && part.toolCallId === calls.at(-1)!.id,
          ),
        ),
    ).toBe(true),
  );
  if (!holdProducer)
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );
  return {
    ...capture,
    runtime: capture.runtime!,
    confirm: capture.confirm!,
    input: capture.input!,
    auth: capture.auth!,
    send: capture.send!,
    getConfirmations: () => capture.confirmations!,
    getAuthRequests: () => capture.authRequests!,
    getLongRunningToolIds: () => capture.longRunningToolIds!,
    requests,
    closeProducer,
    closeFirstReply,
  };
};

const replies = (requests: RequestRecord[]) =>
  requests.slice(1).map((request) => request.ids);
const nextTick = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

afterEach(() => vi.unstubAllGlobals());

describe("HITL reply ownership", () => {
  it("hides a held confirmation while retaining its long-running id", async () => {
    const h = await mount(
      [{ id: "confirm", name: "adk_request_confirmation" }],
      true,
    );
    expect(h.getConfirmations().map((request) => request.toolCallId)).toEqual([
      "confirm",
    ]);
    await act(async () => {
      await h.confirm("confirm", true);
    });
    expect(h.requests).toHaveLength(1);
    expect(h.getConfirmations()).toEqual([]);
    expect(h.getLongRunningToolIds()).toContain("confirm");
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
  });

  it("hides a held auth request while retaining its long-running id", async () => {
    const h = await mount(
      [{ id: "auth", name: "adk_request_credential" }],
      true,
    );
    expect(h.getAuthRequests().map((request) => request.toolCallId)).toEqual([
      "auth",
    ]);
    await act(async () => {
      await h.auth("auth", { authType: "apiKey", apiKey: "secret" });
    });
    expect(h.requests).toHaveLength(1);
    expect(h.getAuthRequests()).toEqual([]);
    expect(h.getLongRunningToolIds()).toContain("auth");
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
  });

  it("drops a held confirmation reply on Stop", async () => {
    const h = await mount(
      [{ id: "confirm", name: "adk_request_confirmation" }],
      true,
    );
    await act(async () => {
      await h.confirm("confirm", true);
    });
    expect(h.getConfirmations()).toEqual([]);
    await act(async () => {
      await h.runtime.thread.cancelRun();
    });
    expect(h.requests).toHaveLength(1);
    expect(h.getConfirmations().map((request) => request.toolCallId)).toEqual([
      "confirm",
    ]);
  });

  it("bundles a held reply with the next user turn", async () => {
    const h = await mount(
      [{ id: "confirm", name: "adk_request_confirmation" }],
      true,
    );
    await act(async () => {
      await h.confirm("confirm", true);
    });
    act(() => {
      void h.runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      });
    });
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(h.requests[1]!.ids).toEqual(["confirm"]);
    expect(h.requests[1]!.texts).toEqual(["next"]);
  });

  it("holds addToolResult behind an unrelated active run", async () => {
    const h = await mount([{ id: "lookup", name: "lookup" }], false, true);
    act(() => {
      void h.runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "unrelated" }],
      });
    });
    await waitFor(() => expect(h.requests).toHaveLength(2));
    const index = h.runtime.thread
      .getState()
      .messages.findIndex((message) =>
        message.content.some(
          (part) => part.type === "tool-call" && part.toolCallId === "lookup",
        ),
      );
    act(() => {
      void h.runtime.thread
        .getMessageByIndex(index)
        .getMessagePartByToolCallId("lookup")
        .addToolResult({ value: "done" });
    });
    await nextTick();
    expect(h.requests).toHaveLength(2);
    act(() => h.closeFirstReply());
    await waitFor(() => expect(h.requests).toHaveLength(3));
    expect(replies(h.requests)).toEqual([[], ["lookup"]]);
  });

  it("holds a send interrupt reply with an undefined runConfig", async () => {
    const h = await mount([{ id: "input", name: "adk_request_input" }], true);
    await act(async () => {
      await h.send(
        [
          {
            id: "reply",
            type: "tool",
            tool_call_id: "input",
            name: "adk_request_input",
            content: "{}",
          },
        ],
        { runConfig: undefined },
      );
    });
    expect(h.requests).toHaveLength(1);
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["input"]]);
  });

  it("sends an interrupt reply with a nonempty config immediately", async () => {
    const h = await mount([{ id: "input", name: "adk_request_input" }], true);
    act(() => {
      void h.send(
        [
          {
            id: "reply",
            type: "tool",
            tool_call_id: "input",
            name: "adk_request_input",
            content: "{}",
          },
        ],
        { runConfig: { custom: { mode: "next" } } },
      );
    });
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["input"]]);
  });

  it("same tick confirm plus submitInput", async () => {
    const h = await mount(
      [
        { id: "confirm", name: "adk_request_confirmation" },
        { id: "input", name: "adk_request_input" },
      ],
      true,
    );
    act(() => {
      void h.confirm("confirm", true);
      void h.input("input", "yes");
    });
    await nextTick();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.aborted).toBe(false);
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["confirm", "input"]]);
    expect(h.requests.every((request) => !request.aborted)).toBe(true);
    expect(h.requests.every((request) => !request.abortedBeforeFetch)).toBe(
      true,
    );
  });

  it("same tick two confirms from one run", async () => {
    const h = await mount([
      { id: "c1", name: "adk_request_confirmation" },
      { id: "c2", name: "adk_request_confirmation" },
    ]);
    act(() => {
      void h.confirm("c1", true);
      void h.confirm("c2", false);
    });
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["c1", "c2"]]);
    expect(h.requests.every((request) => !request.aborted)).toBe(true);
    expect(h.requests.every((request) => !request.abortedBeforeFetch)).toBe(
      true,
    );
  });

  it("same tick confirm plus submitAuth", async () => {
    const h = await mount(
      [
        { id: "confirm", name: "adk_request_confirmation" },
        {
          id: "auth",
          name: "adk_request_credential",
          args: {
            function_call_id: "original",
            auth_config: { authScheme: { type: "apiKey" } },
          },
        },
      ],
      true,
    );
    act(() => {
      void h.confirm("confirm", true);
      void h.auth("auth", { authType: "apiKey", apiKey: "secret" });
    });
    await nextTick();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.aborted).toBe(false);
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["confirm", "auth"]]);
    expect(h.requests.every((request) => !request.aborted)).toBe(true);
    expect(h.requests.every((request) => !request.abortedBeforeFetch)).toBe(
      true,
    );
  });

  it("same tick two runtime approval replies", async () => {
    const h = await mount(
      [
        {
          id: "a1",
          name: "adk_request_confirmation",
          args: { originalFunctionCall: { id: "tool1", name: "delete_file" } },
        },
        {
          id: "a2",
          name: "adk_request_confirmation",
          args: { originalFunctionCall: { id: "tool2", name: "delete_file" } },
        },
      ],
      true,
    );
    const messageIndex = h.runtime.thread
      .getState()
      .messages.findIndex((message) =>
        message.content.some(
          (part) => part.type === "tool-call" && part.toolCallId === "a1",
        ),
      );
    const message = h.runtime.thread.getMessageByIndex(messageIndex);
    const first = message.getMessagePartByToolCallId("a1");
    const second = message.getMessagePartByToolCallId("a2");
    act(() => {
      void first.respondToToolApproval({ approved: true });
      void second.respondToToolApproval({ approved: false });
    });
    await nextTick();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.aborted).toBe(false);
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["a1", "a2"]]);
    expect(h.requests.every((request) => !request.aborted)).toBe(true);
    expect(h.requests.every((request) => !request.abortedBeforeFetch)).toBe(
      true,
    );
  });

  it("holds same-tick replies while their producer streams", async () => {
    const h = await mount(
      [
        { id: "c1", name: "adk_request_confirmation" },
        { id: "c2", name: "adk_request_confirmation" },
      ],
      true,
    );
    act(() => {
      void h.confirm("c1", true);
      void h.confirm("c2", false);
    });
    await nextTick();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.aborted).toBe(false);
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["c1", "c2"]]);
    expect(h.requests[0]!.aborted).toBe(false);
    expect(h.requests[1]!.abortedBeforeFetch).toBe(false);
  });

  it("combines later-tick replies when their producer finishes", async () => {
    const h = await mount(
      [
        { id: "c1", name: "adk_request_confirmation" },
        { id: "c2", name: "adk_request_confirmation" },
      ],
      true,
    );
    act(() => {
      void h.confirm("c1", true);
    });
    await nextTick();
    act(() => {
      void h.confirm("c2", false);
    });
    await nextTick();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.aborted).toBe(false);
    act(() => h.closeProducer());
    await waitFor(() => expect(h.requests).toHaveLength(2));
    expect(replies(h.requests)).toEqual([["c1", "c2"]]);
    expect(h.requests[0]!.aborted).toBe(false);
    expect(h.requests[1]!.abortedBeforeFetch).toBe(false);
  });

  it("queues a later reply behind an open continuation", async () => {
    const h = await mount(
      [
        { id: "c1", name: "adk_request_confirmation" },
        { id: "c2", name: "adk_request_confirmation" },
      ],
      false,
      true,
    );
    act(() => {
      void h.confirm("c1", true);
    });
    await waitFor(() => expect(h.requests).toHaveLength(2));
    await nextTick();
    act(() => {
      void h.confirm("c2", false);
    });
    await nextTick();
    expect(h.requests).toHaveLength(2);
    expect(h.requests[1]!.aborted).toBe(false);
    act(() => h.closeFirstReply());
    await waitFor(() => expect(h.requests).toHaveLength(3));
    expect(replies(h.requests)).toEqual([["c1"], ["c2"]]);
    expect(h.requests.every((request) => !request.aborted)).toBe(true);
    expect(h.requests.every((request) => !request.abortedBeforeFetch)).toBe(
      true,
    );
  });
});
