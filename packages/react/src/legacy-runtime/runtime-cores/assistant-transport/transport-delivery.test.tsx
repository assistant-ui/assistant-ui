// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FC } from "react";
import { useAssistantTransportRuntime } from "./useAssistantTransportRuntime";
import type { AssistantRuntime } from "../../runtime/AssistantRuntime";
import { AssistantRuntimeProvider } from "../../../context";
import type {
  AssistantTransportCommand,
  AssistantTransportStateConverter,
} from "./types";

const emptySuccessfulResponse = () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    }),
    { status: 200 },
  );

const setupRuntime = () => {
  const fetchMock = vi.fn(async () => emptySuccessfulResponse());
  vi.stubGlobal("fetch", fetchMock);

  const pendingRef: { current: AssistantTransportCommand[] } = { current: [] };
  const converter: AssistantTransportStateConverter<Record<string, never>> = (
    _state,
    { pendingCommands, isSending },
  ) => {
    pendingRef.current = pendingCommands;
    return { messages: [], isRunning: isSending };
  };

  const runtimeRef: { current: AssistantRuntime | null } = { current: null };
  const App: FC = () => {
    const runtime = useAssistantTransportRuntime({
      initialState: {},
      api: "http://localhost/api",
      converter,
      headers: {},
    });
    runtimeRef.current = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  return { App, fetchMock, pendingRef, runtimeRef };
};

describe("assistant transport delivery contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears in-transit commands when a run succeeds without state chunks", async () => {
    const { App, fetchMock, pendingRef, runtimeRef } = setupRuntime();

    await act(async () => {
      render(<App />);
    });
    await waitFor(() => expect(runtimeRef.current).not.toBeNull());

    await act(async () => {
      runtimeRef.current!.thread.append("m1");
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(runtimeRef.current!.thread.getState().isRunning).toBe(false),
    );
    await waitFor(() => expect(pendingRef.current).toHaveLength(0));
  });
});
