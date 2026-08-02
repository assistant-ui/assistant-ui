// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import type { PiClient } from "../types";
import { usePiRuntime } from "./usePiRuntime";

type RuntimeRef = {
  current: AssistantRuntime | null;
};

const TestRuntime = ({
  client,
  includeArchived,
  runtimeRef,
}: {
  client: PiClient;
  includeArchived: boolean;
  runtimeRef: RuntimeRef;
}) => {
  const runtime = usePiRuntime({ client, includeArchived });

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime, runtimeRef]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {null}
    </AssistantRuntimeProvider>
  );
};

describe("usePiRuntime", () => {
  it("keeps the thread scope stable when includeArchived changes", async () => {
    const listThreads = vi.fn().mockResolvedValue([]);
    const client = { listThreads } as unknown as PiClient;
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <TestRuntime
        client={client}
        includeArchived={false}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(listThreads).toHaveBeenCalledWith({ includeArchived: false });
      expect(runtimeRef.current).not.toBeNull();
    });
    const mainThreadId = runtimeRef.current!.threads.getState().mainThreadId;

    rerender(
      <TestRuntime
        client={client}
        includeArchived
        runtimeRef={runtimeRef}
      />,
    );

    expect(runtimeRef.current!.threads.getState().mainThreadId).toBe(
      mainThreadId,
    );
    await act(async () => {
      await runtimeRef.current!.threads.reload();
    });
    expect(listThreads).toHaveBeenLastCalledWith({ includeArchived: true });
  });
});
