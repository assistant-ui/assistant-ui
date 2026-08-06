// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
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

// Asserts through a subscribed consumer rather than the runtime object, which
// stays correct on read even when the store identity never moves.
const QueuedPrompts = () => {
  const prompts = useAuiState((s) =>
    s.composer.queue.map((item) => item.prompt).join(","),
  );
  return <div data-testid="queued">{prompts}</div>;
};

const mount = (runtime: AssistantRuntime) =>
  render(
    <AssistantRuntimeProvider runtime={runtime}>
      <QueuedPrompts />
    </AssistantRuntimeProvider>,
  );

afterEach(() => {
  cleanup();
});

describe("useAgUiRuntime unstable_enableMessageQueue", () => {
  it("buffers a send during a run and flushes it once the run settles", async () => {
    const { agent, runAgent, release } = gatedAgent();

    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, unstable_enableMessageQueue: true }),
    );
    mount(result.current);

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

    // buffered rather than starting a second run, and visible to subscribers
    expect(runAgent).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("queued").textContent).toBe("second"),
    );

    await act(async () => {
      release();
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("queued").textContent).toBe(""),
    );
  });

  it("keeps accepting sends after a queued run fails", async () => {
    const runAgent = vi.fn(
      async (_input: unknown, subscriber: { onRunFinalized?: () => void }) => {
        if (runAgent.mock.calls.length === 1) throw new Error("boom");
        subscriber.onRunFinalized?.();
      },
    );
    const agent = { runAgent } as unknown as HttpAgent;

    const { result } = renderHook(() =>
      useAgUiRuntime({
        agent,
        unstable_enableMessageQueue: true,
        onError: () => {},
      }),
    );
    mount(result.current);

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

    // the failed run must not leave the queue permanently busy
    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
        parentId: result.current.thread.getState().messages.at(-1)?.id ?? null,
      });
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("queued").textContent).toBe(""),
    );
  });

  it("does not wedge on an append that starts no run", async () => {
    const { agent, runAgent } = gatedAgent();

    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, unstable_enableMessageQueue: true }),
    );
    mount(result.current);

    // startRun false never reaches the agent, so it produces no falling edge
    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "staged" }],
        startRun: false,
      });
    });
    expect(runAgent).toHaveBeenCalledTimes(0);

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "real" }],
        parentId: result.current.thread.getState().messages.at(-1)?.id ?? null,
      });
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("queued").textContent).toBe(""),
    );
  });

  it("clears queued items when the flag is turned off", async () => {
    const { agent, runAgent } = gatedAgent();

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useAgUiRuntime({ agent, unstable_enableMessageQueue: enabled }),
      { initialProps: { enabled: true } },
    );
    mount(result.current);

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
        parentId: result.current.thread.getState().messages.at(-1)?.id ?? null,
      });
    });
    await waitFor(() =>
      expect(screen.getByTestId("queued").textContent).toBe("second"),
    );

    await act(async () => {
      rerender({ enabled: false });
    });

    expect(result.current.thread.getState().capabilities.queue).toBe(false);
    await waitFor(() =>
      expect(screen.getByTestId("queued").textContent).toBe(""),
    );
  });

  it("leaves the queue capability off when the flag is not set", () => {
    const { agent } = gatedAgent();

    const { result } = renderHook(() => useAgUiRuntime({ agent }));

    expect(result.current.thread.getState().capabilities.queue).toBe(false);
  });
});
