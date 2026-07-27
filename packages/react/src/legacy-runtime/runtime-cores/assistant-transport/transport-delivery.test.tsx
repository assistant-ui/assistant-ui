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
  const requestBodies: { commands: AssistantTransportCommand[] }[] = [];
  const fetchMock = vi.fn(
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(init!.body as string));
      return emptySuccessfulResponse();
    },
  );
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

  return { App, fetchMock, requestBodies, pendingRef, runtimeRef };
};

describe("assistant transport delivery contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears in-transit commands when a run succeeds without state chunks and does not re-send them", async () => {
    const { App, fetchMock, requestBodies, pendingRef, runtimeRef } =
      setupRuntime();

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
    expect(pendingRef.current).toHaveLength(0);

    await act(async () => {
      runtimeRef.current!.thread.append("m2");
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestBodies[1]!.commands).toHaveLength(1);
    expect(JSON.stringify(requestBodies[1])).not.toContain("m1");
  });
});
