// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
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
import { actionBarResumeDisabled } from "../../../store/primitive-predicates";

type RunResult = { content: { type: "text"; text: string }[] };

const lease = {
  id: "lease_1",
  expires_at: new Date(30_000),
  ttl_ms: 30_000,
  heartbeat_interval_ms: 20_000,
};

const makeCloud = (stored: CloudMessage[] = []) => {
  let created = 0;
  const create = vi.fn(async (_threadId: string, body: { run?: unknown }) => ({
    message_id: `msg_${++created}`,
    ...(body.run ? { lease } : undefined),
  }));
  const cloud = {
    threads: {
      list: vi.fn().mockResolvedValue({
        threads: stored.length
          ? [
              {
                id: "remote-1",
                title: "t",
                is_archived: false,
                external_id: null,
                metadata: null,
                created_at: new Date(0),
                updated_at: new Date(0),
                last_message_at: new Date(0),
              },
            ]
          : [],
      }),
      create: vi.fn(async () => ({ thread_id: "remote-1" })),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      messages: {
        list: vi.fn().mockResolvedValue({ messages: stored }),
        create,
        update: vi.fn().mockResolvedValue({}),
        heartbeat: vi.fn().mockResolvedValue({
          expires_at: new Date(50_000),
          ttl_ms: 30_000,
          heartbeat_interval_ms: 20_000,
        }),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: false },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
    registerSdk: vi.fn(),
  } as unknown as AssistantCloud;
  return { cloud, messages: vi.mocked(cloud.threads.messages) };
};

const renderRuntime = async (cloud: AssistantCloud) => {
  const runs: ReturnType<typeof deferred<RunResult>>[] = [];
  let runtime!: AssistantRuntime;
  let aui!: AssistantClient;
  const Capture = () => {
    aui = useAui();
    return null;
  };
  const Harness = () => {
    const adapter = useCloudThreadListAdapter({ cloud });
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function RuntimeHook() {
        return useLocalRuntime({
          run: () => {
            const run = deferred<RunResult>();
            runs.push(run);
            return run.promise;
          },
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  render(<Harness />);
  await actSettled(() => aui.threads.getLoadThreadsPromise());
  return { runs, getRuntime: () => runtime, getAui: () => aui };
};

const createCalls = (messages: ReturnType<typeof makeCloud>["messages"]) =>
  messages.create.mock.calls.map(([, body]) => body);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("cloud run leases", () => {
  it("stores the running reply with a lease and closes it with the settled write", async () => {
    const { cloud, messages } = makeCloud();
    const { runs, getAui } = await renderRuntime(cloud);

    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(createCalls(messages).some((body) => body.run)).toBe(true),
    );

    const running = createCalls(messages).find((body) => body.run)!;
    expect(running.run).toEqual({ status: "running" });
    expect(running.parent_id).toBe("msg_1");
    expect(running.content).toMatchObject({ role: "assistant" });

    await act(async () => {
      runs[0]!.resolve({ content: [{ type: "text", text: "hi" }] });
    });
    await waitFor(() =>
      expect(messages.update).toHaveBeenCalledWith(
        "remote-1",
        "msg_2",
        expect.objectContaining({
          run: { lease_id: "lease_1", status: "ended" },
        }),
      ),
    );
    expect(createCalls(messages).filter((body) => body.run)).toHaveLength(1);
  });

  it("loads a stale reply as an interrupted error that Resume continues from", async () => {
    const at = new Date(0);
    const { cloud, messages } = makeCloud([
      {
        id: "msg_2",
        parent_id: "msg_1",
        height: 1,
        created_at: at,
        updated_at: at,
        format: "aui/v0",
        content: {
          role: "assistant",
          content: [{ type: "text", text: "partial" }],
          status: { type: "incomplete", reason: "cancelled" },
        },
        run: { status: "stale" },
      },
      {
        id: "msg_1",
        parent_id: null,
        height: 0,
        created_at: at,
        updated_at: at,
        format: "aui/v0",
        content: { role: "user", content: [{ type: "text", text: "hello" }] },
      },
    ]);
    const { runs, getRuntime, getAui } = await renderRuntime(cloud);
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(2),
    );

    const stale = getAui().thread.getState().messages[1]!;
    expect(stale.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: {
        code: "run_stale",
        message: "This response was interrupted before it finished.",
      },
    });
    const state = {
      thread: getAui().thread.getState(),
      message: { ...stale, isLast: true },
    } as unknown as Parameters<typeof actionBarResumeDisabled>[0];
    expect(actionBarResumeDisabled(state)).toBe(false);
    expect(
      actionBarResumeDisabled({
        ...state,
        message: { ...state.message, isLast: false },
      } as typeof state),
    ).toBe(true);

    await act(async () => {
      getAui().thread.startRun({ parentId: "msg_2" });
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(createCalls(messages).some((body) => body.run)).toBe(true),
    );
    const resumed = createCalls(messages).find((body) => body.run)!;
    expect(resumed.parent_id).toBe("msg_2");
    const branch = getAui().thread.getState().messages;
    expect(branch.map((m) => [m.role, m.status?.type])).toEqual([
      ["user", undefined],
      ["assistant", "incomplete"],
      ["assistant", "running"],
    ]);
    expect(branch[1]!.id).toBe("msg_2");
  });

  it("reports a run another session still drives as in progress", async () => {
    const at = new Date(0);
    const { cloud } = makeCloud([
      {
        id: "msg_2",
        parent_id: "msg_1",
        height: 1,
        created_at: at,
        updated_at: at,
        format: "aui/v0",
        content: {
          role: "assistant",
          content: [],
          status: { type: "incomplete", reason: "cancelled" },
        },
        run: { status: "running", expires_in_ms: 10_000 },
      },
      {
        id: "msg_1",
        parent_id: null,
        height: 0,
        created_at: at,
        updated_at: at,
        format: "aui/v0",
        content: { role: "user", content: [{ type: "text", text: "hello" }] },
      },
    ]);
    const { getRuntime, getAui } = await renderRuntime(cloud);
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(2),
    );
    expect(getAui().thread.getState().messages[1]!.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: { code: "run_in_progress" },
    });
  });
});
