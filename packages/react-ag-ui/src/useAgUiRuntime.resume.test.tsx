// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";

afterEach(cleanup);

describe("useAgUiRuntime resume capability", () => {
  it("does not advertise a checkpoint from the generic AG-UI run endpoint", async () => {
    const runAgent = vi.fn(async () => {});
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const checkpointOptions = { canResume: true };
    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, ...checkpointOptions }),
    );
    await waitFor(() =>
      expect(result.current.thread.getState().isLoading).toBe(false),
    );
    expect(result.current.thread.getState().canResume).toBe(false);
    expect(runAgent).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.thread.resumeRun({ parentId: null });
    });
    expect(runAgent).toHaveBeenCalledOnce();
    expect(result.current.thread.getState().canResume).toBe(false);
  });
});
