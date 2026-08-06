// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";

const gatedAgent = () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const runAgent = vi.fn(
    async (_input: unknown, subscriber: { onRunFinalized?: () => void }) => {
      if (runAgent.mock.calls.length === 1) await gate;
      subscriber.onRunFinalized?.();
    },
  );
  return {
    agent: { runAgent } as unknown as HttpAgent,
    runAgent,
    release: () => release(),
  };
};

describe("useAgUiRuntime unstable_enableMessageQueue", () => {
  it("buffers a send during a run and flushes it once the run settles", async () => {
    const { agent, runAgent, release } = gatedAgent();

    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, unstable_enableMessageQueue: true }),
    );

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));
    expect(result.current.thread.getState().capabilities.queue).toBe(true);

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
        parentId: result.current.thread.getState().messages.at(-1)?.id ?? null,
      });
    });

    // buffered rather than starting a second run
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(
      result.current.thread.composer
        .getState()
        .queue.map((item) => item.prompt),
    ).toEqual(["second"]);

    await act(async () => {
      release();
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(result.current.thread.composer.getState().queue).toEqual([]);
  });

  it("leaves the queue capability off when the flag is not set", () => {
    const { agent } = gatedAgent();

    const { result } = renderHook(() => useAgUiRuntime({ agent }));

    expect(result.current.thread.getState().capabilities.queue).toBe(false);
  });
});
