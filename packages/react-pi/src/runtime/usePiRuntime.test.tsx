// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/react";
import type { PiClient } from "../types";

const mocks = vi.hoisted(() => ({
  adapters: [] as ExternalStoreAdapter[],
  repository: undefined as unknown,
  state: undefined as unknown,
  liveState: undefined as unknown,
  threadListItem: {
    id: "t1",
    remoteId: "t1" as string | undefined,
    externalId: "t1" as string | undefined,
    status: "regular" as "new" | "regular" | "archived",
  },
  mainThreadId: "t1",
  allListeners: new Set<() => void>(),
  messageListeners: new Set<() => void>(),
  controller: {
    load: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({
    threadListItem: {
      ...mocks.threadListItem,
      initialize: vi.fn().mockResolvedValue(undefined),
    },
  }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      threadListItem: mocks.threadListItem,
      threads: { mainThreadId: mocks.mainThreadId },
    }),
  useExternalStoreRuntime: (adapter: ExternalStoreAdapter) => {
    mocks.adapters.push(adapter);
    return {};
  },
  useRemoteThreadListRuntime: (options: { runtimeHook: () => unknown }) =>
    options.runtimeHook(),
}));

vi.mock("./ThreadController", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ThreadController")>();

  class PiThreadController {
    getState = () => mocks.liveState ?? mocks.state;
    getStateSnapshot = () => mocks.state;
    getProjectedMessages = () => [];
    getMessageRepository = () => mocks.repository;
    getVersion = () => 0;
    subscribe = (listener: () => void) => {
      mocks.allListeners.add(listener);
      return () => mocks.allListeners.delete(listener);
    };
    subscribeMetadata = () => () => {};
    subscribeMessages = (listener: () => void) => {
      mocks.messageListeners.add(listener);
      return () => mocks.messageListeners.delete(listener);
    };
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
  mocks.threadListItem = {
    id: "t1",
    remoteId: "t1",
    externalId: "t1",
    status: "regular",
  };
  mocks.mainThreadId = "t1";
  mocks.liveState = undefined;
  mocks.allListeners.clear();
  mocks.messageListeners.clear();
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

describe("usePiRuntime new-thread store", () => {
  it("keeps the composer enabled while initialization has no remote ids", async () => {
    mocks.threadListItem = {
      id: "__LOCALID_new",
      remoteId: undefined,
      externalId: undefined,
      status: "regular",
    };
    mocks.mainThreadId = "__LOCALID_new";

    const App = () => {
      usePiRuntime({ client: {} as PiClient });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    const adapter = mocks.adapters.at(-1)!;
    expect(adapter.isDisabled).toBe(false);
    expect(adapter.isLoading).toBe(false);
  });
});

describe("usePiRuntime controller subscriptions", () => {
  const renderRuntime = async () => {
    let renders = 0;
    const App = () => {
      renders += 1;
      usePiRuntime({ client: {} as PiClient, initialThreadId: "t1" });
      return null;
    };
    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));
    return { renderCount: () => renders };
  };

  // A metadata-only change (queue_update, agent_start, …) notifies the
  // metadata and all channels but never the message channel, so the store must
  // read state from the all channel, which fires with every notification.
  it("republishes state on a metadata-only notification", async () => {
    const initialState = createPiThreadState("t1");
    mocks.state = initialState;
    mocks.repository = ExportedMessageRepository.fromArray([]);

    const { renderCount } = await renderRuntime();
    const rendersAfterMount = renderCount();

    const before = mocks.adapters.at(-1)!;
    expect(before.isRunning).toBe(false);
    expect(before.extras).toMatchObject({ state: initialState });

    const runningState = { ...initialState, runStatus: "running" as const };
    await act(async () => {
      mocks.state = runningState;
      for (const listener of [...mocks.allListeners]) listener();
    });

    const after = mocks.adapters.at(-1)!;
    expect(after.isRunning).toBe(true);
    expect(after.extras).toMatchObject({ state: runningState });
    expect(renderCount()).toBe(rendersAfterMount + 1);
  });

  it("publishes the snapshot, not the state running ahead of it", async () => {
    const settled = createPiThreadState("t1");
    mocks.state = settled;
    mocks.repository = ExportedMessageRepository.fromArray([]);

    await renderRuntime();
    expect(mocks.adapters.at(-1)!.extras).toMatchObject({ state: settled });

    // a coalesced message frame has reduced but not yet notified
    mocks.liveState = { ...settled, runStatus: "running" as const };
    await act(async () => {
      for (const listener of [...mocks.allListeners]) listener();
    });

    expect(mocks.adapters.at(-1)!.isRunning).toBe(false);
    expect(mocks.adapters.at(-1)!.extras).toMatchObject({ state: settled });
  });

  it("republishes the repository on a message notification", async () => {
    const initialRepository = ExportedMessageRepository.fromArray([]);
    mocks.state = createPiThreadState("t1");
    mocks.repository = initialRepository;

    await renderRuntime();
    expect(mocks.adapters.at(-1)!.messageRepository).toBe(initialRepository);

    const nextRepository = ExportedMessageRepository.fromArray([]);
    await act(async () => {
      mocks.repository = nextRepository;
      for (const listener of [...mocks.messageListeners, ...mocks.allListeners])
        listener();
    });

    expect(mocks.adapters.at(-1)!.messageRepository).toBe(nextRepository);
  });

  it("leaves the store untouched when nothing on the controller changed", async () => {
    mocks.state = createPiThreadState("t1");
    mocks.repository = ExportedMessageRepository.fromArray([]);

    await renderRuntime();
    const before = mocks.adapters.at(-1)!;

    await act(async () => {
      for (const listener of [...mocks.messageListeners, ...mocks.allListeners])
        listener();
    });

    expect(mocks.adapters.at(-1)!).toBe(before);
  });
});
