// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAdkRuntime } from "./useAdkRuntime";
import type { AdkEvent } from "./types";

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "adk-1",
    externalId: "adk-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "ADK session",
  })),
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("useAdkRuntime replacement runs", () => {
  it.each([
    { label: "events after cancellation", cancelFirst: true, failFirst: false },
    {
      label: "events without cancellation",
      cancelFirst: false,
      failFirst: false,
    },
    {
      label: "errors without cancellation",
      cancelFirst: false,
      failFirst: true,
    },
  ])("ignores superseded run $label", async ({ cancelFirst, failFirst }) => {
    const gates = [deferred(), deferred()];
    const resumed = [deferred(), deferred()];
    let calls = 0;
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      const call = calls++;
      await gates[call]!.promise;
      resumed[call]!.resolve();
      if (call === 0 && failFirst) throw new Error("stale run failed");
      yield {
        id: `event-${call}`,
        invocationId: `run-${call}`,
        author: "agent",
        content: { role: "model", parts: [{ text: `done-${call}` }] },
      };
    });
    const sessionAdapter = makeThreadListAdapter();
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };

    const Inner: FC = () => {
      const runtime = useAdkRuntime({
        stream,
        sessionAdapter,
        unstable_allowCancellation: true,
      });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    await act(async () => {
      render(<Inner />);
    });
    await waitFor(() => expect(capture.runtime).not.toBeNull());
    await act(async () => {
      await capture.runtime!.threads.switchToThread("adk-1");
    });

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));

    await act(async () => {
      if (cancelFirst) await capture.runtime!.thread.cancelRun();
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      });
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));

    await act(async () => {
      gates[0]!.resolve();
      await resumed[0]!.promise;
    });

    const messagesAfterFirstSettles = JSON.stringify(
      capture.runtime!.thread.getState().messages,
    );
    expect(messagesAfterFirstSettles).toContain("second");
    expect(messagesAfterFirstSettles).not.toContain("done-0");
    expect(capture.runtime!.thread.getState().isRunning).toBe(true);

    await act(async () => {
      gates[1]!.resolve();
      await resumed[1]!.promise;
    });
    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).toContain("done-1");
    expect(capture.runtime!.thread.getState().isRunning).toBe(false);
  });

  const mountWithCheckpoint = async (
    stream: (...args: never[]) => AsyncGenerator<AdkEvent>,
    getCheckpointId: () => Promise<string | null>,
    allowCancellation = false,
  ) => {
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Inner: FC = () => {
      const runtime = useAdkRuntime({
        stream: stream as never,
        sessionAdapter: makeThreadListAdapter(),
        getCheckpointId,
        unstable_allowCancellation: allowCancellation,
      });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    await act(async () => {
      render(<Inner />);
    });
    await waitFor(() => expect(capture.runtime).not.toBeNull());
    await act(async () => {
      await capture.runtime!.threads.switchToThread("adk-1");
    });
    return capture.runtime!;
  };

  it("starts an edit made while a run streams from the truncated thread", async () => {
    const releaseStale = deferred();
    const checkpoint = deferred();
    let calls = 0;
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      const call = calls++;
      if (call === 0) {
        yield {
          id: "stale-1",
          invocationId: "run-0",
          author: "agent",
          content: { role: "model", parts: [{ text: "stale partial" }] },
        };
        await releaseStale.promise;
        yield {
          id: "stale-2",
          invocationId: "run-0",
          author: "agent",
          content: { role: "model", parts: [{ text: "stale late" }] },
        };
        return;
      }
      yield {
        id: "fresh",
        invocationId: "run-1",
        author: "agent",
        content: { role: "model", parts: [{ text: "fresh answer" }] },
      };
    });
    const runtime = await mountWithCheckpoint(stream, async () => {
      await checkpoint.promise;
      return "cp-1";
    });

    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "original question" }],
      });
    });
    await waitFor(() =>
      expect(JSON.stringify(runtime.thread.getState().messages)).toContain(
        "stale partial",
      ),
    );
    const original = runtime.thread.getState().messages[0]!;

    await act(async () => {
      runtime.thread.append({
        role: "user",
        parentId: null,
        sourceId: original.id,
        content: [{ type: "text", text: "edited question" }],
      });
    });
    await act(async () => {
      releaseStale.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      checkpoint.resolve();
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    const messages = JSON.stringify(runtime.thread.getState().messages);
    expect(messages).toContain("edited question");
    expect(messages).toContain("fresh answer");
    expect(messages).not.toContain("original question");
    expect(messages).not.toContain("stale");
  });

  it("starts a reload made while a run streams from the truncated thread", async () => {
    const releaseStale = deferred();
    const checkpoint = deferred();
    let calls = 0;
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      const call = calls++;
      if (call === 0) {
        yield {
          id: "stale-1",
          invocationId: "run-0",
          author: "agent",
          content: { role: "model", parts: [{ text: "stale partial" }] },
        };
        await releaseStale.promise;
        yield {
          id: "stale-2",
          invocationId: "run-0",
          author: "agent",
          content: { role: "model", parts: [{ text: "stale late" }] },
        };
        return;
      }
      yield {
        id: "fresh",
        invocationId: "run-1",
        author: "agent",
        content: { role: "model", parts: [{ text: "fresh answer" }] },
      };
    });
    const runtime = await mountWithCheckpoint(stream, async () => {
      await checkpoint.promise;
      return "cp-1";
    });

    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "original question" }],
      });
    });
    await waitFor(() =>
      expect(JSON.stringify(runtime.thread.getState().messages)).toContain(
        "stale partial",
      ),
    );
    const answer = runtime.thread.getState().messages[1]!;

    await act(async () => {
      runtime.thread.getMessageById(answer.id).reload();
    });
    expect(runtime.thread.getState().isRunning).toBe(true);
    await act(async () => {
      releaseStale.resolve();
      await Promise.resolve();
    });
    const duringLookup = JSON.stringify(runtime.thread.getState().messages);
    expect(duringLookup).toContain("original question");
    expect(duringLookup).not.toContain("stale");
    await act(async () => {
      checkpoint.resolve();
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[1]).toEqual([
      [],
      expect.objectContaining({ checkpointId: "cp-1" }),
    ]);
    const messages = JSON.stringify(runtime.thread.getState().messages);
    expect(messages).toContain("original question");
    expect(messages).toContain("fresh answer");
    expect(messages).not.toContain("stale");
  });

  it("reports the thread running while an edit looks up its checkpoint", async () => {
    const checkpoint = deferred();
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      yield {
        id: "answer",
        invocationId: "run",
        author: "agent",
        content: { role: "model", parts: [{ text: "answer" }] },
      };
    });
    const runtime = await mountWithCheckpoint(stream, async () => {
      await checkpoint.promise;
      return "cp-1";
    });

    await act(async () => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "question" }],
      });
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    const original = runtime.thread.getState().messages[0]!;

    await act(async () => {
      runtime.thread.append({
        role: "user",
        parentId: null,
        sourceId: original.id,
        content: [{ type: "text", text: "edited question" }],
      });
    });
    expect(runtime.thread.getState().isRunning).toBe(true);

    await act(async () => {
      checkpoint.resolve();
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it("stops an edit that is still looking up its checkpoint", async () => {
    const checkpoint = deferred();
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      yield {
        id: "answer",
        invocationId: "run",
        author: "agent",
        content: { role: "model", parts: [{ text: "answer" }] },
      };
    });
    const runtime = await mountWithCheckpoint(
      stream,
      async () => {
        await checkpoint.promise;
        return "cp-1";
      },
      true,
    );

    await act(async () => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "question" }],
      });
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    const original = runtime.thread.getState().messages[0]!;

    await act(async () => {
      runtime.thread.append({
        role: "user",
        parentId: null,
        sourceId: original.id,
        content: [{ type: "text", text: "edited question" }],
      });
    });
    expect(runtime.thread.getState().isRunning).toBe(true);

    await act(async () => {
      runtime.thread.cancelRun();
    });
    expect(runtime.thread.getState().isRunning).toBe(false);
    await act(async () => {
      checkpoint.resolve();
    });
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it("stops an edit that is still looking up its checkpoint when a staged edit replaces it", async () => {
    const checkpoint = deferred();
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      yield {
        id: "answer",
        invocationId: "run",
        author: "agent",
        content: { role: "model", parts: [{ text: "answer" }] },
      };
    });
    const runtime = await mountWithCheckpoint(stream, async () => {
      await checkpoint.promise;
      return "cp-1";
    });

    await act(async () => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "question" }],
      });
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    const original = runtime.thread.getState().messages[0]!;

    await act(async () => {
      runtime.thread.append({
        role: "user",
        parentId: null,
        sourceId: original.id,
        content: [{ type: "text", text: "edited question" }],
      });
    });
    await act(async () => {
      runtime.thread.append({
        role: "user",
        parentId: null,
        sourceId: original.id,
        content: [{ type: "text", text: "staged question" }],
        startRun: false,
      });
    });
    expect(runtime.thread.getState().isRunning).toBe(false);
    await act(async () => {
      checkpoint.resolve();
    });

    expect(stream).toHaveBeenCalledTimes(1);
    expect(
      runtime.thread
        .getState()
        .messages.map((m) => (m.content[0] as { text: string }).text),
    ).toEqual(["staged question"]);
  });
});
