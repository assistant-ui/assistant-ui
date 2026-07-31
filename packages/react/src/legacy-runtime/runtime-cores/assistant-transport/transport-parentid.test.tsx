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
  const requestBodies: Record<string, unknown>[] = [];
  const fetchMock = vi.fn(
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(init!.body as string));
      return emptySuccessfulResponse();
    },
  );
  vi.stubGlobal("fetch", fetchMock);

  const converter: AssistantTransportStateConverter<Record<string, never>> = (
    _state,
    { isSending },
  ) => ({ messages: [], isRunning: isSending });

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

  return { App, fetchMock, requestBodies, runtimeRef };
};

describe("assistant transport parentId lifetime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("consumes parentId per run: the append's run carries it, a later sendCommand run omits it", async () => {
    const { App, fetchMock, requestBodies, runtimeRef } = setupRuntime();

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
    expect(Object.hasOwn(requestBodies[0]!, "parentId")).toBe(true);

    const extras = runtimeRef.current!.thread.getState().extras as {
      sendCommand: (command: AssistantTransportCommand) => void;
    };
    await act(async () => {
      extras.sendCommand({
        type: "add-tool-result",
        toolCallId: "t1",
        toolName: "tool",
        result: {},
        isError: false,
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(Object.hasOwn(requestBodies[1]!, "parentId")).toBe(false);
  });
});
