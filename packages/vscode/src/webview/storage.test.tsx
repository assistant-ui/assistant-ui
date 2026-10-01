// @vitest-environment jsdom

import type { AssistantRuntime, ChatModelAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  createLocalStorageAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { serveWebviewHost, type MementoLike } from "../host/serve";
import { createInMemoryBridge } from "../testUtils";
import { createVSCodeStorage } from "./storage";

const disposers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  for (const dispose of disposers.splice(0)) dispose();
});

const createMemento = (): MementoLike & { values: Map<string, unknown> } => {
  const values = new Map<string, unknown>();
  return {
    values,
    get: (key) => values.get(key),
    update: async (key, value) => {
      if (value === undefined) values.delete(key);
      else values.set(key, structuredClone(value));
    },
  };
};

const connect = (memento: MementoLike) => {
  const bridge = createInMemoryBridge();
  const host = serveWebviewHost(bridge.webview, { storage: memento });
  disposers.push(() => host.dispose());
  return createVSCodeStorage(bridge.port);
};

const echoModel: ChatModelAdapter = {
  async run({ messages }) {
    const last = messages.at(-1)!.content[0];
    const text = last?.type === "text" ? last.text : "";
    return { content: [{ type: "text", text: `echo: ${text}` }] };
  },
};

const mountWebview = (memento: MementoLike) => {
  const adapter = createLocalStorageAdapter({ storage: connect(memento) });
  const ref: { runtime?: AssistantRuntime } = {};
  const App = () => {
    const runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useThreadRuntime() {
        return useLocalRuntime(echoModel);
      },
    });
    ref.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<App />);
  return { ...view, runtime: () => ref.runtime! };
};

const texts = (runtime: AssistantRuntime) =>
  runtime.thread
    .getState()
    .messages.map((message) =>
      message.content.map((part) => (part.type === "text" ? part.text : "")),
    )
    .flat();

describe("createVSCodeStorage", () => {
  it("restores threads and messages in a fresh webview", async () => {
    const memento = createMemento();
    const first = mountWebview(memento);

    await act(async () => {
      first.runtime().thread.append("hello");
    });
    await waitFor(() => {
      expect(texts(first.runtime())).toEqual(["hello", "echo: hello"]);
      expect(first.runtime().thread.getState().isRunning).toBe(false);
    });
    const remoteId = first.runtime().threads.mainItem.getState().remoteId;
    expect(remoteId).toBeDefined();
    await act(() => first.runtime().threads.mainItem.rename("Greeting"));
    await waitFor(() => {
      const stored = memento.values.get(
        `@assistant-ui/vscode:@assistant-ui:messages:${remoteId}`,
      );
      expect(JSON.parse(stored as string).messages).toHaveLength(2);
    });
    first.unmount();

    const second = mountWebview(memento);

    await waitFor(() =>
      expect(second.runtime().threads.getState().threadIds).toContain(remoteId),
    );
    await act(() => second.runtime().threads.switchToThread(remoteId!));

    await waitFor(() =>
      expect(texts(second.runtime())).toEqual(["hello", "echo: hello"]),
    );
    expect(second.runtime().threads.mainItem.getState().title).toBe("Greeting");
  });

  it("namespaces keys and stores values as strings", async () => {
    const memento = createMemento();
    const storage = connect(memento);

    await storage.setItem("a", '{"x":1}');

    expect([...memento.values]).toEqual([
      ["@assistant-ui/vscode:a", '{"x":1}'],
    ]);
    await expect(storage.getItem("a")).resolves.toBe('{"x":1}');
    await expect(storage.getItem("missing")).resolves.toBeNull();
    await storage.removeItem("a");
    expect(memento.values.size).toBe(0);
  });

  it("uses the host's storagePrefix", async () => {
    const memento = createMemento();
    const bridge = createInMemoryBridge();
    const host = serveWebviewHost(bridge.webview, {
      storage: memento,
      storagePrefix: "chat/",
    });
    disposers.push(() => host.dispose());

    await createVSCodeStorage(bridge.port).setItem("k", "v");

    expect(memento.get("chat/k")).toBe("v");
  });

  it("reads a non-string Memento value as missing", async () => {
    const memento = createMemento();
    memento.values.set("@assistant-ui/vscode:k", { not: "a string" });

    await expect(connect(memento).getItem("k")).resolves.toBeNull();
  });

  it("rejects when the Memento update fails", async () => {
    const memento: MementoLike = {
      get: () => undefined,
      update: () => Promise.reject(new Error("disk full")),
    };

    await expect(connect(memento).setItem("k", "v")).rejects.toThrow(
      "disk full",
    );
  });

  it("rejects when the host serves no storage", async () => {
    const bridge = createInMemoryBridge();
    const host = serveWebviewHost(bridge.webview);
    disposers.push(() => host.dispose());

    await expect(createVSCodeStorage(bridge.port).getItem("k")).rejects.toThrow(
      "storage.getItem is not served by this host",
    );
  });
});
