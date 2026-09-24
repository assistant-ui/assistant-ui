// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  sessions: [] as string[],
  remoteOptions: undefined as { initialThreadId?: string } | undefined,
  stores: [] as unknown[],
  threadListItem: {
    externalId: "session-1" as string | undefined,
    remoteId: "cloud-thread-1" as string | undefined,
    status: "regular" as "new" | "regular",
    initialize: vi.fn(),
  },
  state: undefined as unknown,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({ threadListItem: mocks.threadListItem }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ threadListItem: mocks.threadListItem }),
  useCloudThreadListAdapter: () => ({}),
  useExternalStoreRuntime: (store: unknown) => {
    mocks.stores.push(store);
    return {};
  },
  useRemoteThreadListRuntime: (options: {
    initialThreadId?: string;
    runtimeHook: () => unknown;
  }) => {
    mocks.remoteOptions = options;
    return options.runtimeHook();
  },
}));

vi.mock("./OpenCodeThreadController", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./OpenCodeThreadController")>();

  class OpenCodeThreadController {
    constructor(_client: unknown, _getEventSource: unknown, sessionId: string) {
      mocks.sessions.push(sessionId);
    }
    getState = () => mocks.state;
    subscribe = () => () => {};
    load = vi.fn().mockResolvedValue(undefined);
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = vi.fn().mockResolvedValue(undefined);
    stageMessage = vi.fn().mockResolvedValue(undefined);
    sendStagedMessage = vi.fn().mockResolvedValue(false);
    cancel = vi.fn().mockResolvedValue(undefined);
    revert = vi.fn().mockResolvedValue(undefined);
    unrevert = vi.fn().mockResolvedValue(undefined);
    fork = vi.fn().mockResolvedValue("");
    replyToPermission = vi.fn().mockResolvedValue(undefined);
    replyToQuestion = vi.fn().mockResolvedValue(undefined);
    rejectQuestion = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
  }

  return { ...original, OpenCodeThreadController };
});

import { createOpenCodeThreadState } from "./openCodeThreadState";
import { useOpenCodeRuntime } from "./useOpenCodeRuntime";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.sessions.length = 0;
  mocks.remoteOptions = undefined;
  mocks.stores.length = 0;
  mocks.threadListItem.externalId = "session-1";
  mocks.threadListItem.remoteId = "cloud-thread-1";
  mocks.threadListItem.status = "regular";
  mocks.threadListItem.initialize.mockReset();
});

describe("useOpenCodeRuntime under Cloud", () => {
  it("opens the OpenCode session a cloud thread names, not the cloud thread id", async () => {
    mocks.state = createOpenCodeThreadState("session-1");
    const cloud = {} as AssistantCloud;
    const client = { session: {} } as never;

    const App = () => {
      useOpenCodeRuntime({ client, cloud, initialSessionId: "session-9" });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    expect(mocks.sessions).toContain("session-1");
    expect(mocks.sessions).not.toContain("cloud-thread-1");
    expect(mocks.remoteOptions?.initialThreadId).toBeUndefined();
  });
  it("opens no session for a cloud thread without one, and rejects a send to it", async () => {
    mocks.state = createOpenCodeThreadState("unused");
    mocks.threadListItem.externalId = undefined;
    mocks.threadListItem.initialize.mockResolvedValue({
      remoteId: "cloud-thread-1",
      externalId: undefined,
    });
    const onError = vi.fn();
    const cloud = {} as AssistantCloud;
    const client = { session: {} } as never;

    const App = () => {
      useOpenCodeRuntime({ client, cloud, onError });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    const store = mocks.stores.at(-1) as {
      onNew: (message: unknown) => Promise<void>;
    };
    await expect(
      store.onNew({
        role: "user",
        content: [{ type: "text", text: "hi" }],
        attachments: [],
        parentId: null,
        sourceId: null,
        runConfig: {},
        metadata: { custom: {} },
      }),
    ).rejects.toThrow("This thread has no OpenCode session to send to.");
    expect(mocks.sessions).not.toContain("cloud-thread-1");
    expect(onError).toHaveBeenCalledOnce();
  });
});
