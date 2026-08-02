// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
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
  it("reloads archived threads without replacing the new thread", async () => {
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
      expect(runtimeRef.current!.threads.getState().mainThreadId).toMatch(
        /^__LOCALID_/,
      );
    });
    const mainThreadId = runtimeRef.current!.threads.getState().mainThreadId;

    rerender(
      <TestRuntime client={client} includeArchived runtimeRef={runtimeRef} />,
    );

    await waitFor(() => {
      expect(listThreads).toHaveBeenLastCalledWith({ includeArchived: true });
      expect(runtimeRef.current!.threads.getState().isLoading).toBe(false);
    });
    expect(listThreads).toHaveBeenCalledTimes(2);
    expect(runtimeRef.current!.threads.getState().mainThreadId).toBe(
      mainThreadId,
    );
  });
});
