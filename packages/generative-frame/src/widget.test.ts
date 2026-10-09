import type { RenderedFrame, SafeContentFrame } from "safe-content-frame";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INIT_MESSAGE,
  METHODS,
  READY_MESSAGE,
  type InitMessage,
} from "./protocol";
import {
  createRpcPeer,
  RPC_ERROR,
  type RpcHandlers,
  type RpcPeer,
} from "./rpc";
import { DEFAULT_DARK_TOKENS } from "./theme";
import { createWidget, type CreateWidgetOptions } from "./widget";

const ORIGIN = "https://frame.test";
const ports: MessagePort[] = [];

afterEach(() => {
  for (const port of ports.splice(0)) port.close();
  document.body.replaceChildren();
});

type FakeFrame = {
  rendered: (RenderedFrame & {
    sent: { data: unknown; transfer?: Transferable[] }[];
  })[];
  html: string[];
  /** Simulates each frame runtime: answers the init handshake with a peer. */
  connect(index: number, handlers?: RpcHandlers): Promise<RpcPeer>;
};

const createFakeFrame = (): FakeFrame & { frame: SafeContentFrame } => {
  const fake: FakeFrame = {
    rendered: [],
    html: [],
    async connect(index, handlers = {}) {
      await vi.waitFor(() => expect(fake.rendered[index]).toBeDefined());
      const rendered = fake.rendered[index]!;
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: READY_MESSAGE },
          origin: ORIGIN,
          source: rendered.iframe.contentWindow,
        }),
      );
      const init = rendered.sent.find(
        (message) => (message.data as InitMessage).type === INIT_MESSAGE,
      )!;
      const port = init.transfer![0] as MessagePort;
      ports.push(port);
      const peer = createRpcPeer(port, handlers);
      peer.notify(METHODS.ready, { version: "test" });
      return peer;
    },
  };
  const frame = {
    renderHtml: vi.fn(async (html: string, container: HTMLElement) => {
      fake.html.push(html);
      const iframe = document.createElement("iframe");
      container.appendChild(iframe);
      const sent: { data: unknown; transfer?: Transferable[] }[] = [];
      const rendered = {
        iframe,
        origin: ORIGIN,
        sent,
        sendMessage: (data: unknown, transfer?: Transferable[]) => {
          sent.push({ data, ...(transfer ? { transfer } : {}) });
        },
        fullyLoadedPromiseWithTimeout: async () => {},
        dispose: vi.fn(() => iframe.remove()),
      };
      fake.rendered.push(rendered);
      return rendered;
    }),
  } as unknown as SafeContentFrame;
  return Object.assign(fake, { frame });
};

const setup = (options: Partial<CreateWidgetOptions> = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const fake = createFakeFrame();
  const widget = createWidget({ container, frame: fake.frame, ...options });
  return { container, fake, widget };
};

describe("createWidget", () => {
  it("renders the bootstrap once and sends theme and compat with the port", async () => {
    const { fake, widget } = setup({
      tokens: DEFAULT_DARK_TOKENS,
      compat: ["openai"],
      maxHeight: 500,
    });
    await fake.connect(0);
    await widget.ready;
    expect(fake.html).toHaveLength(1);
    expect(fake.html[0]).toContain('data-theme="dark"');
    const init = fake.rendered[0]!.sent[0]!.data as InitMessage;
    expect(init.compat).toEqual(["openai"]);
    expect(init.context.theme).toBe("dark");
    expect(init.context.containerDimensions).toEqual({ maxHeight: 500 });
    expect(fake.rendered[0]!.iframe.style.colorScheme).toBe("dark");
  });

  it("queues writes until the frame connects, then streams them in order", async () => {
    const { fake, widget } = setup();
    const received: unknown[] = [];
    widget.write("<h3>");
    widget.write("Hi</h3>");
    const ended = widget.end();
    expect(widget.code).toBe("<h3>Hi</h3>");
    await fake.connect(0, {
      onNotification: (method, params) => received.push([method, params]),
      onRequest: (method) => {
        received.push([method]);
        return {
          size: { width: 300, height: 40 },
          blank: false,
          errorCount: 0,
        };
      },
    });
    await expect(ended).resolves.toEqual({
      size: { width: 300, height: 40 },
      blank: false,
      errorCount: 0,
    });
    expect(received).toEqual([
      [METHODS.write, { chunk: "<h3>Hi</h3>" }],
      [METHODS.end],
    ]);
    expect(() => widget.write("more")).toThrow(/replace/);
  });

  it("routes sendPrompt, links, and tool calls to handlers with validation", async () => {
    const onPrompt = vi.fn();
    const onOpenLink = vi.fn();
    const { fake } = setup({ onPrompt, onOpenLink });
    const frame = await fake.connect(0);

    await frame.request(METHODS.message, {
      role: "user",
      content: [{ type: "text", text: "Why Q3?" }],
    });
    expect(onPrompt).toHaveBeenCalledWith("Why Q3?");

    await frame.request(METHODS.openLink, { url: "https://example.com/a" });
    expect(onOpenLink).toHaveBeenCalledWith("https://example.com/a");
    await expect(
      frame.request(METHODS.openLink, { url: "javascript:alert(1)" }),
    ).rejects.toMatchObject({
      code: RPC_ERROR.invalidParams,
    });
    await expect(
      frame.request(METHODS.callTool, { name: "x" }),
    ).rejects.toMatchObject({
      code: RPC_ERROR.methodNotFound,
    });
    await expect(frame.request("nope")).rejects.toMatchObject({
      code: RPC_ERROR.methodNotFound,
    });
  });

  it("sizes the iframe from size-changed, clamped to maxHeight", async () => {
    const onResize = vi.fn();
    const { fake } = setup({ maxHeight: 300, minHeight: 20, onResize });
    const frame = await fake.connect(0);
    frame.notify(METHODS.sizeChanged, { width: 600, height: 420 });
    await vi.waitFor(() =>
      expect(onResize).toHaveBeenCalledWith({ width: 600, height: 420 }),
    );
    expect(fake.rendered[0]!.iframe.style.height).toBe("300px");
    frame.notify(METHODS.sizeChanged, { width: 600, height: 5 });
    await vi.waitFor(() =>
      expect(fake.rendered[0]!.iframe.style.height).toBe("20px"),
    );
  });

  it("forwards frame errors and console output", async () => {
    const onError = vi.fn();
    const onLog = vi.fn();
    const { fake } = setup({ onError, onLog });
    const frame = await fake.connect(0);
    frame.notify(METHODS.error, { kind: "error", message: "boom" });
    frame.notify(METHODS.log, { level: "warn", message: "careful" });
    await vi.waitFor(() =>
      expect(onLog).toHaveBeenCalledWith({ level: "warn", message: "careful" }),
    );
    expect(onError).toHaveBeenCalledWith({ kind: "error", message: "boom" });
  });

  it("morphs in place on replace, but remounts once scripts have run", async () => {
    const { fake, widget, container } = setup();
    const calls: unknown[] = [];
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const handlers: RpcHandlers = {
      onRequest: (method, params) => {
        calls.push([method, params]);
        return result;
      },
    };
    await fake.connect(0, handlers);

    widget.write("<p>a</p>");
    await widget.end();
    await widget.replace("<p>b</p>");
    expect(fake.html).toHaveLength(1);
    expect(calls.at(-1)).toEqual([METHODS.replace, { code: "<p>b</p>" }]);

    await widget.replace("<p>c</p><script>run()</script>");
    expect(fake.html).toHaveLength(1);

    const remounted = widget.replace("<p>d</p><script>run()</script>");
    await fake.connect(1, handlers);
    await remounted;
    expect(fake.html).toHaveLength(2);
    expect(fake.rendered[0]!.dispose).toHaveBeenCalled();
    expect(calls.at(-1)).toEqual([
      METHODS.replace,
      { code: "<p>d</p><script>run()</script>" },
    ]);
    expect(container.children).toHaveLength(1);
    expect(widget.iframe).toBe(fake.rendered[1]!.iframe);
  });

  it("answers MCP Apps requests sent to window.parent", async () => {
    const { fake } = setup({ context: { locale: "de-DE" } });
    await fake.connect(0);
    const rendered = fake.rendered[0]!;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          jsonrpc: "2.0",
          id: 7,
          method: METHODS.initialize,
          params: { protocolVersion: "2026-01-26" },
        },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    await vi.waitFor(() =>
      expect(
        rendered.sent.some((m) => (m.data as { id?: unknown }).id === 7),
      ).toBe(true),
    );
    const response = rendered.sent.find(
      (m) => (m.data as { id?: unknown }).id === 7,
    )!.data as {
      result: {
        hostContext: { locale: string; theme: string };
        protocolVersion: string;
      };
    };
    expect(response.result.protocolVersion).toBe("2026-01-26");
    expect(response.result.hostContext).toMatchObject({
      locale: "de-DE",
      theme: "light",
    });
  });

  it("ignores window messages from other sources", async () => {
    const { fake } = setup();
    await vi.waitFor(() => expect(fake.rendered[0]).toBeDefined());
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: READY_MESSAGE },
        origin: "https://evil.test",
        source: fake.rendered[0]!.iframe.contentWindow,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: READY_MESSAGE },
        origin: ORIGIN,
        source: window,
      }),
    );
    expect(fake.rendered[0]!.sent).toEqual([]);
  });

  it("forwards theme changes and disposes cleanly", async () => {
    const { fake, widget, container } = setup();
    const notifications: unknown[] = [];
    await fake.connect(0, {
      onNotification: (method, params) => notifications.push([method, params]),
    });
    widget.setTheme(DEFAULT_DARK_TOKENS);
    await vi.waitFor(() => expect(notifications).toHaveLength(1));
    expect(notifications[0]).toMatchObject([
      METHODS.hostContextChanged,
      { theme: "dark" },
    ]);
    expect(fake.rendered[0]!.iframe.style.colorScheme).toBe("dark");

    widget.dispose();
    expect(container.children).toHaveLength(0);
    await expect(widget.inspect()).rejects.toThrow("disposed");
  });

  it("rejects ready when the frame never connects", async () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();
      const { widget } = setup({ readyTimeoutMs: 1000, onError });
      const ready = widget.ready.catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await ready).toBeInstanceOf(Error);
      expect(onError).toHaveBeenCalledWith({
        kind: "error",
        message: "Widget frame did not connect within 1000ms",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
