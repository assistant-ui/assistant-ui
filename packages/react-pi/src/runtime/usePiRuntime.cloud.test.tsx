// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import type {
  ExternalStoreAdapter,
  RemoteThreadListAdapter,
} from "@assistant-ui/react";
import type { PiClient, PiThreadSnapshot } from "../types";

const mocks = vi.hoisted(() => {
  const cloudAdapter = {
    unstable_useAdapters: () => ({
      history: {},
      feedback: {},
    }),
  };
  return {
    cloudAdapter,
    remoteAdapters: [] as unknown[],
    useCloudThreadListAdapter: vi.fn((_options: unknown) => cloudAdapter),
  };
});

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({
    threadListItem: {
      id: "t1",
      remoteId: "t1",
      externalId: "t1",
      initialize: vi.fn(),
    },
  }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      threadListItem: { id: "t1", remoteId: "t1", externalId: "t1" },
      threads: { mainThreadId: "t1" },
    }),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
  useExternalStoreRuntime: (_adapter: ExternalStoreAdapter) => ({}),
  useRemoteThreadListRuntime: (options: {
    adapter: unknown;
    runtimeHook: () => unknown;
  }) => {
    mocks.remoteAdapters.push(options.adapter);
    return options.runtimeHook();
  },
}));

vi.mock("./ThreadController", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ThreadController")>();

  const state = {
    runStatus: "idle",
    metadata: { id: "t1", status: "idle" },
    readiness: undefined,
    contextUsage: undefined,
    hostUiRequests: [],
    queue: { steering: [], followUp: [] },
    compaction: { active: false },
    retry: { active: false, attempt: 0 },
    lastError: undefined,
  };

  class PiThreadController {
    getState = () => state;
    getProjectedMessages = () => [];
    getMessageRepository = () => undefined;
    getVersion = () => 0;
    subscribe = () => () => {};
    subscribeMetadata = () => () => {};
    subscribeMessages = () => () => {};
    connect = () => () => {};
    load = vi.fn().mockResolvedValue(undefined);
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = vi.fn().mockResolvedValue(undefined);
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

import { PI_SDK } from "../sdkIdentity";
import { usePiRuntime } from "./usePiRuntime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: PiThreadSnapshot = {
  metadata: { id: "pi-thread", status: "idle" },
  messages: [],
} as unknown as PiThreadSnapshot;

const createClient = () => {
  const createThread = vi.fn().mockResolvedValue(snapshot);
  const deleteThread = vi.fn().mockResolvedValue(undefined);
  return {
    client: {
      createThread,
      deleteThread,
    } as unknown as PiClient,
    createThread,
    deleteThread,
  };
};

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.remoteAdapters.length = 0;
  mocks.useCloudThreadListAdapter.mockClear();
});

describe("usePiRuntime cloud", () => {
  it("uses Assistant Cloud threads and maps Pi thread creation and deletion", async () => {
    const { client, createThread, deleteThread } = createClient();
    const getThread = vi
      .fn()
      .mockResolvedValueOnce({ external_id: "pi-thread" })
      .mockResolvedValueOnce({ external_id: undefined });
    const cloud = { threads: { get: getThread } } as unknown as AssistantCloud;

    const App = () => {
      usePiRuntime({ client, cloud, workspacePath: "/workspace" });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    expect(mocks.remoteAdapters.at(-1)).toBe(mocks.cloudAdapter);
    expect(mocks.useCloudThreadListAdapter).toHaveBeenLastCalledWith(
      expect.objectContaining({ cloud, sdk: PI_SDK }),
    );

    const cloudOptions = mocks.useCloudThreadListAdapter.mock.calls.at(
      -1,
    )?.[0] as unknown as {
      create: () => Promise<{ externalId: string }>;
      delete: (threadId: string) => Promise<void>;
    };
    await expect(cloudOptions.create()).resolves.toEqual({
      externalId: "pi-thread",
    });
    expect(createThread).toHaveBeenCalledExactlyOnceWith({
      workspacePath: "/workspace",
    });

    await cloudOptions.delete("cloud-thread");
    await cloudOptions.delete("cloud-thread-without-pi");
    expect(getThread).toHaveBeenNthCalledWith(1, "cloud-thread");
    expect(getThread).toHaveBeenNthCalledWith(2, "cloud-thread-without-pi");
    expect(deleteThread).toHaveBeenCalledExactlyOnceWith("pi-thread");
  });

  it("keeps the Pi thread adapter when cloud is absent", async () => {
    const { client, createThread, deleteThread } = createClient();

    const App = () => {
      usePiRuntime({ client });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    const adapter = mocks.remoteAdapters.at(-1) as RemoteThreadListAdapter;
    expect(adapter).not.toBe(mocks.cloudAdapter);
    expect(mocks.useCloudThreadListAdapter).toHaveBeenLastCalledWith(
      expect.objectContaining({ sdk: undefined }),
    );
    await expect(adapter.initialize("local-thread")).resolves.toEqual({
      remoteId: "pi-thread",
      externalId: "pi-thread",
    });
    await adapter.delete("pi-thread");

    expect(createThread).toHaveBeenCalledExactlyOnceWith({});
    expect(deleteThread).toHaveBeenCalledExactlyOnceWith("pi-thread");
  });
});
