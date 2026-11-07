// @vitest-environment jsdom

import type { AssistantRuntime, ChatModelAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  createLocalStorageAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode, useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebviewRoutes } from "../host/router";
import { serveWebviewHost, type MementoLike } from "../host/serve";
import type { BridgeMessage } from "../protocol";
import { createInMemoryBridge } from "../testUtils";

const globals = globalThis as { acquireVsCodeApi?: () => unknown };
const disposers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  for (const dispose of disposers.splice(0)) dispose();
  delete globals.acquireVsCodeApi;
});

const createMemento = (): MementoLike => {
  const values = new Map<string, unknown>();
  return {
    get: (key) => values.get(key),
    update: async (key, value) => {
      if (value === undefined) values.delete(key);
      else values.set(key, value);
    },
  };
};

/** Loads a fresh copy of the webview entry wired to a host through `window` messages. */
const loadWebviewEntry = async (routes: WebviewRoutes = {}) => {
  const bridge = createInMemoryBridge();
  const requests: Request[] = [];
  const openExternal = vi.fn();
  const host = serveWebviewHost(bridge.webview, {
    routes: {
      "/api/echo": {
        GET: (request) => {
          requests.push(request);
          const text = new URL(request.url).searchParams.get("text");
          return new Response(`echo: ${text}`);
        },
      },
      ...routes,
    },
    openExternal,
    storage: createMemento(),
  });
  const disconnect = bridge.port.onMessage((data) => {
    // jsdom replaces the global Uint8Array, so a chunk cloned with Node's
    // structuredClone fails the webview's instanceof check until it is rebuilt.
    const { chunk } = data as { chunk?: Uint8Array };
    const message = chunk
      ? { ...(data as object), chunk: Uint8Array.from(chunk) }
      : data;
    window.dispatchEvent(new MessageEvent("message", { data: message }));
  });
  disposers.push(disconnect, () => host.dispose());
  const acquire = vi.fn(() => ({ postMessage: bridge.port.postMessage }));
  globals.acquireVsCodeApi = acquire;
  vi.resetModules();
  const entry = await import("../webview");
  return { bridge, requests, openExternal, acquire, entry };
};

describe("the webview entry under StrictMode", () => {
  it("acquires the API once, keeps its requests alive and installs one link interceptor", async () => {
    const { bridge, requests, openExternal, acquire, entry } =
      await loadWebviewEntry();
    const { createVSCodeStorage, installLinkInterceptor, vscodeFetch } = entry;
    const model: ChatModelAdapter = {
      async run({ messages, abortSignal }) {
        const part = messages.at(-1)?.content[0];
        const text = part?.type === "text" ? part.text : "";
        const response = await vscodeFetch(
          `/api/echo?text=${encodeURIComponent(text)}`,
          { signal: abortSignal },
        );
        return { content: [{ type: "text", text: await response.text() }] };
      },
    };
    const adapter = createLocalStorageAdapter({
      storage: createVSCodeStorage(),
    });
    const originalOpen = window.open;
    const ref: { runtime?: AssistantRuntime } = {};

    const App = () => {
      useEffect(() => installLinkInterceptor(), []);
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: function useThreadRuntime() {
          return useLocalRuntime(model);
        },
      });
      ref.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <a href="https://example.com/docs">docs</a>
        </AssistantRuntimeProvider>
      );
    };

    const view = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await act(async () => {
      ref.runtime!.thread.append("hello");
    });

    await waitFor(() => {
      const last = ref.runtime!.thread.getState().messages.at(-1);
      expect(last?.content).toEqual([{ type: "text", text: "echo: hello" }]);
    });
    expect(acquire).toHaveBeenCalledOnce();
    const resets = (bridge.webviewToHost as BridgeMessage[]).filter(
      (message) => message.kind === "fetch:reset",
    );
    expect(resets).toHaveLength(1);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.signal.aborted).toBe(false);

    fireEvent.click(screen.getByRole("link", { name: "docs" }));
    await waitFor(() => expect(openExternal).toHaveBeenCalled());
    expect(openExternal).toHaveBeenCalledExactlyOnceWith(
      "https://example.com/docs",
    );

    view.unmount();
    expect(window.open).toBe(originalOpen);
  });

  it("hands a mount-time response to the replayed effect after the first one cancels", async () => {
    const held: { request: Request; release: (text: string) => void }[] = [];
    const { entry } = await loadWebviewEntry({
      "/api/hold": {
        GET: (request) =>
          new Promise((resolve) => {
            held.push({
              request,
              release: (text) => resolve(new Response(text)),
            });
          }),
      },
    });
    const { vscodeFetch } = entry;
    const consumed: string[] = [];

    const Status = () => {
      const [text, setText] = useState("loading");
      useEffect(() => {
        const controller = new AbortController();
        vscodeFetch("/api/hold", { signal: controller.signal })
          .then((response) => response.text())
          .then(
            (body) => {
              consumed.push(body);
              setText(body);
            },
            () => {},
          );
        return () => controller.abort();
      }, []);
      return <p>{text}</p>;
    };

    render(
      <StrictMode>
        <Status />
      </StrictMode>,
    );

    await waitFor(() => expect(held).toHaveLength(2));
    const [cancelled, active] = held;
    await waitFor(() => expect(cancelled!.request.signal.aborted).toBe(true));
    expect(active!.request.signal.aborted).toBe(false);

    act(() => {
      cancelled!.release("stale");
      active!.release("fresh");
    });

    // Responses arrive in order, so a leaked "stale" would be consumed first.
    expect(await screen.findByText("fresh")).toBeDefined();
    expect(consumed).toEqual(["fresh"]);
  });
});
