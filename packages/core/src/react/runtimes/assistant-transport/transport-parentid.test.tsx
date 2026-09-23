// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FC } from "react";
import { useAssistantTransportRuntime } from "./useAssistantTransportRuntime";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
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

const toolResult = (toolCallId: string): AssistantTransportCommand => ({
  type: "add-tool-result",
  toolCallId,
  toolName: "tool",
  result: {},
  isError: false,
});

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

  it.each(["cancel", "error"] as const)(
    "drops the parentId of a message discarded by a run's %s",
    async (outcome) => {
      const { App, fetchMock, requestBodies, runtimeRef } = setupRuntime();
      let settleFirstRun!: () => void;
      fetchMock.mockImplementationOnce(
        (_url: RequestInfo | URL, init?: RequestInit) => {
          requestBodies.push(JSON.parse(init!.body as string));
          return new Promise<Response>((_resolve, reject) => {
            settleFirstRun = () => reject(new Error("network down"));
            init!.signal!.addEventListener(
              "abort",
              () => reject(init!.signal!.reason),
              { once: true },
            );
          });
        },
      );

      await act(async () => {
        render(<App />);
      });
      await waitFor(() => expect(runtimeRef.current).not.toBeNull());
      const extras = () =>
        runtimeRef.current!.thread.getState().extras as {
          sendCommand: (command: AssistantTransportCommand) => void;
        };
      await waitFor(() => expect(extras().sendCommand).toBeTypeOf("function"));

      act(() => extras().sendCommand(toolResult("t0")));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await act(async () => {
        void runtimeRef.current!.thread.append("m2");
      });
      await act(async () => {
        if (outcome === "cancel") runtimeRef.current!.thread.cancelRun();
        else settleFirstRun();
      });
      await waitFor(() =>
        expect(runtimeRef.current!.thread.getState().isRunning).toBe(false),
      );

      act(() => extras().sendCommand(toolResult("t1")));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(requestBodies[1]!["commands"]).toEqual([toolResult("t1")]);
      expect(Object.hasOwn(requestBodies[1]!, "parentId")).toBe(false);
    },
  );
});
