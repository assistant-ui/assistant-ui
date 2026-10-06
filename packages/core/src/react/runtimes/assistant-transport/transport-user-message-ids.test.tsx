// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui } from "@assistant-ui/store";
import type { ThreadHistoryAdapter } from "../../../adapters/thread-history";
import { ExportedMessageRepository } from "../../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../../types/message";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { RuntimeAdapterProvider } from "../RuntimeAdapterProvider";
import {
  useAssistantTransportRuntime,
  useAssistantTransportSendCommand,
} from "./useAssistantTransportRuntime";
import type {
  AssistantTransportCommand,
  AssistantTransportStateConverter,
} from "./types";

type State = {
  messages: { id?: string; role: "user" | "assistant"; text: string }[];
};

const user = (id: string, text: string): ThreadMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
});

const assistant = (id: string, text: string): ThreadMessage => ({
  id,
  role: "assistant",
  content: [{ type: "text", text }],
  status: { type: "complete", reason: "stop" },
  createdAt: new Date(0),
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const converter: AssistantTransportStateConverter<State> = (state, meta) => ({
  messages: [
    ...state.messages.map((message, index) =>
      message.role === "user"
        ? user(message.id ?? `__external_store_fallback_${index}`, message.text)
        : assistant(message.id!, message.text),
    ),
    ...meta.pendingCommands.flatMap((command) =>
      command.type === "add-message" && command.message.role === "user"
        ? [
            user(
              command.message.id ?? "missing-client-id",
              command.message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join(" "),
            ),
          ]
        : [],
    ),
  ],
  isRunning: meta.isSending,
});

const command = (id?: string): AssistantTransportCommand => ({
  type: "add-message",
  message: {
    role: "user",
    ...(id !== undefined && { id }),
    parts: [{ type: "text", text: "hello" }],
  },
  parentId: null,
  sourceId: null,
});

const setup = (history?: ThreadHistoryAdapter) => {
  let sendCommand!: (command: AssistantTransportCommand) => void;
  let aui!: ReturnType<typeof useAui>;
  let resolveResponse!: (response: Response) => void;
  const requests: { commands: AssistantTransportCommand[] }[] = [];
  vi.stubGlobal("fetch", (_url: RequestInfo | URL, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    return new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
  });

  const Capture: FC = () => {
    aui = useAui();
    sendCommand = useAssistantTransportSendCommand();
    return null;
  };
  const App: FC = () => {
    const runtime = useAssistantTransportRuntime({
      initialState: { messages: [] },
      api: "http://localhost/assistant",
      headers: {},
      protocol: "assistant-transport",
      converter,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(
    history ? (
      <RuntimeAdapterProvider adapters={{ history }}>
        <App />
      </RuntimeAdapterProvider>
    ) : (
      <App />
    ),
  );

  const settle = async (messages: State["messages"]) => {
    const chunks = [
      {
        type: "update-state",
        operations: [{ type: "set", path: ["messages"], value: messages }],
      },
      "[DONE]",
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(
              `data: ${typeof chunk === "string" ? chunk : JSON.stringify(chunk)}\n\n`,
            ),
          );
        }
        controller.close();
      },
    });
    await act(async () => {
      resolveResponse(new Response(stream, { status: 200 }));
    });
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(false));
  };

  return {
    view,
    requests,
    settle,
    send: (value: AssistantTransportCommand) => act(() => sendCommand(value)),
    aui: () => aui,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assistant transport user message ids", () => {
  it("sends an appended user message with a generated id", async () => {
    const app = setup();
    await act(async () => {
      app.aui().thread.append("hello");
    });
    await waitFor(() => expect(app.requests).toHaveLength(1));
    const sent = app.requests[0]!.commands[0]!;
    if (sent.type !== "add-message" || sent.message.role !== "user")
      throw new Error("Expected user command");
    expect(sent.message.id).toEqual(expect.any(String));
    expect(sent.message.id).not.toBe("");
    await app.settle([]);
    app.view.unmount();
  });

  it("replaces an optimistic user message in place when the backend preserves its id", async () => {
    const app = setup();
    app.send(command());
    await waitFor(() => expect(app.requests).toHaveLength(1));
    const sent = app.requests[0]!.commands[0]!;
    if (sent.type !== "add-message" || sent.message.role !== "user")
      throw new Error("Expected user command");
    const id = sent.message.id!;
    await waitFor(() =>
      expect(
        app.aui().thread.getState().messages[0]?.metadata.isOptimistic,
      ).toBe(true),
    );
    expect(app.aui().thread.getState().messages[0]?.id).toBe(id);

    await app.settle([
      { id, role: "user", text: "hello" },
      { id: "answer", role: "assistant", text: "hi" },
    ]);
    expect(
      app
        .aui()
        .thread.getState()
        .messages.map((message) => message.id),
    ).toEqual([id, "answer"]);
    expect(
      app.aui().thread.getState().messages[0]?.metadata.isOptimistic,
    ).not.toBe(true);
    expect(app.aui().thread.message({ id }).getState().branchCount).toBe(1);
    app.view.unmount();
  });

  it("evicts a pending message when the backend omits its id", async () => {
    const app = setup();
    app.send(command());
    await waitFor(() => expect(app.requests).toHaveLength(1));
    const sent = app.requests[0]!.commands[0]!;
    if (sent.type !== "add-message" || sent.message.role !== "user")
      throw new Error("Expected user command");
    const id = sent.message.id!;

    await app.settle([
      { role: "user", text: "hello" },
      { id: "answer", role: "assistant", text: "hi" },
    ]);
    const messages = app.aui().thread.getState().messages;
    expect(messages.map((message) => message.id)).toEqual([
      "__external_store_fallback_0",
      "answer",
    ]);
    expect(messages.some((message) => message.id === id)).toBe(false);
    expect(
      app.aui().thread.message({ id: messages[0]!.id }).getState().branchCount,
    ).toBe(1);
    app.view.unmount();
  });

  it("copies both settled messages with the user as the assistant parent", async () => {
    const unstable_copy = vi.fn(
      async (_branch: readonly ThreadMessage[], _ids: readonly string[]) => {},
    );
    const history: ThreadHistoryAdapter = {
      load: async () => ExportedMessageRepository.fromArray([]),
      append: async () => {},
      unstable_copy,
    };
    const app = setup(history);
    app.send(command("client-user"));
    await waitFor(() => expect(app.requests).toHaveLength(1));
    await waitFor(() =>
      expect(
        app.aui().thread.getState().messages[0]?.metadata.isOptimistic,
      ).toBe(true),
    );
    await app.settle([
      { id: "client-user", role: "user", text: "hello" },
      { id: "answer", role: "assistant", text: "hi" },
    ]);
    await waitFor(() => expect(unstable_copy).toHaveBeenCalledOnce());
    expect(unstable_copy.mock.calls[0]![1]).toEqual(["client-user", "answer"]);
    expect(
      unstable_copy.mock.calls[0]![0].map((message) => message.id),
    ).toEqual(["client-user", "answer"]);
    expect(app.aui().thread.getState().messages[1]?.parentId).toBe(
      "client-user",
    );
    app.view.unmount();
  });

  it.each([undefined, "caller-id"])(
    "sends a user command with id %s",
    async (id) => {
      const app = setup();
      app.send(command(id));
      await waitFor(() => expect(app.requests).toHaveLength(1));
      const sent = app.requests[0]!.commands[0]!;
      if (sent.type !== "add-message" || sent.message.role !== "user")
        throw new Error("Expected user command");
      if (id !== undefined) expect(sent.message.id).toBe(id);
      else expect(sent.message.id).toEqual(expect.any(String));
      expect(sent.message.id).not.toBe("");
      await waitFor(() =>
        expect(
          app.aui().thread.getState().messages[0]?.metadata.isOptimistic,
        ).toBe(true),
      );
      await app.settle([]);
      app.view.unmount();
    },
  );
});
