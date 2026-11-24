// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import type { AssistantCloud, CloudMessage } from "assistant-cloud";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import {
  actSettled,
  deferred,
} from "../../../tests/remote-thread-list-test-helpers";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";
import { useThreadReplyState } from "../../primitive-hooks/useThreadReplyState";
import {
  getThreadReplyState,
  setThreadReplyState,
  subscribeThreadReplyState,
} from "../../../store/thread-reply-state";

type ThreadRun = {
  status: "running";
  message_id: string | null;
  parent_id: string | null;
  last_heartbeat_ms_ago: number;
};

const at = new Date(0);
const userRow: CloudMessage = {
  id: "msg_1",
  parent_id: null,
  height: 0,
  created_at: at,
  updated_at: at,
  format: "aui/v0",
  content: { role: "user", content: [{ type: "text", text: "hello" }] },
};
const threadRun = (last_heartbeat_ms_ago: number): ThreadRun => ({
  status: "running",
  message_id: null,
  parent_id: "msg_1",
  last_heartbeat_ms_ago,
});

const makeCloud = (stored: CloudMessage[], run: ThreadRun | null) =>
  ({
    threads: {
      list: vi.fn().mockResolvedValue({
        threads: [
          {
            id: "remote-1",
            title: "t",
            is_archived: false,
            external_id: null,
            metadata: null,
            created_at: at,
            updated_at: at,
            last_message_at: at,
          },
        ],
      }),
      create: vi.fn(async () => ({ thread_id: "remote-1" })),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      messages: {
        list: vi.fn().mockResolvedValue({ messages: stored, run }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
      },
      runs: {
        heartbeat: vi.fn(),
        end: vi.fn().mockResolvedValue(undefined),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: false },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
    registerSdk: vi.fn(),
  }) as unknown as AssistantCloud;

const renderRuntime = async (
  cloud: AssistantCloud,
  options: { staleAfter?: number } = {},
) => {
  let runtime!: AssistantRuntime;
  let aui!: AssistantClient;
  const hooks: { replyState?: ReturnType<typeof useThreadReplyState> } = {};
  const Capture = () => {
    aui = useAui();
    hooks.replyState = useThreadReplyState();
    return null;
  };
  const Harness = () => {
    const adapter = useCloudThreadListAdapter({ cloud, ...options });
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function RuntimeHook() {
        return useLocalRuntime({ run: () => deferred<never>().promise });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<Harness />);
  await actSettled(() => aui.threads.getLoadThreadsPromise());
  await actSettled(() => runtime.threads.switchToThread("remote-1"));
  return { hooks, unmount: view.unmount, getAui: () => aui };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("thread reply state", () => {
  it("shows a thread whose fresh lease from another tab answers the last message as in progress", async () => {
    const { hooks, getAui } = await renderRuntime(
      makeCloud([userRow], threadRun(2_000)),
    );
    await waitFor(() => expect(hooks.replyState).toBe("in-progress"));
    expect(getAui().thread.getState().messages).toHaveLength(1);
  });

  it("turns a quiet lease into interrupted once it crosses staleAfter", async () => {
    const { hooks } = await renderRuntime(makeCloud([userRow], threadRun(0)), {
      staleAfter: 1_000,
    });
    await waitFor(() => expect(hooks.replyState).toBe("in-progress"));
    await waitFor(() => expect(hooks.replyState).toBe("interrupted"), {
      timeout: 4_000,
    });
  });

  it.each([
    ["a stale lease", threadRun(60_000)],
    ["no lease", null],
  ])(
    "shows a thread ending with the user's message and %s as interrupted",
    async (_label, run) => {
      const { hooks } = await renderRuntime(makeCloud([userRow], run));
      await waitFor(() => expect(hooks.replyState).toBe("interrupted"));
    },
  );

  it("reads a thread another tab is answering with short reads, and reads it whole once the reply is stored", async () => {
    const cloud = makeCloud([userRow], threadRun(0));
    const list = vi.mocked(cloud.threads.messages.list);
    const { hooks, getAui } = await renderRuntime(cloud, { staleAfter: 3_000 });
    await waitFor(() => expect(hooks.replyState).toBe("in-progress"));
    const fullReads = () =>
      list.mock.calls.filter(([, query]) => query?.limit !== 20).length;
    const loads = fullReads();

    await waitFor(
      () =>
        expect(list.mock.calls.some(([, query]) => query?.limit === 20)).toBe(
          true,
        ),
      { timeout: 5_000 },
    );
    expect(fullReads()).toBe(loads);
    expect(hooks.replyState).toBe("in-progress");

    const reply: CloudMessage = {
      id: "msg_2",
      parent_id: "msg_1",
      height: 1,
      created_at: at,
      updated_at: at,
      format: "aui/v0",
      content: {
        role: "assistant",
        content: [{ type: "text", text: "answer" }],
        status: { type: "complete", reason: "stop" },
      },
    };
    list.mockResolvedValue({ messages: [reply, userRow], run: null });
    await waitFor(
      () => expect(getAui().thread.getState().messages).toHaveLength(2),
      { timeout: 8_000 },
    );
    expect(fullReads()).toBeGreaterThan(loads);
    expect(hooks.replyState).toBeUndefined();
  }, 15_000);

  it.each(["first", "second"] as const)(
    "keeps one provider's reply state when the %s provider on the same thread unmounts",
    async (which) => {
      const first = await renderRuntime(makeCloud([userRow], threadRun(2_000)));
      const second = await renderRuntime(
        makeCloud([userRow], threadRun(2_000)),
      );
      await waitFor(() => expect(first.hooks.replyState).toBe("in-progress"));
      await waitFor(() => expect(second.hooks.replyState).toBe("in-progress"));

      const [gone, kept] =
        which === "first" ? [first, second] : [second, first];
      gone.unmount();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(kept.hooks.replyState).toBe("in-progress");
    },
  );
});

describe("thread reply state store", () => {
  it("keeps each runtime's state and listeners apart for the same thread id", () => {
    const a = {};
    const b = {};
    const heardA = vi.fn();
    const heardB = vi.fn();
    const stopA = subscribeThreadReplyState(a, "t1", heardA);
    const stopB = subscribeThreadReplyState(b, "t1", heardB);

    setThreadReplyState(a, "t1", "interrupted");
    expect(getThreadReplyState(a, "t1")).toBe("interrupted");
    expect(getThreadReplyState(b, "t1")).toBeUndefined();
    expect(heardA).toHaveBeenCalledTimes(1);
    expect(heardB).not.toHaveBeenCalled();

    setThreadReplyState(b, "t1", "in-progress");
    setThreadReplyState(a, "t1", undefined);
    expect(getThreadReplyState(b, "t1")).toBe("in-progress");
    expect(heardB).toHaveBeenCalledTimes(1);
    stopA();
    stopB();
  });

  it("leaves a newer listener in place when an older cleanup runs again", () => {
    const scope = {};
    const older = subscribeThreadReplyState(scope, "t1", () => {});
    older();
    const heard = vi.fn();
    const newer = subscribeThreadReplyState(scope, "t1", heard);
    older();
    setThreadReplyState(scope, "t1", "in-progress");
    expect(heard).toHaveBeenCalledTimes(1);
    newer();
    expect(getThreadReplyState(scope, "t1")).toBe("in-progress");
    expect(getThreadReplyState(scope, undefined)).toBeUndefined();
  });
});
