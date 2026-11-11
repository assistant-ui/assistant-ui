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
  actionBarReloadDisabled,
  composerResumeDisabled,
} from "../../../store/primitive-predicates";
import { refreshCloudRun } from "./runLeases";
import { getMessageRunState } from "../../../store/message-run-state";

type RunResult = { content: { type: "text"; text: string }[] };

const lease = {
  lease_id: "lease_1",
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
        delete: vi.fn().mockResolvedValue(undefined),
      },
      runs: {
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

const renderRuntime = async (
  cloud: AssistantCloud,
  options: { staleAfter?: number } = {},
) => {
  const runs: ReturnType<typeof deferred<RunResult>>[] = [];
  let runtime!: AssistantRuntime;
  let aui!: AssistantClient;
  const Capture = () => {
    aui = useAui();
    return null;
  };
  const Harness = () => {
    const adapter = useCloudThreadListAdapter({ cloud, ...options });
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

const userRow = (at: Date): CloudMessage => ({
  id: "msg_1",
  parent_id: null,
  height: 0,
  created_at: at,
  updated_at: at,
  format: "aui/v0",
  content: { role: "user", content: [{ type: "text", text: "hello" }] },
});

const staleReply = (
  at: Date,
  content: readonly { type: "text"; text: string }[],
): CloudMessage => ({
  id: "msg_2",
  parent_id: "msg_1",
  height: 1,
  created_at: at,
  updated_at: at,
  format: "aui/v0",
  content: {
    role: "assistant",
    content: [...content],
    status: { type: "incomplete", reason: "cancelled" },
  },
  run: { status: "running", last_heartbeat_ms_ago: 60_000 },
});

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

  it("stops writing a reply whose lease was ended elsewhere", async () => {
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
    expect(messages.update).not.toHaveBeenCalled();
    expect(threadRuns.end).not.toHaveBeenCalled();
    expect(threadRuns.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("keeps a held run open when the page hides or unloads", async () => {
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
      window.dispatchEvent(new Event("beforeunload"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(threadRuns.end).not.toHaveBeenCalled();
    expect(getAui().thread.getState().isRunning).toBe(true);
  });

  it("loads an interrupted reply with content as an error that Regenerate branches", async () => {
    const at = new Date(0);
    const { cloud, messages } = makeCloud([
      staleReply(at, [{ type: "text", text: "partial" }]),
      userRow(at),
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
    const thread = getAui().thread.getState();
    expect(thread.canResume).toBe(false);
    const state = {
      thread,
      message: { ...stale, isLast: true, runState: getMessageRunState(stale) },
      composer: { type: "thread", isEmpty: true },
    } as unknown as Parameters<typeof actionBarReloadDisabled>[0];
    expect(actionBarReloadDisabled(state)).toBe(false);
    expect(composerResumeDisabled(state)).toBe(true);

    await act(async () => {
      getAui().thread.message({ index: 1 }).reload();
    });
    await waitFor(() => expect(runs).toHaveLength(1));
    await waitFor(() =>
      expect(createCalls(messages).some((body) => body.open_run)).toBe(true),
    );
    const regenerated = createCalls(messages).find((body) => body.open_run)!;
    expect(regenerated.parent_id).toBe("msg_1");
    const branch = getAui().thread.getState().messages;
    expect(branch.map((m) => [m.role, m.status?.type])).toEqual([
      ["user", undefined],
      ["assistant", "running"],
    ]);
    expect(branch[1]!.id).not.toBe("msg_2");
    expect(getAui().thread.message({ index: 1 }).getState().branchCount).toBe(
      2,
    );
    expect(messages.delete).not.toHaveBeenCalled();
  });

  it.each<[string, { type: "text"; text: string }[]]>([
    ["no parts", []],
    ["an empty text part", [{ type: "text", text: "" }]],
  ])(
    "drops an interrupted reply with %s; the composer's Resume runs the user message again in place",
    async (_label, content) => {
      const at = new Date(0);
      const { cloud, messages } = makeCloud([
        staleReply(at, content),
        userRow(at),
      ]);
      const { runs, getRuntime, getAui } = await renderRuntime(cloud);
      await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
      await waitFor(() =>
        expect(getAui().thread.getState().canResume).toBe(true),
      );
      expect(
        getAui()
          .thread.getState()
          .messages.map((m) => m.id),
      ).toEqual(["msg_1"]);
      expect(
        composerResumeDisabled({
          thread: getAui().thread.getState(),
          composer: { type: "thread", isEmpty: true },
        } as unknown as Parameters<typeof composerResumeDisabled>[0]),
      ).toBe(false);

      await act(async () => {
        getAui().thread().resumeRun({ parentId: "msg_1" });
      });
      await waitFor(() => expect(runs).toHaveLength(1));
      await waitFor(() =>
        expect(createCalls(messages).some((body) => body.open_run)).toBe(true),
      );
      expect(
        createCalls(messages).find((body) => body.open_run)!.parent_id,
      ).toBe("msg_1");
      const branch = getAui().thread.getState().messages;
      expect(branch.map((m) => [m.role, m.status?.type])).toEqual([
        ["user", undefined],
        ["assistant", "running"],
      ]);
      expect(getAui().thread.message({ index: 1 }).getState().branchCount).toBe(
        1,
      );
      expect(getAui().thread.getState().canResume).toBe(false);
      await waitFor(() =>
        expect(messages.delete).toHaveBeenCalledWith("remote-1", ["msg_2"]),
      );

      await act(async () => {
        runs[0]!.resolve({ content: [{ type: "text", text: "hi" }] });
      });
      await waitFor(() =>
        expect(getAui().thread.getState().isRunning).toBe(false),
      );
      expect(messages.delete).toHaveBeenCalledTimes(1);
      expect(
        createCalls(messages).filter((body) => body.open_run),
      ).toHaveLength(1);
    },
  );

  it("drops an empty reply another tab drives once it goes quiet, and offers Resume then", async () => {
    const at = new Date(0);
    let rows = [
      {
        ...staleReply(at, []),
        run: { status: "running" as const, last_heartbeat_ms_ago: 0 },
      },
      userRow(at),
    ];
    const { cloud, messages } = makeCloud(rows);
    messages.list.mockImplementation(async () => ({ messages: rows }));
    const { getRuntime, getAui } = await renderRuntime(cloud, {
      staleAfter: 3_000,
    });
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(2),
    );
    expect(getMessageRunState(getAui().thread.getState().messages[1]!)).toBe(
      "in-progress",
    );
    expect(getAui().thread.getState().canResume).toBe(false);

    rows = [
      {
        ...staleReply(at, []),
        updated_at: new Date(1),
        run: { status: "running" as const, last_heartbeat_ms_ago: 3_000 },
      },
      userRow(at),
    ];
    await waitFor(
      () => expect(getAui().thread.getState().canResume).toBe(true),
      { timeout: 8_000 },
    );
    expect(
      getAui()
        .thread.getState()
        .messages.map((m) => m.id),
    ).toEqual(["msg_1"]);
    expect(messages.delete).not.toHaveBeenCalled();
  }, 15_000);

  it("keeps an empty interrupted reply that has replies under it", async () => {
    const at = new Date(0);
    const { cloud } = makeCloud([
      {
        id: "msg_3",
        parent_id: "msg_2",
        height: 2,
        created_at: at,
        updated_at: at,
        format: "aui/v0",
        content: { role: "user", content: [{ type: "text", text: "again" }] },
      },
      staleReply(at, []),
      userRow(at),
    ]);
    const { getRuntime, getAui } = await renderRuntime(cloud);
    await actSettled(() => getRuntime().threads.switchToThread("remote-1"));
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(3),
    );
    expect(getAui().thread.getState().canResume).toBe(false);
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
        run: { status: "running", last_heartbeat_ms_ago: 2_000 },
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
      error: { code: "run_in_progress", stale_in_ms: 28_000 },
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
    expect(actionBarReloadDisabled(state)).toBe(true);
    expect(getAui().thread.getState().canResume).toBe(false);
  });

  it("follows a run another session drives until it goes quiet, refreshes on request, and flips back on a late beat", async () => {
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
      replyRow("Step one", { status: "running", last_heartbeat_ms_ago: 0 }, 1),
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
      replyRow(
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
      replyRow(
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
      replyRow(
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

    rows = [replyRow("All three steps", undefined, 5), userRow];
    await act(async () => {
      await refreshCloudRun(getAui().threadListItem.getState().id);
    });
    expect(reply()?.content).toEqual([
      { type: "text", text: "All three steps" },
    ]);
    expect(getMessageRunState(reply()!)).toBeUndefined();
  }, 20_000);
});
