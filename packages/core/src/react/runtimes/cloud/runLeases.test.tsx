// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import {
  CloudAPIError,
  type AssistantCloud,
  type CloudMessage,
} from "assistant-cloud";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import {
  actSettled,
  deferred,
} from "../../../tests/remote-thread-list-test-helpers";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";
import {
  actionBarRefreshRunDisabled,
  actionBarResumeDisabled,
} from "../../../store/primitive-predicates";
import { refreshCloudRun } from "./runLeases";
import { getMessageRunState } from "../../../store/message-run-state";

type RunResult = { content: { type: "text"; text: string }[] };

const lease = {
  lease_id: "lease_1",
  expires_in_ms: 90_000,
  heartbeat_interval_ms: 20_000,
};

const makeCloud = (stored: CloudMessage[] = []) => {
  let created = 0;
  const create = vi.fn(
    async (_threadId: string, body: { open_run?: true }) => ({
      message_id: `msg_${++created}`,
      ...(body.open_run ? { run: lease } : undefined),
    }),
  );
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
        update: vi.fn().mockResolvedValue(undefined),
      },
      runs: {
        heartbeat: vi.fn().mockResolvedValue({
          expires_in_ms: 90_000,
          heartbeat_interval_ms: 20_000,
        }),
        end: vi.fn().mockResolvedValue(undefined),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: false },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
    registerSdk: vi.fn(),
  } as unknown as AssistantCloud;
  return {
    cloud,
    messages: vi.mocked(cloud.threads.messages),
    threadRuns: vi.mocked(cloud.threads.runs),
  };
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
    const { cloud, messages, threadRuns } = makeCloud();
    const { runs, getAui } = await renderRuntime(cloud);

    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(createCalls(messages).some((body) => body.open_run)).toBe(true),
    );

    const running = createCalls(messages).find((body) => body.open_run)!;
    expect(running.open_run).toBe(true);
    expect(running.parent_id).toBe("msg_1");
    expect(running.content).toMatchObject({ role: "assistant" });

    await act(async () => {
      runs[0]!.resolve({ content: [{ type: "text", text: "hi" }] });
    });
    await waitFor(() =>
      expect(messages.update).toHaveBeenCalledWith(
        "remote-1",
        "msg_2",
        expect.objectContaining({ lease_id: "lease_1" }),
      ),
    );
    await waitFor(() =>
      expect(threadRuns.end).toHaveBeenCalledWith("remote-1", "lease_1", {
        reason: "done",
      }),
    );
    expect(createCalls(messages).filter((body) => body.open_run)).toHaveLength(
      1,
    );
  });

  it("stops writing a reply whose lease the server reports stale", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    messages.create.mockImplementation(async (_threadId, body) =>
      body.open_run
        ? {
            message_id: "msg_2",
            run: { ...lease, heartbeat_interval_ms: 10 },
          }
        : { message_id: "msg_1" },
    );
    threadRuns.heartbeat.mockRejectedValue(
      new CloudAPIError("stale", 409, "run_stale"),
    );
    const { runs, getAui } = await renderRuntime(cloud);

    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() => expect(threadRuns.heartbeat).toHaveBeenCalled());

    await act(async () => {
      runs[0]!.resolve({ content: [{ type: "text", text: "hi" }] });
    });
    await waitFor(() =>
      expect(getAui().thread.getState().isRunning).toBe(false),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(messages.update).not.toHaveBeenCalled();
    expect(threadRuns.end).not.toHaveBeenCalled();
    expect(threadRuns.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("ends a held run as interrupted when the page unloads", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    const { runs, getAui } = await renderRuntime(cloud);
    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(createCalls(messages).some((body) => body.open_run)).toBe(true),
    );

    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(threadRuns.end).toHaveBeenCalledWith(
      "remote-1",
      "lease_1",
      { reason: "interrupted" },
      { keepalive: true },
    );
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
      message: { ...stale, isLast: true, runState: getMessageRunState(stale) },
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
      expect(createCalls(messages).some((body) => body.open_run)).toBe(true),
    );
    const resumed = createCalls(messages).find((body) => body.open_run)!;
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
    const remote = getAui().thread.getState().messages[1]!;
    expect(remote.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: { code: "run_in_progress", expires_in_ms: 10_000 },
    });
    const state = {
      thread: getAui().thread.getState(),
      message: {
        ...remote,
        isLast: true,
        runState: getMessageRunState(remote),
      },
    } as unknown as Parameters<typeof actionBarRefreshRunDisabled>[0];
    expect(actionBarRefreshRunDisabled(state)).toBe(false);
    expect(actionBarResumeDisabled(state)).toBe(true);
  });

  it("follows a run another session drives until it lapses, and refreshes on request", async () => {
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
    const replyRow = (
      text: string,
      run: CloudMessage["run"],
      updatedAt: number,
    ): CloudMessage => ({
      id: "msg_2",
      parent_id: "msg_1",
      height: 1,
      created_at: at,
      updated_at: new Date(updatedAt),
      format: "aui/v0",
      content: {
        role: "assistant",
        content: [{ type: "text", text }],
        status: { type: "incomplete", reason: "cancelled" },
      },
      ...(run ? { run } : undefined),
    });
    let rows = [
      replyRow("Step one", { status: "running", expires_in_ms: 0 }, 1),
      userRow,
    ];
    const { cloud, messages } = makeCloud(rows);
    messages.list.mockImplementation(async () => ({ messages: rows }));
    const { getRuntime, getAui } = await renderRuntime(cloud);
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    const reply = () => getAui().thread.getState().messages[1];
    await waitFor(() =>
      expect(reply()?.status).toMatchObject({
        error: { code: "run_in_progress", message: "Running in another tab…" },
      }),
    );

    rows = [
      replyRow(
        "Step one, step two",
        { status: "running", expires_in_ms: 0 },
        2,
      ),
      userRow,
    ];
    await act(async () => {
      await refreshCloudRun(getAui().threadListItem.getState().id);
    });
    expect(reply()?.content).toEqual([
      { type: "text", text: "Step one, step two" },
    ]);

    const readsBefore = messages.list.mock.calls.length;
    await waitFor(
      () =>
        expect(
          messages.list.mock.calls
            .slice(readsBefore)
            .some(([, query]) => query?.limit === 20),
        ).toBe(true),
      { timeout: 5_000 },
    );

    rows = [replyRow("Step one, step two", { status: "stale" }, 3), userRow];
    await waitFor(
      () =>
        expect(reply()?.status).toMatchObject({
          error: { code: "run_stale" },
        }),
      { timeout: 8_000 },
    );
  }, 15_000);
});
