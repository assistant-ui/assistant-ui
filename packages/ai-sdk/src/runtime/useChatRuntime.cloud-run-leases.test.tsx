// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { AssistantCloud, CloudMessage } from "assistant-cloud";
import type { ChatTransport, UIMessage } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createControlledTransport,
  createStreamHarness,
} from "./__tests__/controlled-transport";
import { useChatRuntime } from "./useChatRuntime";

const lease = {
  lease_id: "lease_1",
  expires_in_ms: 90_000,
  heartbeat_interval_ms: 20_000,
};

type CreateBody = {
  parent_id: string | null;
  format: string;
  content: Record<string, unknown>;
  external_id?: string;
  open_run?: true;
};

const makeCloud = (getRows: () => CloudMessage[] = () => []) => {
  let created = 0;
  const create = vi.fn(async (_threadId: string, body: CreateBody) => ({
    message_id: `msg_${++created}`,
    ...(body.open_run ? { run: lease } : undefined),
  }));
  const cloud = {
    threads: {
      list: vi.fn(async () => ({
        threads: getRows().length
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
      })),
      create: vi.fn(async () => ({ thread_id: "remote-1" })),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      messages: {
        list: vi.fn(async () => ({ messages: getRows() })),
        create,
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
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

const runtimeRef: { current: ReturnType<typeof useChatRuntime> | undefined } = {
  current: undefined,
};

const at = new Date(0);
const userRow: CloudMessage = {
  id: "u1",
  parent_id: null,
  height: 0,
  created_at: at,
  updated_at: at,
  format: "ai-sdk/v6",
  content: { role: "user", parts: [{ type: "text", text: "hello" }] },
};
const replyRow = (
  text: string,
  run: CloudMessage["run"],
  updatedAt = 0,
): CloudMessage => ({
  id: "a1",
  parent_id: "u1",
  height: 1,
  created_at: at,
  updated_at: new Date(updatedAt),
  format: "ai-sdk/v6",
  content: { role: "assistant", parts: [{ type: "text", text }] },
  ...(run ? { run } : undefined),
});

const textOf = (message: { content: readonly unknown[] }) =>
  message.content
    .map((part) => {
      const { type, text } = part as { type: string; text?: string };
      return type === "text" ? (text ?? "") : "";
    })
    .join("");

const openThread = async (
  cloud: AssistantCloud,
  transport: ChatTransport<UIMessage> = createControlledTransport().transport,
) => {
  const harness = createStreamHarness();
  render(
    <CloudApp cloud={cloud} transport={transport} probe={<harness.Probe />} />,
  );
  await waitFor(() =>
    expect(harness.client().threadListItem.source).toBeTruthy(),
  );
  await act(async () => {
    await harness.client().threads.getLoadThreadsPromise();
  });
  await act(async () => {
    await runtimeRef.current!.threads.switchToThread("remote-1");
  });
  await waitFor(() =>
    expect(harness.client().thread.getState().messages).toHaveLength(2),
  );
  const reply = () => harness.client().thread.getState().messages[1]!;
  return { harness, reply };
};

const CloudApp = ({
  cloud,
  transport,
  probe,
}: {
  cloud: AssistantCloud;
  transport: ChatTransport<UIMessage>;
  probe: React.ReactNode;
}) => {
  const runtime = useChatRuntime({ cloud, transport });
  runtimeRef.current = runtime;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {probe}
    </AssistantRuntimeProvider>
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useChatRuntime with Assistant Cloud run leases", () => {
  it("stores the streaming reply in ai-sdk/v6 with a lease and ends it with the runtime's settled write", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    const { transport, emit, close } = createControlledTransport();
    const harness = createStreamHarness();
    render(
      <CloudApp
        cloud={cloud}
        transport={transport}
        probe={<harness.Probe />}
      />,
    );
    await waitFor(() =>
      expect(harness.client().threadListItem.source).toBeTruthy(),
    );

    await act(async () => harness.send());
    await waitFor(() => expect(harness.isRunning()).toBe(true));
    await act(async () => {
      emit(
        { type: "start", messageId: "reply-1" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "partial" },
      );
    });

    await waitFor(() =>
      expect(messages.create.mock.calls.some(([, body]) => body.open_run)).toBe(
        true,
      ),
    );
    const bodies = messages.create.mock.calls.map(([, body]) => body);
    const prompt = bodies.find((body) => !body.open_run)!;
    const running = bodies.find((body) => body.open_run)!;
    expect(prompt.format).toBe("ai-sdk/v6");
    expect(running).toMatchObject({
      format: "ai-sdk/v6",
      parent_id: "msg_1",
      external_id: "reply-1",
      content: { role: "assistant" },
    });

    await act(async () => {
      emit(
        { type: "text-delta", id: "t1", delta: " answer" },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      );
      close();
    });
    await waitFor(() => expect(harness.isRunning()).toBe(false));

    await waitFor(() =>
      expect(threadRuns.end).toHaveBeenCalledWith("remote-1", "lease_1", {
        reason: "done",
      }),
    );
    expect(messages.update).toHaveBeenCalledWith(
      "remote-1",
      "msg_2",
      expect.objectContaining({ lease_id: "lease_1" }),
    );
    const final = messages.update.mock.calls.at(-1)![2] as {
      content: { parts: { type: string; text?: string }[] };
    };
    expect(
      final.content.parts.some((part) => part.text === "partial answer"),
    ).toBe(true);
    expect(messages.create).toHaveBeenCalledTimes(2);
  });

  it("shows a reply another tab still writes as in progress, follows it and shows the result once it ends", async () => {
    let rows = [
      replyRow("Step one", { status: "running", expires_in_ms: 0 }, 1),
      userRow,
    ];
    const { cloud, messages } = makeCloud(() => rows);
    const { harness, reply } = await openThread(cloud);

    await waitFor(() =>
      expect(reply().status).toMatchObject({
        type: "incomplete",
        reason: "error",
        error: { code: "run_in_progress" },
      }),
    );
    expect(textOf(reply())).toBe("Step one");

    rows = [replyRow("Step one, step two", undefined, 2), userRow];
    await waitFor(() => expect(textOf(reply())).toBe("Step one, step two"), {
      timeout: 8_000,
    });
    expect(reply().status).toMatchObject({ type: "complete" });
    expect(harness.client().thread.getState().messages).toHaveLength(2);
    expect(messages.create).not.toHaveBeenCalled();
    expect(messages.update).not.toHaveBeenCalled();
  }, 15_000);

  it("resumes a stale reply in place through a continuation row with a new lease", async () => {
    const rows = [replyRow("partial", { status: "stale" }), userRow];
    const { cloud, messages, threadRuns } = makeCloud(() => rows);
    const { transport, emit, close } = createControlledTransport();
    const { harness, reply } = await openThread(cloud, transport);

    await waitFor(() =>
      expect(reply().status).toMatchObject({ error: { code: "run_stale" } }),
    );

    await act(async () => {
      void harness.client().thread().startRun({ parentId: "a1" });
    });
    await waitFor(() => expect(harness.isRunning()).toBe(true));
    await act(async () => {
      emit(
        { type: "start" },
        { type: "text-start", id: "t2" },
        { type: "text-delta", id: "t2", delta: " and the rest" },
      );
    });
    await waitFor(() =>
      expect(messages.create.mock.calls.some(([, body]) => body.open_run)).toBe(
        true,
      ),
    );
    const continuation = messages.create.mock.calls.find(
      ([, body]) => body.open_run,
    )![1];
    expect(continuation).toMatchObject({
      parent_id: "a1",
      external_id: "aui-continuation:a1",
      format: "ai-sdk/v6",
      open_run: true,
    });

    await act(async () => {
      emit({ type: "text-end", id: "t2" }, { type: "finish" });
      close();
    });
    await waitFor(() => expect(harness.isRunning()).toBe(false));
    await waitFor(
      () =>
        expect(threadRuns.end).toHaveBeenCalledWith("remote-1", "lease_1", {
          reason: "done",
        }),
      { timeout: 5_000 },
    );
    const final = messages.update.mock.calls.at(-1)!;
    expect(final[1]).toBe("msg_1");
    expect(final[2]).toMatchObject({ lease_id: "lease_1" });
    expect(JSON.stringify(final[2])).not.toContain("run_stale");
    expect(messages.update.mock.calls.every(([, id]) => id !== "a1")).toBe(
      true,
    );
    expect(harness.client().thread.getState().messages).toHaveLength(2);
    expect(reply().status?.type).not.toBe("incomplete");
  }, 15_000);

  it("loads an ended reply as a plain message", async () => {
    const rows = [replyRow("all done", undefined), userRow];
    const { cloud } = makeCloud(() => rows);
    const { reply } = await openThread(cloud);
    expect(textOf(reply())).toBe("all done");
    expect(reply().status).toMatchObject({ type: "complete" });
  });
});
