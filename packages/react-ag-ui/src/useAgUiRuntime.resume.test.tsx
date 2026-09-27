// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";

afterEach(cleanup);

describe("useAgUiRuntime resume capability", () => {
  it("uses the host checkpoint state and disables resume while a run is pending", async () => {
    let finish!: () => void;
    const runAgent = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const { result, rerender } = renderHook(
      ({ canResume }: { canResume?: boolean }) =>
        useAgUiRuntime({ agent, canResume }),
      { initialProps: {} },
    );
    await waitFor(() =>
      expect(result.current.thread.getState().isLoading).toBe(false),
    );
    expect(result.current.thread.getState().canResume).toBe(false);
    rerender({ canResume: true });
    expect(result.current.thread.getState().canResume).toBe(true);
    rerender({ canResume: false });
    expect(result.current.thread.getState().canResume).toBe(false);
    rerender({ canResume: true });
    act(() => {
      result.current.thread.resumeRun({ parentId: null });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledOnce());
    expect(result.current.thread.getState().canResume).toBe(false);
    await act(async () => {
      finish();
    });
    await waitFor(() =>
      expect(result.current.thread.getState().isRunning).toBe(false),
    );
    expect(result.current.thread.getState().canResume).toBe(true);
    rerender({ canResume: false });
    expect(result.current.thread.getState().canResume).toBe(false);
  });
});
