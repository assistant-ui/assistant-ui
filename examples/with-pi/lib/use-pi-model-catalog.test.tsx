// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  usePiRuntime,
  type PiClient,
  type PiModelInfo,
} from "@assistant-ui/react-pi";
import { Thread } from "../components/assistant-ui/elements/thread";
import { PiHandshakeProvider } from "../components/pi-handshake";
import type { PiModelOption } from "./pi-model-catalog";
import { usePiModelCatalog } from "./use-pi-model-catalog";

vi.mock("@/components/assistant-ui/elements/markdown-text", () => ({
  MarkdownText: () => null,
}));

vi.mock(
  "@/components/assistant-ui/elements/model-selector.aui",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/components/assistant-ui/elements/model-selector.aui")
      >();
    const { createElement } = await import("react");
    return {
      ...original,
      ModelSelector: {
        Root: ({
          models,
          onValueChange,
        }: {
          models: PiModelOption[];
          onValueChange: (value: string) => void;
        }) =>
          createElement(
            "div",
            null,
            ...models.map((model) =>
              createElement(
                "button",
                {
                  key: model.id,
                  type: "button",
                  onClick: () => onValueChange(model.id),
                },
                model.name,
              ),
            ),
          ),
        Trigger: () => null,
        Content: () => null,
        Search: () => null,
        List: () => null,
      },
    };
  },
);

const handshakeModels: PiModelOption[] = [
  {
    id: "openai:gpt-5",
    name: "GPT-5",
    description: "openai",
    provider: "openai",
    modelId: "gpt-5",
  },
];

const extensionModel: PiModelInfo = {
  provider: "local-extension",
  modelId: "custom-model",
  name: "Extension model",
  supportsThinking: true,
  availableThinkingLevels: ["high"],
};

const responseFor = (models: PiModelInfo[]) =>
  ({ ok: true, json: async () => models }) as Response;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePiModelCatalog", () => {
  it("loads the active thread catalog and ignores a late response after switching threads", async () => {
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ threadId }: { threadId: string }) =>
        usePiModelCatalog({
          enabled: true,
          threadId,
          loadState: "loaded",
          runStatus: "idle",
          handshakeModels,
        }),
      { initialProps: { threadId: "thread-a" } },
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/pi/models?threadId=thread-a",
    );

    rerender({ threadId: "thread-b" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(firstSignal).toBeDefined();
    expect(firstSignal?.aborted).toBe(true);

    await act(async () => {
      secondRequest.resolve(responseFor([extensionModel]));
      await secondRequest.promise;
    });
    await waitFor(() =>
      expect(result.current.map((model) => model.id)).toEqual([
        "local-extension:custom-model",
      ]),
    );
    expect(result.current[0]).toMatchObject({
      name: "Extension model",
      provider: "local-extension",
      modelId: "custom-model",
      efforts: [{ id: "high", name: "High" }],
    });

    await act(async () => {
      firstRequest.resolve(
        responseFor([{ provider: "stale-extension", modelId: "stale-model" }]),
      );
      await firstRequest.promise;
    });
    expect(result.current.map((model) => model.id)).toEqual([
      "local-extension:custom-model",
    ]);
  });

  it("uses the handshake before a thread loads and retains a selected model missing from refreshed catalogs", async () => {
    const initialRequest = deferred<Response>();
    const refreshRequest = deferred<Response>();
    const failedRefresh = deferred<Response>();
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockImplementationOnce(() => initialRequest.promise)
      .mockImplementationOnce(() => refreshRequest.promise)
      .mockImplementationOnce(() => failedRefresh.promise);
    vi.stubGlobal("fetch", fetchMock);

    const selectedModel: PiModelOption = {
      id: "local-extension:custom-model",
      name: "Extension model",
      description: "local-extension",
      provider: "local-extension",
      modelId: "custom-model",
      efforts: [{ id: "high", name: "High" }],
    };
    type HookProps = {
      loadState: "pending" | "loaded";
      runStatus: "idle" | "running";
      selectedModelId?: string | undefined;
      selected?: PiModelOption | undefined;
    };
    const { result, rerender } = renderHook<PiModelOption[], HookProps>(
      ({ loadState, runStatus, selectedModelId, selected }: HookProps) =>
        usePiModelCatalog({
          enabled: true,
          threadId: "thread-a",
          loadState,
          runStatus,
          handshakeModels,
          selectedModelId,
          selectedModel: selected,
        }),
      {
        initialProps: {
          loadState: "pending" as const,
          runStatus: "idle" as const,
          selectedModelId: undefined,
          selected: undefined,
        },
      },
    );

    expect(result.current).toEqual(handshakeModels);
    expect(fetchMock).not.toHaveBeenCalled();

    rerender({
      loadState: "loaded",
      runStatus: "idle",
      selectedModelId: undefined,
      selected: undefined,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      initialRequest.resolve(responseFor([extensionModel]));
      await initialRequest.promise;
    });
    await waitFor(() =>
      expect(result.current.map((model) => model.id)).toEqual([
        "local-extension:custom-model",
      ]),
    );

    rerender({
      loadState: "loaded",
      runStatus: "running",
      selectedModelId: selectedModel.id,
      selected: selectedModel,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => {
      refreshRequest.resolve(responseFor([]));
    });
    await waitFor(() =>
      expect(result.current.map((model) => model.id)).toEqual([
        "local-extension:custom-model",
      ]),
    );
    expect(result.current[0]).toEqual(selectedModel);

    rerender({
      loadState: "loaded",
      runStatus: "idle",
      selectedModelId: selectedModel.id,
      selected: selectedModel,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await act(async () => {
      failedRefresh.reject(new Error("catalog unavailable"));
    });
    await waitFor(() =>
      expect(result.current.map((model) => model.id)).toEqual([
        "openai:gpt-5",
        "local-extension:custom-model",
      ]),
    );
  });
});

describe("Thread composer model selector", () => {
  it("selects a thread extension model absent from the handshake", async () => {
    const threadId = "pi-thread-123";
    const snapshot = {
      metadata: { id: threadId, status: "idle" as const },
      messages: [],
    };
    const setModel = vi.fn().mockResolvedValue(undefined);
    const client = {
      listThreads: vi.fn().mockResolvedValue([snapshot.metadata]),
      getThread: vi.fn().mockResolvedValue(snapshot),
      subscribe: vi.fn().mockReturnValue(() => {}),
      setModel,
    } as unknown as PiClient;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(responseFor([extensionModel]));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const Harness = () => {
      const runtime = usePiRuntime({ client, initialThreadId: threadId });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <PiHandshakeProvider value={{ models: handshakeModels }}>
            <Thread />
          </PiHandshakeProvider>
        </AssistantRuntimeProvider>
      );
    };

    render(<Harness />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/pi/models?threadId=${threadId}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Extension model" }),
    );
    await waitFor(() =>
      expect(setModel).toHaveBeenCalledWith(threadId, {
        provider: "local-extension",
        modelId: "custom-model",
      }),
    );
  });
});
