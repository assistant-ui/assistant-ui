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
    let calls = 0;
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      const call = calls++;
      await gates[call]!.promise;
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
      return <AssistantRuntimeProvider runtime={runtime} />;
    };

    await act(async () => {
      render(<Inner />);
    });
    await waitFor(() => expect(capture.runtime).not.toBeNull());
    await act(async () => {
      await capture.runtime!.threads.switchToThread("adk-1");
    });

    let firstSend!: Promise<void>;
    act(() => {
      firstSend = capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));

    let secondSend!: Promise<void>;
    await act(async () => {
      if (cancelFirst) await capture.runtime!.thread.cancelRun();
      secondSend = capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      });
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));

    await act(async () => {
      gates[0]!.resolve();
      await firstSend;
    });

    const messagesAfterFirstSettles = JSON.stringify(
      capture.runtime!.thread.getState().messages,
    );
    expect(messagesAfterFirstSettles).toContain("second");
    expect(messagesAfterFirstSettles).not.toContain("done-0");
    expect(capture.runtime!.thread.getState().isRunning).toBe(true);

    await act(async () => {
      gates[1]!.resolve();
      await secondSend;
    });
    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).toContain("done-1");
    expect(capture.runtime!.thread.getState().isRunning).toBe(false);
  });
});
