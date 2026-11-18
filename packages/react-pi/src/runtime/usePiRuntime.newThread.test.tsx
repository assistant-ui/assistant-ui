// @vitest-environment jsdom

import { act, createElement, StrictMode, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type {
  AppendMessage,
  AssistantRuntime,
  ExternalStoreAdapter,
} from "@assistant-ui/react";
import type { PiClient, PiThreadSnapshot } from "../types";

const mocks = vi.hoisted(() => ({
  adapters: [] as ExternalStoreAdapter<unknown>[],
  sendMessage: vi.fn<PiClient["sendMessage"]>().mockResolvedValue(undefined),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useExternalStoreRuntime: (
      adapter: Parameters<typeof original.useExternalStoreRuntime>[0],
    ) => {
      mocks.adapters.push(adapter);
      return original.useExternalStoreRuntime(adapter);
    },
  };
});

import { usePiRuntime } from "./usePiRuntime";
import { usePiHostUiRequests, usePiRuntimeExtras, usePiSession } from "./hooks";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: PiThreadSnapshot = {
  metadata: { id: "srv-1", status: "idle" },
  messages: [],
};

const createClient = (
  createThreadImpl: PiClient["createThread"] = () => Promise.resolve(snapshot),
) => {
  const createThread = vi.fn(createThreadImpl);
  const client = {
    listThreads: vi.fn().mockResolvedValue([]),
    createThread,
    getThread: vi.fn().mockResolvedValue(snapshot),
    subscribe: vi.fn().mockReturnValue(() => {}),
    sendMessage: mocks.sendMessage,
    setModel: vi.fn<PiClient["setModel"]>().mockResolvedValue(undefined),
    setThinkingLevel: vi
      .fn<PiClient["setThinkingLevel"]>()
      .mockResolvedValue(undefined),
    respondToHostUiRequest: vi.fn().mockResolvedValue(undefined),
    cancelRun: vi.fn().mockResolvedValue(undefined),
    clearQueue: vi.fn().mockResolvedValue({ steering: [], followUp: [] }),
    getAvailableModels: vi.fn().mockResolvedValue([]),
    renameThread: vi.fn().mockResolvedValue(undefined),
    archiveThread: vi.fn().mockResolvedValue(undefined),
    unarchiveThread: vi.fn().mockResolvedValue(undefined),
    deleteThread: vi.fn().mockResolvedValue(undefined),
  } satisfies PiClient;
  return { client, createThread };
};

const sentTexts = () =>
  mocks.sendMessage.mock.calls.map((call) => call[1].content);

const selectedModel = { provider: "anthropic", modelId: "claude-opus-5" };

const mountRuntime = async (client: PiClient) => {
  let runtime!: AssistantRuntime;
  let extras!: ReturnType<typeof usePiRuntimeExtras>;
  let session!: ReturnType<typeof usePiSession>;
  let hostUi!: ReturnType<typeof usePiHostUiRequests>;
  const onError = vi.fn();
  const Probe = () => {
    extras = usePiRuntimeExtras();
    session = usePiSession();
    hostUi = usePiHostUiRequests();
    return null;
  };
  const Harness = () => {
    runtime = usePiRuntime({ client, onError });
    return createElement(
      AssistantRuntimeProvider,
      { runtime },
      createElement(Probe),
    );
  };
  root = createRoot(document.createElement("div"));
  await act(async () => root!.render(createElement(Harness)));
  return {
    runtime,
    onError,
    get extras() {
      return extras;
    },
    get session() {
      return session;
    },
    get hostUi() {
      return hostUi;
    },
  };
};

const appendMessage = (text: string): AppendMessage => ({
  role: "user",
  content: [{ type: "text", text }],
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: undefined,
  metadata: { custom: {} },
});

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.adapters.length = 0;
});

describe("usePiRuntime new-thread first message", () => {
  it("delivers the first message of a brand-new thread", async () => {
    const { client, createThread } = createClient();
    let runtime!: AssistantRuntime;

    const Harness = () => {
      runtime = usePiRuntime({ client });
      return createElement(AssistantRuntimeProvider, { runtime }, null);
    };

    root = createRoot(document.createElement("div"));
    await act(async () => {
      root!.render(createElement(Harness));
    });
    await act(async () => {});

    await act(async () => {
      await runtime.thread.append("hello pi");
    });
    await act(async () => {});
    await act(async () => {});

    expect(createThread).toHaveBeenCalledTimes(1);
    expect(createThread.mock.calls[0]?.[0]?.initialMessage).toBeUndefined();
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
    expect(sentTexts()).toEqual(["hello pi"]);
  });

  it("delivers both messages when a second send lands during initialization", async () => {
    let resolveCreate!: (value: PiThreadSnapshot) => void;
    const { client, createThread } = createClient(
      () =>
        new Promise<PiThreadSnapshot>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    let runtime!: AssistantRuntime;

    const Harness = () => {
      runtime = usePiRuntime({ client });
      return createElement(AssistantRuntimeProvider, { runtime }, null);
    };

    root = createRoot(document.createElement("div"));
    await act(async () => {
      root!.render(createElement(Harness));
    });
    await act(async () => {});

    let first!: Promise<void> | void;
    let second!: Promise<void> | void;
    await act(async () => {
      first = runtime.thread.append("message A");
      second = runtime.thread.append("message B");
    });

    await act(async () => {
      resolveCreate(snapshot);
      await Promise.all([first, second]);
    });
    await act(async () => {});

    expect(createThread).toHaveBeenCalledTimes(1);
    expect(createThread.mock.calls[0]?.[0]?.initialMessage).toBeUndefined();
    expect(sentTexts()).toEqual(["message A", "message B"]);
  });

  it("drops a pending new-thread send after runtime teardown", async () => {
    const sessionCreate = Promise.withResolvers<PiThreadSnapshot>();
    const { client, createThread } = createClient(() => sessionCreate.promise);
    let runtime!: AssistantRuntime;

    const Harness = () => {
      runtime = usePiRuntime({ client });
      return createElement(AssistantRuntimeProvider, { runtime }, null);
    };

    root = createRoot(document.createElement("div"));
    await act(async () => {
      root!.render(createElement(Harness));
    });
    await act(async () => {});

    await act(async () => {
      runtime.thread.append("late message");
    });
    await vi.waitFor(() => expect(createThread).toHaveBeenCalledOnce());

    act(() => root!.unmount());
    root = undefined;
    sessionCreate.resolve(snapshot);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("keeps a pending new-thread send across StrictMode effect replay", async () => {
    const sessionCreate = Promise.withResolvers<PiThreadSnapshot>();
    const { client, createThread } = createClient(() => sessionCreate.promise);
    let sendPromise: Promise<void> | void;

    const Harness = () => {
      const runtime = usePiRuntime({ client });
      const sentRef = useRef(false);
      useEffect(() => {
        if (sentRef.current) return;
        sentRef.current = true;
        sendPromise = mocks.adapters
          .at(-1)!
          .onNew(appendMessage("strict mode message"));
      }, []);
      return createElement(AssistantRuntimeProvider, { runtime }, null);
    };

    root = createRoot(document.createElement("div"));
    await act(async () => {
      root!.render(createElement(StrictMode, null, createElement(Harness)));
    });
    await vi.waitFor(() => expect(createThread).toHaveBeenCalledOnce());

    await act(async () => {
      sessionCreate.resolve(snapshot);
      await sendPromise;
    });

    expect(mocks.sendMessage).toHaveBeenCalledOnce();
    expect(sentTexts()).toEqual(["strict mode message"]);
  });

  it("publishes the draft model and thinking level before any send", async () => {
    const { client, createThread } = createClient();
    const view = await mountRuntime(client);
    await act(async () => {
      await view.extras.setModel(selectedModel);
      await view.extras.setThinkingLevel("high");
    });

    const config = { ...selectedModel, thinkingLevel: "high" };
    expect(view.extras.metadata.config).toEqual(config);
    expect(view.extras.state.metadata.config).toEqual(config);
    expect(createThread).not.toHaveBeenCalled();
    expect(client.setModel).not.toHaveBeenCalled();
    expect(client.setThinkingLevel).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("applies both draft setters before sending after pending initialization", async () => {
    const sessionCreate = Promise.withResolvers<PiThreadSnapshot>();
    const modelSet = Promise.withResolvers<void>();
    const thinkingSet = Promise.withResolvers<void>();
    const { client, createThread } = createClient(() => sessionCreate.promise);
    client.setModel.mockReturnValueOnce(modelSet.promise);
    client.setThinkingLevel.mockReturnValueOnce(thinkingSet.promise);
    const view = await mountRuntime(client);

    await act(async () => view.runtime.thread.append("hello pi"));
    expect(createThread).toHaveBeenCalledOnce();
    await act(async () => {
      await view.extras.setModel(selectedModel);
      await view.extras.setThinkingLevel("high");
    });
    expect(client.setModel).not.toHaveBeenCalled();
    expect(client.setThinkingLevel).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    await act(async () => sessionCreate.resolve(snapshot));
    expect(client.setModel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      selectedModel,
    );
    expect(client.setThinkingLevel).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    await act(async () => modelSet.resolve());
    expect(client.setThinkingLevel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      "high",
    );
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    await act(async () => thinkingSet.resolve());
    expect(sentTexts()).toEqual(["hello pi"]);
    expect(client.setModel.mock.invocationCallOrder[0]).toBeLessThan(
      client.setThinkingLevel.mock.invocationCallOrder[0]!,
    );
    expect(client.setThinkingLevel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendMessage.mock.invocationCallOrder[0]!,
    );
  });

  it("sends concurrent messages in order after applying the draft once", async () => {
    const sessionCreate = Promise.withResolvers<PiThreadSnapshot>();
    const modelSet = Promise.withResolvers<void>();
    const thinkingSet = Promise.withResolvers<void>();
    const { client, createThread } = createClient(() => sessionCreate.promise);
    client.setModel.mockReturnValueOnce(modelSet.promise);
    client.setThinkingLevel.mockReturnValueOnce(thinkingSet.promise);
    const view = await mountRuntime(client);
    await act(async () => {
      await view.extras.setModel(selectedModel);
      await view.extras.setThinkingLevel("high");
    });

    await act(async () => {
      view.runtime.thread.append("message A");
      view.runtime.thread.append("message B");
    });
    await act(async () => sessionCreate.resolve(snapshot));
    expect(sentTexts()).toEqual([]);
    expect(client.setModel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      selectedModel,
    );

    await act(async () => modelSet.resolve());
    expect(sentTexts()).toEqual([]);
    expect(client.setThinkingLevel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      "high",
    );

    await act(async () => thinkingSet.resolve());
    expect(createThread).toHaveBeenCalledOnce();
    expect(sentTexts()).toEqual(["message A", "message B"]);
    expect(client.setThinkingLevel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendMessage.mock.invocationCallOrder[0]!,
    );
  });

  it("retains the draft after initialization fails and applies it on retry", async () => {
    const failure = new Error("create failed");
    const { client, createThread } = createClient();
    createThread.mockRejectedValueOnce(failure);
    const view = await mountRuntime(client);
    await act(async () => {
      await view.extras.setModel(selectedModel);
      await view.extras.setThinkingLevel("high");
    });

    await act(async () => {
      await expect(
        mocks.adapters.at(-1)!.onNew(appendMessage("first attempt")),
      ).rejects.toBe(failure);
    });
    expect(view.onError).toHaveBeenCalledWith(failure);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(view.extras.metadata.config).toEqual({
      ...selectedModel,
      thinkingLevel: "high",
    });

    await act(async () => {
      await mocks.adapters.at(-1)!.onNew(appendMessage("retry"));
    });
    expect(createThread).toHaveBeenCalledTimes(2);
    expect(client.setModel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      selectedModel,
    );
    expect(client.setThinkingLevel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      "high",
    );
    expect(sentTexts()).toEqual(["retry"]);
    expect(client.setThinkingLevel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendMessage.mock.invocationCallOrder[0]!,
    );
  });

  it("rejects the send when the client rejects the selected model", async () => {
    const failure = new Error("model unavailable");
    const { client } = createClient();
    client.setModel.mockRejectedValueOnce(failure);
    const view = await mountRuntime(client);
    await act(async () => view.extras.setModel(selectedModel));

    await act(async () => {
      await expect(
        mocks.adapters.at(-1)!.onNew(appendMessage("hello pi")),
      ).rejects.toBe(failure);
    });
    expect(client.setModel).toHaveBeenCalledExactlyOnceWith(
      "srv-1",
      selectedModel,
    );
    expect(view.onError).toHaveBeenCalledWith(failure);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("exposes the pending session through usePiSession on a new thread", async () => {
    const { client, createThread } = createClient();
    const view = await mountRuntime(client);

    expect(view.session).toEqual({ id: "__pending__", status: "idle" });
    expect(view.session).toBe(view.extras.metadata);
    expect(createThread).not.toHaveBeenCalled();
  });

  it("accepts a host UI response on a new thread without a client request", async () => {
    const { client } = createClient();
    const view = await mountRuntime(client);

    expect(view.hostUi.requests).toEqual([]);
    await expect(
      view.hostUi.respond({ requestId: "pending", confirmed: true }),
    ).resolves.toBeUndefined();
    expect(client.respondToHostUiRequest).not.toHaveBeenCalled();
  });

  it.each(["model", "thinking level"])(
    "drops the send after teardown while applying the draft %s",
    async (pendingSetter) => {
      const setter = Promise.withResolvers<void>();
      const { client } = createClient();
      if (pendingSetter === "model") {
        client.setModel.mockReturnValueOnce(setter.promise);
      } else {
        client.setThinkingLevel.mockReturnValueOnce(setter.promise);
      }
      const view = await mountRuntime(client);
      await act(async () => {
        await view.extras.setModel(selectedModel);
        await view.extras.setThinkingLevel("high");
      });

      let send!: Promise<void>;
      await act(async () => {
        send = mocks.adapters.at(-1)!.onNew(appendMessage("late message"));
      });
      expect(client.setModel).toHaveBeenCalledExactlyOnceWith(
        "srv-1",
        selectedModel,
      );
      if (pendingSetter === "thinking level") {
        expect(client.setThinkingLevel).toHaveBeenCalledExactlyOnceWith(
          "srv-1",
          "high",
        );
      }
      act(() => root!.unmount());
      root = undefined;
      setter.resolve();
      await send;

      expect(mocks.sendMessage).not.toHaveBeenCalled();
      if (pendingSetter === "model") {
        expect(client.setThinkingLevel).not.toHaveBeenCalled();
      }
    },
  );
});
