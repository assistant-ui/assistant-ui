// @vitest-environment jsdom

import { act } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuiConfig } from "@assistant-ui/store";
import { resource } from "@assistant-ui/tap";
import type { ThreadMessage } from "@assistant-ui/core";
import { ThreadPrimitive } from "../index";
import { MessagePrimitive } from "../index";
import { CloudRendererHost } from "./CloudRendererHost";

const dashboard = "https://cloud.assistant-ui.com";
const localDashboard = "http://localhost:3001";
const postMessage = vi.fn();
let resize: (() => void) | undefined;
let frame: FrameRequestCallback | undefined;

const message = (
  id: string,
  content: Extract<ThreadMessage, { role: "assistant" }>["content"] = [
    { type: "text", text: id },
  ],
): ThreadMessage => ({
  id,
  role: "assistant",
  createdAt: new Date(0),
  content,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: {},
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const TinyThread = () => (
  <ThreadPrimitive.Messages>
    {({ message: item }) => <span>{item.id}</span>}
  </ThreadPrimitive.Messages>
);

const send = (
  messages: ThreadMessage[],
  origin = dashboard,
  source: MessageEventSource | null = window.parent,
  overrides: Record<string, unknown> = {},
) => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin,
        source,
        data: {
          channel: "assistant-ui/cloud-renderer",
          version: 1,
          type: "render",
          messages,
          ...overrides,
        },
      }),
    );
  });
};

beforeEach(() => {
  vi.spyOn(window.parent, "postMessage").mockImplementation(postMessage);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(callbackTarget: Element) {
        void callbackTarget;
        resize = () => this.callback?.();
      }
      callback?: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    height: 240,
  } as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  postMessage.mockReset();
  resize = undefined;
  frame = undefined;
});

describe("CloudRendererHost", () => {
  it("announces ready to each allowed origin without a wildcard", () => {
    render(
      <CloudRendererHost allowedOrigins={[dashboard, localDashboard]}>
        <TinyThread />
      </CloudRendererHost>,
    );
    expect(postMessage.mock.calls).toEqual([
      [
        { channel: "assistant-ui/cloud-renderer", version: 1, type: "ready" },
        dashboard,
      ],
      [
        { channel: "assistant-ui/cloud-renderer", version: 1, type: "ready" },
        localDashboard,
      ],
    ]);
    expect(postMessage.mock.calls.every((call) => call[1] !== "*")).toBe(true);
  });

  it("draws the posted branch and replaces it on the next render", async () => {
    render(
      <CloudRendererHost>
        <TinyThread />
      </CloudRendererHost>,
    );
    expect(screen.queryByText("first")).toBeNull();
    send([message("first")]);
    expect(screen.getByText("first")).toBeTruthy();
    send([message("second")]);
    await waitFor(() => expect(screen.getByText("second")).toBeTruthy());
    expect(screen.queryByText("first")).toBeNull();
  });

  it("ignores other origins, windows and protocol versions", () => {
    render(
      <CloudRendererHost>
        <TinyThread />
      </CloudRendererHost>,
    );
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    send([message("bad-origin")], "https://other.example");
    send([message("bad-source")], dashboard, iframe.contentWindow);
    send([message("bad-version")], dashboard, window.parent, { version: 2 });
    expect(screen.queryByText(/bad-/)).toBeNull();
    send([message("accepted")]);
    expect(screen.getByText("accepted")).toBeTruthy();
    iframe.remove();
  });

  it("reports changed content height only to the connected origin", () => {
    render(
      <CloudRendererHost allowedOrigins={[dashboard, localDashboard]}>
        <TinyThread />
      </CloudRendererHost>,
    );
    send([message("first")], localDashboard);
    act(() => {
      resize?.();
      frame?.(0);
    });
    expect(
      postMessage.mock.calls.filter(([data]) => data.type === "size"),
    ).toEqual([
      [
        {
          channel: "assistant-ui/cloud-renderer",
          version: 1,
          type: "size",
          height: 240,
        },
        localDashboard,
      ],
    ]);
  });

  it("reports an empty render's zero height", () => {
    vi.mocked(Element.prototype.getBoundingClientRect).mockReturnValue({
      height: 0,
    } as DOMRect);
    render(
      <CloudRendererHost>
        <TinyThread />
      </CloudRendererHost>,
    );
    send([]);
    act(() => {
      resize?.();
      frame?.(0);
    });
    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: "assistant-ui/cloud-renderer",
        version: 1,
        type: "size",
        height: 0,
      },
      dashboard,
    );
  });

  it("posts nothing and still listens with no allowed origins", () => {
    expect(() =>
      render(
        <CloudRendererHost allowedOrigins={[]}>
          <TinyThread />
        </CloudRendererHost>,
      ),
    ).not.toThrow();
    expect(postMessage).not.toHaveBeenCalled();
    send([message("ignored")]);
    expect(screen.queryByText("ignored")).toBeNull();
  });

  it("drops a connected origin that leaves the allowed origins", async () => {
    const view = render(
      <CloudRendererHost allowedOrigins={[dashboard]}>
        <TinyThread />
      </CloudRendererHost>,
    );
    send([message("from-dashboard")]);
    expect(await screen.findByText("from-dashboard")).toBeTruthy();
    view.rerender(
      <CloudRendererHost allowedOrigins={[localDashboard]}>
        <TinyThread />
      </CloudRendererHost>,
    );
    send([message("from-local")], localDashboard);
    expect(await screen.findByText("from-local")).toBeTruthy();
    postMessage.mockClear();
    act(() => {
      resize?.();
      frame?.(0);
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "size" }),
      localDashboard,
    );
  });

  it("reports a child rendering error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Failing = () => {
      throw new Error("render failed");
    };
    render(
      <CloudRendererHost>
        <Failing />
      </CloudRendererHost>,
    );
    send([message("first")]);
    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: "assistant-ui/cloud-renderer",
        version: 1,
        type: "error",
        message: "render failed",
      },
      dashboard,
    );
  });

  it("keeps the drawn subtree inert and renders config tool and data UIs without MCP widgets", async () => {
    const ToolUI = () => <b>tool UI</b>;
    const DataUI = () => <b>data UI</b>;
    const McpUI = () => <b>MCP widget</b>;
    const toolsState = {
      toolUIs: { lookup: [{ render: ToolUI, standalone: false }] },
      mcpApp: { render: McpUI },
    };
    const dataState = { renderers: { metric: [DataUI] }, fallbacks: [] };
    const tools = resource(() => ({
      getState: () => toolsState,
      setToolUI: () => () => {},
    }));
    const dataRenderers = resource(() => ({
      getState: () => dataState,
      setDataUI: () => () => {},
      setFallbackDataUI: () => () => {},
    }));
    const config = AuiConfig({
      tools: tools(),
      dataRenderers: dataRenderers(),
    });
    const Parts = () => (
      <ThreadPrimitive.Messages>
        {() => (
          <MessagePrimitive.Parts
            components={{ tools: { Fallback: () => <i>fallback</i> } }}
          />
        )}
      </ThreadPrimitive.Messages>
    );
    const view = render(
      <CloudRendererHost config={config}>
        <Parts />
      </CloudRendererHost>,
    );
    send([
      message("first", [
        {
          type: "tool-call",
          toolCallId: "call",
          toolName: "lookup",
          args: {},
          argsText: "{}",
          mcp: { app: { resourceUri: "ui://widget" } },
        },
        {
          type: "tool-call",
          toolCallId: "other",
          toolName: "other",
          args: {},
          argsText: "{}",
          mcp: { app: { resourceUri: "ui://widget" } },
        },
        { type: "data", name: "metric", data: 1 },
      ]),
    ]);
    await waitFor(() => {
      expect(screen.getByText("tool UI")).toBeTruthy();
      expect(screen.getByText("data UI")).toBeTruthy();
      expect(screen.getByText("fallback")).toBeTruthy();
    });
    expect(screen.queryByText("MCP widget")).toBeNull();
    expect(view.container.firstElementChild?.hasAttribute("inert")).toBe(true);
  });
  it("allows an origin written with a path or a trailing slash", async () => {
    render(
      <CloudRendererHost allowedOrigins={[`${dashboard}/`]}>
        <TinyThread />
      </CloudRendererHost>,
    );
    expect(postMessage).toHaveBeenCalledWith(
      { channel: "assistant-ui/cloud-renderer", version: 1, type: "ready" },
      dashboard,
    );
    send([message("normalised")]);
    expect(await screen.findByText("normalised")).toBeTruthy();
  });
});
