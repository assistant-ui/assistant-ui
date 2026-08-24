// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/react";
import type { PiClient } from "../types";

const mocks = vi.hoisted(() => ({
  adapters: [] as ExternalStoreAdapter[],
  threadListAdapter: undefined as
    | {
        initialize: () => Promise<{
          remoteId: string;
          externalId: string | undefined;
        }>;
      }
    | undefined,
  initializeTask: undefined as
    | Promise<{ remoteId: string; externalId: string | undefined }>
    | undefined,
  threadListItem: {
    id: "t1" as string,
    remoteId: "t1" as string | undefined,
    externalId: "t1" as string | undefined,
    status: "regular" as "new" | "regular",
    initialize: vi.fn(() => {
      mocks.initializeTask ??= (async () => {
        const adapter = mocks.threadListAdapter;
        if (!adapter) throw new Error("thread list adapter missing");
        return adapter.initialize();
      })();
      return mocks.initializeTask;
    }),
  },
  repository: undefined as unknown,
  state: undefined as unknown,
  controller: {
    load: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({ threadListItem: mocks.threadListItem }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      threadListItem: mocks.threadListItem,
      threads: { mainThreadId: mocks.threadListItem.id },
    }),
  useExternalStoreRuntime: (adapter: ExternalStoreAdapter) => {
    mocks.adapters.push(adapter);
    return {};
  },
  useRemoteThreadListRuntime: (options: {
    adapter: {
      initialize: () => Promise<{
        remoteId: string;
        externalId: string | undefined;
      }>;
    };
    runtimeHook: () => unknown;
  }) => {
    mocks.threadListAdapter = options.adapter;
    return options.runtimeHook();
  },
}));

vi.mock("./ThreadController", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ThreadController")>();

  class PiThreadController {
    getState = () => mocks.state;
    getProjectedMessages = () => [];
    getMessageRepository = () => mocks.repository;
    getVersion = () => 0;
    subscribe = () => () => {};
    subscribeMetadata = () => () => {};
    subscribeMessages = () => () => {};
    connect = () => () => {};
    load = mocks.controller.load;
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = mocks.controller.sendMessage;
    cancel = vi.fn().mockResolvedValue(undefined);
    clearQueue = vi.fn().mockResolvedValue({ steering: [], followUp: [] });
    setModel = vi.fn().mockResolvedValue(undefined);
    setThinkingLevel = vi.fn().mockResolvedValue(undefined);
    respondToToolApproval = vi.fn().mockResolvedValue(undefined);
    resumeToolCall = vi.fn().mockResolvedValue(undefined);
    respondToHostUiRequest = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
  }

  return { ...original, PiThreadController };
});

import { ExportedMessageRepository } from "@assistant-ui/react";
import { createPiThreadState } from "./threadState";
import { usePiRuntime } from "./usePiRuntime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.adapters.length = 0;
  mocks.threadListAdapter = undefined;
  mocks.initializeTask = undefined;
  mocks.threadListItem.id = "t1";
  mocks.threadListItem.remoteId = "t1";
  mocks.threadListItem.externalId = "t1";
  mocks.threadListItem.status = "regular";
  mocks.threadListItem.initialize.mockClear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("usePiRuntime error callbacks", () => {
  it.each(["throws", "rejects"] as const)(
    "preserves the controller error when onError %s",
    async (failureMode) => {
      mocks.state = createPiThreadState("t1");
      mocks.repository = ExportedMessageRepository.fromArray([]);
      const controllerError = new Error("send failed");
      const callbackError = new Error("telemetry failed");
      mocks.controller.sendMessage.mockRejectedValueOnce(controllerError);
      const onError = vi.fn(
        failureMode === "throws"
          ? () => {
              throw callbackError;
            }
          : async () => {
              throw callbackError;
            },
      );
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const App = () => {
        usePiRuntime({
          client: {} as PiClient,
          onError,
          initialThreadId: "t1",
        });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.at(-1)!;
      const message: AppendMessage = {
        role: "user",
        content: [{ type: "text", text: "hello" }],
      };

      await expect(adapter.onNew(message)).rejects.toBe(controllerError);
      expect(onError).toHaveBeenCalledWith(controllerError);
      await vi.waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          "[react-pi] onError callback threw an error",
          callbackError,
        ),
      );
    },
  );
});

describe("usePiRuntime new threads", () => {
  it("sends the first message after initialization returns the thread id", async () => {
    mocks.threadListItem.id = "new";
    mocks.threadListItem.remoteId = undefined;
    mocks.threadListItem.externalId = undefined;
    mocks.threadListItem.status = "new";

    let resolveCreateThread!: (snapshot: {
      metadata: { id: string; status: string };
      messages: [];
    }) => void;
    const createThreadPromise = new Promise<{
      metadata: { id: string; status: string };
      messages: [];
    }>((resolve) => {
      resolveCreateThread = resolve;
    });
    const client = {
      createThread: vi.fn(() => createThreadPromise),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    } as unknown as PiClient;

    const App = () => {
      usePiRuntime({ client });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    const adapter = mocks.adapters.at(-1)!;
    const initialization = mocks.threadListItem.initialize();
    expect(client.createThread).toHaveBeenCalledWith({});

    const message: AppendMessage = {
      role: "user",
      content: [{ type: "text", text: "hello" }],
    } as unknown as AppendMessage;
    let sendPromise!: Promise<void>;
    await act(async () => {
      sendPromise = adapter.onNew(message);
    });

    expect(client.sendMessage).not.toHaveBeenCalled();
    await act(async () => {
      resolveCreateThread({
        metadata: { id: "thread-1", status: "idle" },
        messages: [],
      });
      await initialization;
      await sendPromise;
    });

    expect(client.createThread).toHaveBeenCalledTimes(1);
    expect(client.sendMessage).toHaveBeenCalledWith("thread-1", {
      content: "hello",
    });
  });
});
