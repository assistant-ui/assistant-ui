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
import { actionBarResumeDisabled } from "../../../store/primitive-predicates";
import { refreshCloudRun } from "./runLeases";
import { getMessageRunState } from "../../../store/message-run-state";
import { useThreadReplyState } from "../../primitive-hooks/useThreadReplyState";
import { useThreadResume } from "../../primitive-hooks/useThreadResume";

type RunResult = { content: { type: "text"; text: string }[] };

type ThreadRun = {
  status: "running";
  message_id: string | null;
  parent_id: string | null;
  last_heartbeat_ms_ago: number;
};

const lease = {
  lease_id: "lease_1",
  heartbeat_interval_ms: 20_000,
};

const makeCloud = (
  stored: CloudMessage[] = [],
  threadRun?: ThreadRun | null,
) => {
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
        list: vi.fn().mockResolvedValue({
          messages: stored,
          ...(threadRun !== undefined ? { run: threadRun } : undefined),
        }),
        create,
        update: vi.fn().mockResolvedValue(undefined),
      },
      runs: {
        open: vi.fn().mockResolvedValue(lease),
        heartbeat: vi.fn().mockResolvedValue({
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

type StreamStep = { content: { type: "text"; text: string }[] };

const renderRuntime = async (
  cloud: AssistantCloud,
  options: {
    staleAfter?: number;
    stream?: () => AsyncGenerator<StreamStep, void>;
  } = {},
) => {
  const { stream, ...cloudOptions } = options;
  const runs: ReturnType<typeof deferred<RunResult>>[] = [];
  let runtime!: AssistantRuntime;
  let aui!: AssistantClient;
  const hooks: {
    replyState?: ReturnType<typeof useThreadReplyState>;
    resume?: ReturnType<typeof useThreadResume>;
  } = {};
  const Capture = () => {
    aui = useAui();
    hooks.replyState = useThreadReplyState();
    hooks.resume = useThreadResume();
    return null;
  };
  const Harness = () => {
    const adapter = useCloudThreadListAdapter({ cloud, ...cloudOptions });
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function RuntimeHook() {
        return useLocalRuntime(
          stream
            ? { run: stream }
            : {
                run: () => {
                  const run = deferred<RunResult>();
                  runs.push(run);
                  return run.promise;
                },
              },
        );
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
  return {
    runs,
    hooks,
    unmount: view.unmount,
    getRuntime: () => runtime,
    getAui: () => aui,
  };
};

const createCalls = (messages: ReturnType<typeof makeCloud>["messages"]) =>
  messages.create.mock.calls.map(([, body]) => body);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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
  content: { type: "text"; text: string }[],
  run?: CloudMessage["run"],
): CloudMessage => ({
  id: "msg_2",
  parent_id: "msg_1",
  height: 1,
  created_at: at,
  updated_at: at,
  format: "aui/v0",
  content: {
    role: "assistant",
    content,
    status: { type: "incomplete", reason: "cancelled" },
  },
  ...(run ? { run } : undefined),
});
const threadRun = (
  last_heartbeat_ms_ago: number,
  message_id: string | null = null,
): ThreadRun => ({
  status: "running",
  message_id,
  parent_id: "msg_1",
  last_heartbeat_ms_ago,
});

describe("cloud run leases", () => {
  it("opens the thread's lease at run start without storing a reply; the settled write stores it as the holder and ends the lease", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    const { runs, getAui } = await renderRuntime(cloud);

    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(threadRuns.open).toHaveBeenCalledWith("remote-1", {
        parent_id: "msg_1",
      }),
    );
    expect(createCalls(messages).map((body) => body.content.role)).toEqual([
      "user",
    ]);

    await act(async () => {
      runs[0]!.resolve({ content: [{ type: "text", text: "hi" }] });
    });
    await waitFor(() =>
      expect(threadRuns.end).toHaveBeenCalledWith("remote-1", "lease_1", {
        reason: "done",
      }),
    );
    const reply = createCalls(messages)[1]!;
    expect(reply).toMatchObject({
      parent_id: "msg_1",
      lease_id: "lease_1",
      content: { role: "assistant", content: [{ type: "text", text: "hi" }] },
    });
    expect(reply.open_run).toBeUndefined();
    expect(createCalls(messages)).toHaveLength(2);
    expect(messages.update).not.toHaveBeenCalled();
  });

  it("stores the reply on the first checkpoint that has content and updates it on the next", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { cloud, messages, threadRuns } = makeCloud();
    const gates = [deferred<void>(), deferred<void>(), deferred<void>()];
    const { getAui } = await renderRuntime(cloud, {
      async *stream() {
        await gates[0]!.promise;
        yield { content: [{ type: "text", text: "Step one" }] };
        await gates[1]!.promise;
        yield { content: [{ type: "text", text: "Step one, two" }] };
        await gates[2]!.promise;
      },
    });
    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(threadRuns.open).toHaveBeenCalled());

    // Empty so far: the checkpoint stores nothing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(createCalls(messages)).toHaveLength(1);

    await act(async () => {
      gates[0]!.resolve();
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await waitFor(() => expect(createCalls(messages)).toHaveLength(2));
    expect(createCalls(messages)[1]).toMatchObject({
      parent_id: "msg_1",
      lease_id: "lease_1",
      content: { content: [{ type: "text", text: "Step one" }] },
    });

    await act(async () => {
      gates[1]!.resolve();
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await waitFor(() =>
      expect(messages.update).toHaveBeenCalledWith("remote-1", "msg_2", {
        content: expect.objectContaining({
          content: [{ type: "text", text: "Step one, two" }],
        }),
        lease_id: "lease_1",
      }),
    );
    expect(threadRuns.end).not.toHaveBeenCalled();

    await act(async () => {
      gates[2]!.resolve();
    });
    await waitFor(() =>
      expect(threadRuns.end).toHaveBeenCalledWith("remote-1", "lease_1", {
        reason: "done",
      }),
    );
    expect(createCalls(messages)).toHaveLength(2);
  });

  it("leaves no message when the run dies before its first write", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    const { runs, getAui, unmount } = await renderRuntime(cloud);
    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() => expect(threadRuns.open).toHaveBeenCalled());

    // The tab goes away mid-run.
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createCalls(messages).map((body) => body.content.role)).toEqual([
      "user",
    ]);
    expect(messages.update).not.toHaveBeenCalled();
    expect(threadRuns.end).not.toHaveBeenCalled();
  });

  it("stores nothing for a run whose lease a newer run superseded", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    threadRuns.open.mockResolvedValue({ ...lease, heartbeat_interval_ms: 10 });
    threadRuns.heartbeat.mockRejectedValue(
      new CloudAPIError("ended", 409, "run_ended"),
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
    expect(createCalls(messages)).toHaveLength(1);
    expect(messages.update).not.toHaveBeenCalled();
    expect(threadRuns.end).not.toHaveBeenCalled();
    expect(threadRuns.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("keeps a held run open when the page hides or unloads", async () => {
    const { cloud, threadRuns } = makeCloud();
    const { runs, getAui } = await renderRuntime(cloud);
    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() => expect(threadRuns.open).toHaveBeenCalled());

    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
      window.dispatchEvent(new Event("beforeunload"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(threadRuns.end).not.toHaveBeenCalled();
    expect(getAui().thread.getState().isRunning).toBe(true);
  });

  it("shows a thread whose fresh lease from another tab answers the last message as in progress, with no Resume", async () => {
    const { cloud } = makeCloud([userRow], threadRun(2_000));
    const { getRuntime, getAui, hooks } = await renderRuntime(cloud);
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() => expect(hooks.replyState).toBe("in-progress"));
    expect(getAui().thread.getState().messages).toHaveLength(1);
    expect(hooks.resume?.disabled).toBe(true);
  });

  it("turns a quiet lease into interrupted once it crosses staleAfter", async () => {
    const { cloud } = makeCloud([userRow], threadRun(0));
    const { getRuntime, hooks } = await renderRuntime(cloud, {
      staleAfter: 1_000,
    });
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() => expect(hooks.replyState).toBe("in-progress"));
    await waitFor(() => expect(hooks.replyState).toBe("interrupted"), {
      timeout: 4_000,
    });
  });

  it.each([
    ["a stale lease", threadRun(60_000)],
    ["no lease", null],
  ])(
    "shows a thread ending with the user's message and %s as interrupted; Resume runs from that message without a branch",
    async (_label, run) => {
      const { cloud, messages, threadRuns } = makeCloud([userRow], run);
      const { runs, getRuntime, getAui, hooks } = await renderRuntime(cloud);
      await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
      await waitFor(() => expect(hooks.replyState).toBe("interrupted"));
      await waitFor(() => expect(hooks.resume?.disabled).toBe(false));

      await act(async () => {
        hooks.resume!.resume();
      });
      await waitFor(() => expect(runs).toHaveLength(1));
      await waitFor(() =>
        expect(threadRuns.open).toHaveBeenCalledWith("remote-1", {
          parent_id: "msg_1",
        }),
      );
      expect(hooks.replyState).toBeUndefined();
      await act(async () => {
        runs[0]!.resolve({ content: [{ type: "text", text: "answer" }] });
      });
      await waitFor(() => expect(createCalls(messages)).toHaveLength(1));
      expect(createCalls(messages)[0]).toMatchObject({
        parent_id: "msg_1",
        lease_id: "lease_1",
      });
      const branch = getAui().thread.getState().messages;
      expect(branch.map((m) => m.role)).toEqual(["user", "assistant"]);
      expect(getAui().thread.message({ index: 1 }).getState().branchCount).toBe(
        1,
      );
      expect(hooks.replyState).toBeUndefined();
    },
  );

  it("shows a stale reply that stored content as an ordinary error; Regenerate branches beside it", async () => {
    const { cloud, messages, threadRuns } = makeCloud(
      [
        replyRow([{ type: "text", text: "partial" }], {
          status: "running",
          last_heartbeat_ms_ago: 60_000,
        }),
        userRow,
      ],
      threadRun(60_000, "msg_2"),
    );
    const { runs, getRuntime, getAui, hooks } = await renderRuntime(cloud);
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
    expect(getMessageRunState(stale)).toBeUndefined();
    expect(hooks.replyState).toBeUndefined();
    expect(
      actionBarResumeDisabled({
        thread: getAui().thread.getState(),
        message: { ...stale, isLast: true, runState: undefined },
      } as unknown as Parameters<typeof actionBarResumeDisabled>[0]),
    ).toBe(true);

    await act(async () => {
      getAui().thread.message({ index: 1 }).reload();
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(threadRuns.open).toHaveBeenCalledWith("remote-1", {
        parent_id: "msg_1",
      }),
    );
    expect(createCalls(messages)).toHaveLength(0);
    const branch = getAui().thread.getState().messages;
    expect(branch[1]!.id).not.toBe("msg_2");
    expect(getAui().thread.message({ index: 1 }).getState().branchCount).toBe(
      2,
    );
  });

  it("shows a stored reply another tab is still writing as in progress on the reply", async () => {
    const { cloud } = makeCloud(
      [
        replyRow([{ type: "text", text: "so far" }], {
          status: "running",
          last_heartbeat_ms_ago: 2_000,
        }),
        userRow,
      ],
      threadRun(2_000, "msg_2"),
    );
    const { getRuntime, getAui, hooks } = await renderRuntime(cloud);
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(2),
    );
    const remote = getAui().thread.getState().messages[1]!;
    expect(remote.status).toMatchObject({
      error: { code: "run_in_progress", stale_in_ms: 28_000 },
    });
    expect(getMessageRunState(remote)).toBe("in-progress");
    expect(hooks.replyState).toBeUndefined();
  });

  it("follows a run another session drives until it goes quiet, refreshes on request, and flips back on a late beat", async () => {
    const textRow = (
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
      textRow("Step one", { status: "running", last_heartbeat_ms_ago: 0 }, 1),
      userRow,
    ];
    const { cloud, messages } = makeCloud(rows);
    messages.list.mockImplementation(async () => ({ messages: rows }));
    const { getRuntime, getAui } = await renderRuntime(cloud, {
      staleAfter: 3_000,
    });
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    const reply = () => getAui().thread.getState().messages[1];
    await waitFor(() =>
      expect(reply()?.status).toMatchObject({
        error: { code: "run_in_progress", message: "Running in another tab…" },
      }),
    );

    rows = [
      textRow(
        "Step one, step two",
        { status: "running", last_heartbeat_ms_ago: 0 },
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

    rows = [
      textRow(
        "Step one, step two",
        { status: "running", last_heartbeat_ms_ago: 3_000 },
        2,
      ),
      userRow,
    ];
    await waitFor(
      () =>
        expect(reply()?.status).toMatchObject({
          error: { code: "run_stale" },
        }),
      { timeout: 8_000 },
    );

    rows = [
      textRow(
        "Step one, step two, three",
        { status: "running", last_heartbeat_ms_ago: 100 },
        4,
      ),
      userRow,
    ];
    await act(async () => {
      await refreshCloudRun(getAui().threadListItem.getState().id);
    });
    expect(reply()?.status).toMatchObject({
      error: { code: "run_in_progress" },
    });

    rows = [textRow("All three steps", undefined, 5), userRow];
    await act(async () => {
      await refreshCloudRun(getAui().threadListItem.getState().id);
    });
    expect(reply()?.content).toEqual([
      { type: "text", text: "All three steps" },
    ]);
    expect(getMessageRunState(reply()!)).toBeUndefined();
  }, 20_000);
});
