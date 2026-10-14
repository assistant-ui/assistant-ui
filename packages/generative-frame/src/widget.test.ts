import type { RenderedFrame, SafeContentFrame } from "safe-content-frame";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
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
import { previewWidget } from "./preview";
import { DEFAULT_DARK_TOKENS } from "./theme";
import {
  clearWidgetStorage,
  createWidget,
  widgetStorageSalt,
  type CreateWidgetOptions,
  type UiMessageParams,
} from "./widget";

const mocks = vi.hoisted(() => ({
  constructed: [] as { product: string; options: unknown; renders: number }[],
  render: undefined as
    | ((html: string, container: HTMLElement) => Promise<unknown>)
    | undefined,
}));

vi.mock("safe-content-frame", async (importOriginal) => ({
  ...(await importOriginal<typeof import("safe-content-frame")>()),
  SafeContentFrame: class {
    record: { product: string; options: unknown; renders: number };
    constructor(product: string, options: unknown = {}) {
      this.record = { product, options, renders: 0 };
      mocks.constructed.push(this.record);
    }
    renderHtml(html: string, container: HTMLElement) {
      this.record.renders++;
      return mocks.render!(html, container);
    }
  },
}));

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
  it("sends initial state and the latest accepted state to each new session", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({
      initialState: { count: 1 },
      onWidgetState,
    });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const first = await fake.connect(0, { onRequest: () => result });
    expect((fake.rendered[0]!.sent[0]!.data as InitMessage).state).toEqual({
      count: 1,
    });
    await widget.ready;
    first.notify(METHODS.widgetState, { state: { count: 2 } });
    await vi.waitFor(() =>
      expect(onWidgetState).toHaveBeenCalledWith({ count: 2 }),
    );
    widget.write("<script>run()</script>");
    await widget.end();
    let finishReplace!: (value: unknown) => void;
    const remounted = widget.replace("<script>again()</script>");
    const second = await fake.connect(1, {
      onRequest: () =>
        new Promise((resolve) => {
          finishReplace = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishReplace).toBeDefined());
    second.notify(METHODS.widgetState, { state: { count: 99 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onWidgetState).toHaveBeenCalledTimes(1);
    finishReplace(result);
    await remounted;
    expect((fake.rendered[1]!.sent[0]!.data as InitMessage).state).toEqual({
      count: 2,
    });
    widget.dispose();
  });

  it("advertises text and structured model context only to a host that accepts it", async () => {
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const capabilities = async (options: Partial<CreateWidgetOptions>) => {
      const { fake, widget } = setup(options);
      const peer = await fake.connect(0, { onRequest: () => result });
      const init = (await peer.request(METHODS.initialize, {})) as {
        hostCapabilities: Record<string, unknown>;
      };
      widget.dispose();
      return init.hostCapabilities;
    };
    expect(
      (await capabilities({ onUpdateModelContext: () => ({}) }))[
        "updateModelContext"
      ],
    ).toEqual({ text: {}, structuredContent: {} });
    expect(await capabilities({})).not.toHaveProperty("updateModelContext");
  });

  it("keeps state set while a replacement loads and seeds the next remount", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({ onWidgetState });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    await fake.connect(0, { onRequest: () => result });
    await widget.ready;
    widget.write("<script>run()</script>");
    await widget.end();

    let finishReplace!: (value: unknown) => void;
    const replacement = widget.replace("<script>again()</script>");
    const second = await fake.connect(1, {
      onRequest: () =>
        new Promise((resolve) => {
          finishReplace = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishReplace).toBeDefined());
    second.notify(METHODS.widgetState, { state: { count: 5 } });
    await second.request(METHODS.initialize, {});
    expect(onWidgetState).not.toHaveBeenCalled();
    finishReplace(result);
    await replacement;
    expect(onWidgetState).toHaveBeenCalledExactlyOnceWith({ count: 5 });

    const next = widget.replace("<script>third()</script>");
    await fake.connect(2, { onRequest: () => result });
    await next;
    expect((fake.rendered[2]!.sent[0]!.data as InitMessage).state).toEqual({
      count: 5,
    });
    widget.dispose();
  });

  it("keeps what the shown frame set when its replacement fails, and drops the replacement's state", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({
      initialState: { count: 1 },
      onWidgetState,
    });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const first = await fake.connect(0, { onRequest: () => result });
    await widget.ready;
    widget.write("<script>run()</script>");
    await widget.end();

    let failReplace!: (error: Error) => void;
    const replacement = widget.replace("<script>again()</script>");
    const second = await fake.connect(1, {
      onRequest: () =>
        new Promise((_, reject) => {
          failReplace = reject;
        }),
    });
    await vi.waitFor(() => expect(failReplace).toBeDefined());
    second.notify(METHODS.widgetState, { state: { count: 9 } });
    await second.request(METHODS.initialize, {});
    first.notify(METHODS.widgetState, { state: { count: 8 } });
    await first.request(METHODS.initialize, {});
    expect(onWidgetState).not.toHaveBeenCalled();
    failReplace(new Error("render failed"));
    await expect(replacement).rejects.toThrow("render failed");
    expect(onWidgetState).toHaveBeenCalledExactlyOnceWith({ count: 8 });

    first.notify(METHODS.widgetState, { state: { count: 2 } });
    await vi.waitFor(() =>
      expect(onWidgetState).toHaveBeenLastCalledWith({ count: 2 }),
    );
    const next = widget.replace("<script>third()</script>");
    await fake.connect(2, { onRequest: () => result });
    await next;
    expect((fake.rendered[2]!.sent[0]!.data as InitMessage).state).toEqual({
      count: 2,
    });
    widget.dispose();
  });

  it("ignores the old session's state while its replacement is pending", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({
      initialState: { count: 1 },
      onWidgetState,
    });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const first = await fake.connect(0, { onRequest: () => result });
    await widget.ready;
    widget.write("<script>run()</script>");
    await widget.end();

    let finishReplace!: (value: unknown) => void;
    const replacement = widget.replace("<script>again()</script>");
    await fake.connect(1, {
      onRequest: () =>
        new Promise((resolve) => {
          finishReplace = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishReplace).toBeDefined());
    first.notify(METHODS.widgetState, { state: { count: 9 } });
    await first.request(METHODS.initialize, {});
    expect(onWidgetState).not.toHaveBeenCalled();
    finishReplace(result);
    await replacement;
    expect(onWidgetState).not.toHaveBeenCalled();
    expect((fake.rendered[1]!.sent[0]!.data as InitMessage).state).toEqual({
      count: 1,
    });
    widget.dispose();
  });

  it("ignores a delivered notification from a superseded pending session", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({ onWidgetState });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    await fake.connect(0, { onRequest: () => result });
    await widget.ready;
    widget.write("<script>run()</script>");
    await widget.end();

    let finishFirst!: (value: unknown) => void;
    const firstReplacement = widget.replace("<script>first()</script>");
    const superseded = await fake.connect(1, {
      onRequest: () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishFirst).toBeDefined());
    let finishSecond!: (value: unknown) => void;
    const secondReplacement = widget.replace("<script>second()</script>");
    const latest = await fake.connect(2, {
      onRequest: () =>
        new Promise((resolve) => {
          finishSecond = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishSecond).toBeDefined());
    superseded.notify(METHODS.widgetState, { state: { count: 9 } });
    await superseded.request(METHODS.initialize, {});
    expect(onWidgetState).not.toHaveBeenCalled();
    latest.notify(METHODS.widgetState, { state: { count: 2 } });
    await latest.request(METHODS.initialize, {});
    finishSecond(result);
    await secondReplacement;
    expect(onWidgetState).toHaveBeenCalledExactlyOnceWith({ count: 2 });
    finishFirst(result);
    await Promise.allSettled([firstReplacement]);
    widget.dispose();
  });

  const stubClipboard = (isActive: boolean | undefined) => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    if (isActive !== undefined)
      Object.defineProperty(navigator, "userActivation", {
        configurable: true,
        value: { isActive },
      });
    onTestFinished(() => {
      Reflect.deleteProperty(navigator, "clipboard");
      Reflect.deleteProperty(navigator, "userActivation");
    });
    return writeText;
  };

  it("copies through onCopyText or the page's clipboard while the widget has focus during a user action", async () => {
    const writeText = stubClipboard(true);
    const onCopyText = vi.fn();
    const custom = setup({ onCopyText });
    const customFrame = await custom.fake.connect(0);
    await custom.widget.ready;
    custom.fake.rendered[0]!.iframe.focus();
    await customFrame.request(METHODS.copyText, { text: "Shopping list" });
    expect(onCopyText).toHaveBeenCalledExactlyOnceWith("Shopping list");
    await expect(
      customFrame.request(METHODS.copyText, { text: 1 }),
    ).rejects.toThrow("requires a string 'text'");
    custom.widget.dispose();

    const plain = setup();
    const plainFrame = await plain.fake.connect(0);
    await plain.widget.ready;
    plain.fake.rendered[0]!.iframe.focus();
    await plainFrame.request(METHODS.copyText, { text: "a" });
    expect(writeText).toHaveBeenCalledExactlyOnceWith("a");
    plain.widget.dispose();
  });

  it.each([
    ["the page has a user action but focus is elsewhere", true, false],
    ["the widget has focus without a user action", false, true],
    ["the browser has no user activation API", undefined, true],
  ] as const)(
    "rejects a copy when %s",
    async (_case, isActive, focusWidget) => {
      const writeText = stubClipboard(isActive);
      const onCopyText = vi.fn();
      const { container, fake, widget } = setup({ onCopyText });
      const frame = await fake.connect(0);
      await widget.ready;
      if (focusWidget) fake.rendered[0]!.iframe.focus();
      else {
        const button = document.createElement("button");
        container.after(button);
        button.focus();
      }
      await expect(
        frame.request(METHODS.copyText, { text: "a" }),
      ).rejects.toThrow("needs a user action in the widget");
      expect(onCopyText).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      widget.dispose();
    },
  );

  it("drops widget state that cannot be JSON stringified", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({ onWidgetState });
    const first = await fake.connect(0);
    await widget.ready;
    first.notify(METHODS.widgetState, { state: BigInt(1) });
    first.notify(METHODS.widgetState, { state: undefined });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onWidgetState).not.toHaveBeenCalled();
    widget.dispose();
  });

  it("drops nested values that are not plain JSON", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({ onWidgetState });
    const first = await fake.connect(0);
    await widget.ready;
    first.notify(METHODS.widgetState, {
      state: { nested: { date: new Date() } },
    });
    first.notify(METHODS.widgetState, { state: { numbers: [1, NaN] } });
    first.notify(METHODS.widgetState, {
      state: { nested: { missing: undefined } },
    });
    await first.request(METHODS.initialize, {});
    expect(onWidgetState).not.toHaveBeenCalled();
    widget.dispose();
  });

  it("drops state whose JSON would pass the length limit, counting escapes and shared objects", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({ onWidgetState });
    const first = await fake.connect(0);
    await widget.ready;
    let doubling: unknown = 0;
    for (let depth = 0; depth < 20; depth++) doubling = [doubling, doubling];
    first.notify(METHODS.widgetState, { state: doubling });
    const long = { s: "x".repeat(1 << 20) };
    first.notify(METHODS.widgetState, { state: Array(49_000).fill(long) });
    const short = { s: "x".repeat(1000) };
    first.notify(METHODS.widgetState, { state: Array(2000).fill(short) });
    first.notify(METHODS.widgetState, {
      state: { [`k${"y".repeat(1 << 20)}`]: 1 },
    });
    const control = String.fromCharCode(1).repeat(200_000);
    first.notify(METHODS.widgetState, { state: control });
    first.notify(METHODS.widgetState, { state: { [control]: 1 } });
    await first.request(METHODS.initialize, {});
    expect(onWidgetState).not.toHaveBeenCalled();
    widget.dispose();
  });

  it("keeps state that shares an object or holds a long string within the limit", async () => {
    const onWidgetState = vi.fn();
    const { fake, widget } = setup({ onWidgetState });
    const first = await fake.connect(0);
    await widget.ready;
    const item = { id: 1 };
    first.notify(METHODS.widgetState, {
      state: { items: [item], selected: item },
    });
    first.notify(METHODS.widgetState, {
      state: { note: "x".repeat(100_000) },
    });
    await first.request(METHODS.initialize, {});
    expect(onWidgetState).toHaveBeenCalledTimes(2);
    expect(onWidgetState).toHaveBeenNthCalledWith(1, {
      items: [{ id: 1 }],
      selected: { id: 1 },
    });
    widget.dispose();
  });

  it("renders the bootstrap once and sends the theme with the port", async () => {
    const { fake, widget } = setup({
      tokens: DEFAULT_DARK_TOKENS,
      maxHeight: 500,
    });
    await fake.connect(0);
    await widget.ready;
    expect(fake.html).toHaveLength(1);
    expect(fake.html[0]).toContain('data-theme="dark"');
    const init = fake.rendered[0]!.sent[0]!.data as InitMessage;
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

  it("extracts sparse message content without traversing holes", async () => {
    const onPrompt = vi.fn();
    const { fake } = setup({ onPrompt });
    const frame = await fake.connect(0);
    const content: NonNullable<UiMessageParams["content"]> = new Array(
      50_000_000,
    );
    content[0] = { type: "text", text: "sparse prompt" };

    const lastIndex = String(content.length - 1);
    const arrayPrototypeLength = Array.prototype.length;
    const visitedHole = vi.fn();
    Object.defineProperty(Array.prototype, lastIndex, {
      configurable: true,
      get() {
        visitedHole();
        return undefined;
      },
    });

    try {
      await frame.request(METHODS.message, { role: "user", content });
    } finally {
      delete (Array.prototype as unknown[])[Number(lastIndex)];
      Array.prototype.length = arrayPrototypeLength;
    }

    expect(visitedHole).not.toHaveBeenCalled();
    expect(onPrompt).toHaveBeenCalledWith("sparse prompt");
  });

  it("ignores non-index message content properties after structured clone", async () => {
    const onPrompt = vi.fn();
    const { fake } = setup({ onPrompt });
    const frame = await fake.connect(0);

    for (const property of ["filter", "constructor"] as const) {
      const content: NonNullable<UiMessageParams["content"]> = [
        { type: "text", text: "message text" },
      ];
      Object.defineProperty(content, property, {
        configurable: true,
        enumerable: true,
        value: { type: "text", text: "not an array element" },
      });

      await frame.request(METHODS.message, { role: "user", content });
    }

    expect(onPrompt).toHaveBeenNthCalledWith(1, "message text");
    expect(onPrompt).toHaveBeenNthCalledWith(2, "message text");
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

  it("keeps the frame transparent until the runtime reports its first size", async () => {
    const { fake, widget } = setup();
    await vi.waitFor(() => expect(fake.rendered[0]).toBeDefined());
    const slot = fake.rendered[0]!.iframe.parentElement!;
    expect(slot.style.opacity).toBe("0");
    const frame = await fake.connect(0);
    await widget.ready;
    expect(slot.style.opacity).toBe("0");
    frame.notify(METHODS.sizeChanged, { width: 600, height: 120 });
    await vi.waitFor(() => expect(slot.style.opacity).toBe("1"));
    expect(slot.style.transition).toContain("opacity");
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
    const onInitialized = vi.fn();
    const { fake } = setup({
      context: { locale: "de-DE" },
      onInitialized,
    });
    await fake.connect(0);
    const rendered = fake.rendered[0]!;
    const initializeParams = {
      protocolVersion: "2026-01-26",
      appInfo: { name: "example-app", version: "1.2.3" },
      appCapabilities: {
        availableDisplayModes: ["inline", "sidebar"],
        tools: { listChanged: true },
      },
    };
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          jsonrpc: "2.0",
          id: 7,
          method: METHODS.initialize,
          params: initializeParams,
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
    expect(onInitialized).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { jsonrpc: "2.0", method: METHODS.initialized },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    expect(onInitialized).toHaveBeenCalledOnce();
    expect(onInitialized).toHaveBeenCalledWith({
      protocolVersion: "2026-01-26",
      appInfo: { name: "example-app", version: "1.2.3" },
      appCapabilities: {
        availableDisplayModes: ["inline"],
        tools: { listChanged: true },
      },
    });
  });

  it("omits malformed initialization fields and keeps the protocol fallback", async () => {
    const onInitialized = vi.fn();
    const { fake } = setup({ onInitialized });
    await fake.connect(0);
    const rendered = fake.rendered[0]!;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          jsonrpc: "2.0",
          id: 8,
          method: METHODS.initialize,
          params: {
            protocolVersion: 1,
            appInfo: { name: "incomplete" },
            appCapabilities: { availableDisplayModes: "fullscreen" },
          },
        },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    await vi.waitFor(() =>
      expect(
        rendered.sent.some(
          (message) => (message.data as { id?: unknown }).id === 8,
        ),
      ).toBe(true),
    );
    const response = rendered.sent.find(
      (message) => (message.data as { id?: unknown }).id === 8,
    )!.data as { result: { protocolVersion: string } };
    expect(response.result.protocolVersion).toBe("2026-01-26");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { jsonrpc: "2.0", method: METHODS.initialized },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    expect(onInitialized).toHaveBeenCalledWith({ appCapabilities: {} });
  });

  it("passes empty initialization params when initialized arrives first", async () => {
    const onInitialized = vi.fn();
    const { fake } = setup({ onInitialized });
    await fake.connect(0);
    const rendered = fake.rendered[0]!;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { jsonrpc: "2.0", method: METHODS.initialized },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    expect(onInitialized).toHaveBeenCalledWith({});
  });

  it("reads present display modes without invoking array-owned methods", async () => {
    const onInitialized = vi.fn();
    const { fake } = setup({ onInitialized });
    await fake.connect(0);
    const rendered = fake.rendered[0]!;
    const availableDisplayModes = Object.assign(["inline"], {
      filter: 0,
      constructor: 0,
    });
    availableDisplayModes.length = 2 ** 32 - 1;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          jsonrpc: "2.0",
          id: 9,
          method: METHODS.initialize,
          params: { appCapabilities: { availableDisplayModes } },
        },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    await vi.waitFor(() =>
      expect(
        rendered.sent.some(
          (message) => (message.data as { id?: unknown }).id === 9,
        ),
      ).toBe(true),
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { jsonrpc: "2.0", method: METHODS.initialized },
        origin: ORIGIN,
        source: rendered.iframe.contentWindow,
      }),
    );
    expect(onInitialized).toHaveBeenCalledWith({
      appCapabilities: { availableDisplayModes: ["inline"] },
    });
  });

  it("delivers a remounted frame's initialization once it is shown", async () => {
    const onInitialized = vi.fn();
    const { fake, widget } = setup({ onInitialized });
    const shown: unknown[] = [];
    onInitialized.mockImplementation(() =>
      shown.push({
        iframe: widget.iframe,
        hidden: widget.iframe?.parentElement?.style.visibility === "hidden",
        firstConnected: fake.rendered[0]!.iframe.isConnected,
      }),
    );
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const first = await fake.connect(0, { onRequest: () => result });
    void first.request(METHODS.initialize, {
      appCapabilities: { availableDisplayModes: ["inline"] },
    });
    first.notify(METHODS.initialized);
    await vi.waitFor(() => expect(onInitialized).toHaveBeenCalledTimes(1));
    widget.write("<script>run()</script>");
    await widget.end();

    let finishReplace!: (value: unknown) => void;
    const remounted = widget.replace("<p>b</p><script>run()</script>");
    const second = await fake.connect(1, {
      onRequest: () =>
        new Promise((resolve) => {
          finishReplace = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishReplace).toBeDefined());
    void second.request(METHODS.initialize, {
      appCapabilities: { availableDisplayModes: ["fullscreen"] },
    });
    second.notify(METHODS.initialized);
    finishReplace(result);
    await remounted;

    expect(onInitialized).toHaveBeenCalledTimes(2);
    expect(onInitialized).toHaveBeenLastCalledWith({
      appCapabilities: { availableDisplayModes: ["fullscreen"] },
    });
    expect(shown).toEqual([
      { iframe: fake.rendered[0]!.iframe, hidden: false, firstConnected: true },
      {
        iframe: fake.rendered[1]!.iframe,
        hidden: false,
        firstConnected: false,
      },
    ]);
  });

  it("delivers a remounted frame's initialization before onResize and survives a throwing handler", async () => {
    const events: string[] = [];
    const { fake, widget } = setup({
      onInitialized: () => {
        events.push("initialized");
        throw new Error("host handler failed");
      },
      onResize: () => events.push("resize"),
    });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    await fake.connect(0, { onRequest: () => result });
    widget.write("<script>run()</script>");
    await widget.end();

    let finishReplace!: (value: unknown) => void;
    const remounted = widget.replace("<p>b</p><script>run()</script>");
    const second = await fake.connect(1, {
      onRequest: () =>
        new Promise((resolve) => {
          finishReplace = resolve;
        }),
    });
    await vi.waitFor(() => expect(finishReplace).toBeDefined());
    void second.request(METHODS.initialize, {});
    second.notify(METHODS.initialized);
    finishReplace(result);

    await expect(remounted).resolves.toEqual(result);
    expect(events).toEqual(["initialized", "resize"]);
    expect(widget.iframe).toBe(fake.rendered[1]!.iframe);
  });

  it("disposes the replaced frame even when onResize throws during a remount", async () => {
    let remounting = false;
    const { container, fake, widget } = setup({
      onResize: () => {
        if (remounting) throw new Error("host handler failed");
      },
    });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    await fake.connect(0, { onRequest: () => result });
    widget.write("<script>run()</script>");
    await widget.end();

    remounting = true;
    const remounted = widget.replace("<p>b</p><script>run()</script>");
    await fake.connect(1, { onRequest: () => result });
    await remounted.catch(() => {});

    expect(fake.rendered[0]!.dispose).toHaveBeenCalled();
    expect(container.children).toHaveLength(1);
    expect(widget.iframe).toBe(fake.rendered[1]!.iframe);
  });

  it("disposes a remounted frame that fails to render and drops its initialization", async () => {
    const onInitialized = vi.fn();
    const { container, fake, widget } = setup({ onInitialized });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    await fake.connect(0, { onRequest: () => result });
    widget.write("<script>run()</script>");
    await widget.end();

    let failReplace!: (error: unknown) => void;
    const remounted = widget.replace("<p>b</p><script>run()</script>");
    const second = await fake.connect(1, {
      onRequest: () =>
        new Promise((_, reject) => {
          failReplace = reject;
        }),
    });
    await vi.waitFor(() => expect(failReplace).toBeDefined());
    void second.request(METHODS.initialize, {
      appCapabilities: { availableDisplayModes: ["fullscreen"] },
    });
    second.notify(METHODS.initialized);
    failReplace(new Error("render failed"));

    await expect(remounted).rejects.toThrow("render failed");
    expect(onInitialized).not.toHaveBeenCalled();
    expect(fake.rendered[1]!.dispose).toHaveBeenCalled();
    expect(container.children).toHaveLength(1);
    expect(widget.iframe).toBe(fake.rendered[0]!.iframe);
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
    expect(fake.rendered[0]!.iframe.style.colorScheme).toBe("light");
    await vi.waitFor(() => expect(notifications).toHaveLength(1));
    expect(notifications[0]).toMatchObject([
      METHODS.hostContextChanged,
      { theme: "dark" },
    ]);
    await vi.waitFor(() =>
      expect(fake.rendered[0]!.iframe.style.colorScheme).toBe("dark"),
    );

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

describe("widget ids", () => {
  afterEach(() => {
    mocks.constructed.length = 0;
    mocks.render = undefined;
  });

  const setupWithId = (options: Partial<CreateWidgetOptions> = {}) => {
    const fake = createFakeFrame();
    mocks.render = fake.frame.renderHtml as never;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const widget = createWidget({ container, ...options });
    return { fake, widget };
  };

  it("derives a stable salt from the id and keeps a random one without it", () => {
    setupWithId({ id: "thread-1:call_9", product: "app" });
    setupWithId();
    expect(widgetStorageSalt("x")).toBe("genframe:v1:x");
    expect(mocks.constructed).toEqual([
      {
        product: "app",
        options: { salt: "genframe:v1:thread-1:call_9" },
        renders: 1,
      },
      { product: "generative-frame", options: {}, renders: 1 },
    ]);
  });

  it("passes unsafeShimDomain to Safe Content Frame", () => {
    setupWithId({ id: "a", unsafeShimDomain: "frames.example.com" });
    expect(mocks.constructed[0]!.options).toEqual({
      salt: "genframe:v1:a",
      unsafeShimDomain: "frames.example.com",
    });
  });

  it("renders an opaque-origin frame without Safe Content Frame", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onPrompt = vi.fn();
    const widget = createWidget({ container, opaqueOrigin: true, onPrompt });
    const iframe = container.querySelector("iframe")!;
    // jsdom's own load stands in for a browser's extra initial about:blank load.
    await new Promise((resolve) =>
      iframe.addEventListener("load", resolve, { once: true }),
    );
    expect(mocks.constructed).toHaveLength(0);
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe.srcdoc).toContain("<html");

    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage");
    const ready = {
      data: { type: READY_MESSAGE },
      source: iframe.contentWindow,
    };
    window.dispatchEvent(
      new MessageEvent("message", { ...ready, origin: ORIGIN }),
    );
    expect(postMessage).not.toHaveBeenCalled();
    window.dispatchEvent(
      new MessageEvent("message", { ...ready, origin: "null" }),
    );
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: INIT_MESSAGE }),
      "*",
      [expect.any(MessagePort)],
    );
    const port = (postMessage.mock.calls[0] as unknown[])[2] as [MessagePort];
    ports.push(port[0]);
    createRpcPeer(port[0], {}).notify(METHODS.ready, { version: "test" });
    await expect(widget.ready).resolves.toBeUndefined();

    const prompt = (id: number) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          ...ready,
          origin: "null",
          data: {
            jsonrpc: "2.0",
            id,
            method: "ui/message",
            params: { content: [{ type: "text", text: "hi" }] },
          },
        }),
      );
    iframe.dispatchEvent(new Event("load"));
    prompt(10);
    await vi.waitFor(() => expect(onPrompt).toHaveBeenCalledOnce());

    iframe.dispatchEvent(new Event("load"));
    onPrompt.mockClear();
    postMessage.mockClear();
    window.dispatchEvent(
      new MessageEvent("message", {
        ...ready,
        origin: "null",
        data: { jsonrpc: "2.0", id: 1, method: "ui/initialize", params: {} },
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        ...ready,
        origin: "null",
        data: {
          jsonrpc: "2.0",
          id: 2,
          method: "ui/message",
          params: { content: [{ type: "text", text: "injected" }] },
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(postMessage).not.toHaveBeenCalled();
    expect(onPrompt).not.toHaveBeenCalled();
    widget.dispose();
  });

  it("rejects opaqueOrigin with options that need Safe Content Frame", () => {
    const container = document.createElement("div");
    for (const options of [
      { id: "a" },
      { frame: createFakeFrame().frame },
      { unsafeShimDomain: "frames.example.com" },
    ]) {
      expect(() =>
        createWidget({ container, opaqueOrigin: true, ...options }),
      ).toThrow(TypeError);
    }
  });

  it("removes the preview container when the options are rejected", async () => {
    await expect(
      previewWidget("<p>a</p>", { opaqueOrigin: true, id: "a" }),
    ).rejects.toThrow(TypeError);
    expect(document.body.children).toHaveLength(0);
  });

  it("removes the clear-storage container when the options are rejected", async () => {
    await expect(
      clearWidgetStorage("a", { opaqueOrigin: true } as never),
    ).rejects.toThrow(TypeError);
    expect(document.body.children).toHaveLength(0);
  });

  it("rejects an id together with a preconfigured frame", () => {
    const container = document.createElement("div");
    expect(() =>
      createWidget({ container, id: "a", frame: createFakeFrame().frame }),
    ).toThrow(TypeError);
  });

  it("remounts on the same salted frame, so the origin and storage stay", async () => {
    const { fake, widget } = setupWithId({ id: "a" });
    const result = {
      size: { width: 1, height: 1 },
      blank: false,
      errorCount: 0,
    };
    const handlers: RpcHandlers = { onRequest: () => result };
    await fake.connect(0, handlers);
    widget.write("<p>a</p><script>run()</script>");
    await widget.end();
    const remounted = widget.replace("<p>b</p><script>run()</script>");
    await fake.connect(1, handlers);
    await remounted;
    expect(mocks.constructed).toHaveLength(1);
    expect(mocks.constructed[0]!.renders).toBe(2);
  });

  it("clears storage through a hidden frame on the id's origin", async () => {
    const fake = createFakeFrame();
    mocks.render = fake.frame.renderHtml as never;
    const cleared = clearWidgetStorage("a");
    const methods: string[] = [];
    await fake.connect(0, {
      onRequest: (method) => {
        methods.push(method);
        return { cleared: ["localStorage"] };
      },
    });
    await expect(cleared).resolves.toEqual({ cleared: ["localStorage"] });
    expect(methods).toEqual([METHODS.clearStorage]);
    expect(mocks.constructed[0]!.options).toEqual({ salt: "genframe:v1:a" });
    expect(document.body.children).toHaveLength(0);
  });
});
