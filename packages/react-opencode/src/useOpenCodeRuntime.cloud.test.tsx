// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => {
  const state = {
    adapter: undefined as unknown,
    cloudOptions: undefined as
      | {
          cloud: AssistantCloud | undefined;
          sdk: unknown;
          create: () => Promise<{ externalId: string }>;
          delete: (threadId: string) => Promise<void>;
        }
      | undefined,
    cloudAdapter: {} as unknown,
    sessionCreate: vi.fn().mockResolvedValue({ data: { id: "session-1" } }),
    sessionDelete: vi.fn().mockResolvedValue({}),
    useCloudThreadListAdapter: vi.fn(),
    useRemoteThreadListRuntime: vi.fn(),
  };
  state.useCloudThreadListAdapter.mockImplementation((options) => {
    state.cloudOptions = options;
    return state.cloudAdapter;
  });
  state.useRemoteThreadListRuntime.mockImplementation((options) => {
    state.adapter = options.adapter;
    return {};
  });
  return state;
});

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
  useRemoteThreadListRuntime: mocks.useRemoteThreadListRuntime,
}));

import { OPENCODE_SDK } from "./sdkIdentity";
import { useOpenCodeRuntime } from "./useOpenCodeRuntime";

const createClient = () =>
  ({
    session: {
      create: mocks.sessionCreate,
      delete: mocks.sessionDelete,
    },
  }) as never;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.adapter = undefined;
  mocks.cloudOptions = undefined;
  mocks.sessionCreate
    .mockReset()
    .mockResolvedValue({ data: { id: "session-1" } });
  mocks.sessionDelete.mockReset().mockResolvedValue({});
});

describe("useOpenCodeRuntime cloud", () => {
  it("backs the thread list with Cloud and maps creation and deletion to OpenCode sessions", async () => {
    const get = vi.fn().mockResolvedValue({ external_id: "session-1" });
    const cloud = { threads: { get } } as unknown as AssistantCloud;
    const client = createClient();

    const App = () => {
      useOpenCodeRuntime({ client, cloud });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    expect(mocks.adapter).toBe(mocks.cloudAdapter);
    expect(mocks.useCloudThreadListAdapter).toHaveBeenCalledWith({
      cloud,
      sdk: OPENCODE_SDK,
      create: expect.any(Function),
      delete: expect.any(Function),
    });

    await expect(mocks.cloudOptions!.create()).resolves.toEqual({
      externalId: "session-1",
    });
    expect(mocks.sessionCreate).toHaveBeenCalledWith(
      {},
      { throwOnError: true },
    );

    await mocks.cloudOptions!.delete("cloud-thread-1");
    expect(get).toHaveBeenCalledWith("cloud-thread-1");
    expect(mocks.sessionDelete).toHaveBeenCalledWith(
      { sessionID: "session-1" },
      { throwOnError: true },
    );
  });

  it("keeps the OpenCode thread list adapter without Cloud", async () => {
    const client = createClient();

    const App = () => {
      useOpenCodeRuntime({ client });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    expect(mocks.adapter).not.toBe(mocks.cloudAdapter);
    expect(mocks.cloudOptions?.sdk).toBeUndefined();
    await expect(
      (
        mocks.adapter as {
          initialize: () => Promise<{ remoteId: string; externalId: string }>;
        }
      ).initialize(),
    ).resolves.toEqual({ remoteId: "session-1", externalId: "session-1" });
    expect(mocks.sessionCreate).toHaveBeenCalledWith(
      {},
      { throwOnError: true },
    );
  });
  it("still deletes the cloud thread when its OpenCode session is already gone", async () => {
    const get = vi.fn().mockResolvedValue({ external_id: "session-1" });
    const cloud = { threads: { get } } as unknown as AssistantCloud;
    const failure = new Error("session not found");
    mocks.sessionDelete.mockRejectedValue(failure);
    const onError = vi.fn();

    const App = () => {
      useOpenCodeRuntime({ client: createClient(), cloud, onError });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    await expect(
      mocks.cloudOptions!.delete("cloud-thread-1"),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
