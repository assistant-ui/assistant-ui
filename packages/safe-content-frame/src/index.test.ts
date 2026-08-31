// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SafeContentFrame } from "./index";

class MockMessagePort {
  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly close = vi.fn();

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

class MockMessageChannel {
  static instances: MockMessageChannel[] = [];

  readonly port1 = new MockMessagePort();
  readonly port2 = new MockMessagePort();

  constructor() {
    MockMessageChannel.instances.push(this);
  }
}

function setContentWindow(iframe: HTMLIFrameElement) {
  const contentWindow = { postMessage: vi.fn() } as unknown as Window;
  Object.defineProperty(iframe, "contentWindow", {
    configurable: true,
    value: contentWindow,
  });
  return contentWindow;
}

function emitWindowMessage(
  data: unknown,
  origin: string,
  source: MessageEventSource | null,
) {
  window.dispatchEvent(new MessageEvent("message", { data, origin, source }));
}

describe("SafeContentFrame", () => {
  let shadowRoot: ShadowRoot | undefined;

  beforeEach(() => {
    shadowRoot = undefined;
    MockMessageChannel.instances = [];
    vi.stubGlobal("MessageChannel", MockMessageChannel);
    vi.stubGlobal("crypto", {
      subtle: {
        digest: vi.fn(async () => new Uint8Array(32).buffer),
      },
    });

    const attachShadow = Element.prototype.attachShadow;
    vi.spyOn(Element.prototype, "attachShadow").mockImplementation(function (
      this: Element,
      init: ShadowRootInit,
    ) {
      shadowRoot = attachShadow.call(this, init);
      return shadowRoot;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("cleans up the shadow host and message channel on dispose", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    setContentWindow(iframe);
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    const removeMessageListener = vi.spyOn(window, "removeEventListener");
    frame.dispose();
    frame.dispose();

    expect(container.childElementCount).toBe(0);
    expect(MockMessageChannel.instances[0]!.port1.close).toHaveBeenCalledOnce();
    expect(removeMessageListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
  });

  it("cleans up the mounted frame and message channel after a load error", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    shadowRoot!.querySelector("iframe")!.dispatchEvent(new Event("error"));

    await expect(framePromise).rejects.toThrow("Failed to load iframe");
    expect(container.childElementCount).toBe(0);
    expect(MockMessageChannel.instances[0]!.port1.close).toHaveBeenCalledOnce();
    expect(MockMessageChannel.instances[0]!.port2.close).toHaveBeenCalledOnce();
  });

  it("surfaces shim errors reported after the iframe loads", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    setContentWindow(iframe);
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    MockMessageChannel.instances[0]!.port1.emit({
      type: "error",
      message: "shim decode failed",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(frame.fullyLoadedPromiseWithTimeout(10)).rejects.toThrow(
      "shim decode failed",
    );
    expect(container.childElementCount).toBe(0);
    expect(MockMessageChannel.instances[0]!.port1.close).toHaveBeenCalledOnce();
  });

  it("reports when the loaded shim does not acknowledge readiness", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    setContentWindow(iframe);
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    await expect(frame.fullyLoadedPromiseWithTimeout(10)).rejects.toThrow(
      `Failed to load shim: ${iframe.src}`,
    );
    frame.dispose();
  });

  it("ignores readiness messages from untrusted sources", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    const contentWindow = setContentWindow(iframe);
    const iframeOrigin = new URL(iframe.src).origin;
    emitWindowMessage(
      { type: "ready" },
      "https://attacker.example",
      contentWindow,
    );
    emitWindowMessage({ type: "ready" }, iframeOrigin, window);
    emitWindowMessage({ type: "unknown" }, iframeOrigin, contentWindow);
    emitWindowMessage(
      { type: "error", message: "forged" },
      "https://attacker.example",
      contentWindow,
    );
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    await expect(frame.fullyLoadedPromiseWithTimeout(10)).rejects.toThrow(
      `Failed to load shim: ${iframe.src}`,
    );
    frame.dispose();
  });

  it("reports a shim initialization failure with the shim's own message", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    const contentWindow = setContentWindow(iframe);
    const iframeOrigin = new URL(iframe.src).origin;
    emitWindowMessage(
      { type: "error", message: "Product name was either invalid or null" },
      iframeOrigin,
      contentWindow,
    );
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    await expect(frame.fullyLoadedPromiseWithTimeout(10)).rejects.toThrow(
      "Product name was either invalid or null",
    );
    frame.dispose();
  });

  it("waits for render completion after shim readiness", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    const contentWindow = setContentWindow(iframe);
    const iframeOrigin = new URL(iframe.src).origin;
    emitWindowMessage({ type: "ready" }, iframeOrigin, contentWindow);
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    const fullyLoaded = frame.fullyLoadedPromiseWithTimeout(100);
    MockMessageChannel.instances[0]!.port1.emit({ type: "msg" });

    await expect(fullyLoaded).resolves.toBeUndefined();
    frame.dispose();
  });

  it("keeps render completion compatible without a readiness message", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    setContentWindow(iframe);
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    const fullyLoaded = frame.fullyLoadedPromiseWithTimeout(100);
    MockMessageChannel.instances[0]!.port1.emit({ type: "msg" });

    await expect(fullyLoaded).resolves.toBeUndefined();
    frame.dispose();
  });

  it("reports a render timeout after shim readiness", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = new SafeContentFrame("test", {
      salt: "fixed",
      useShadowDom: true,
    });

    const framePromise = renderer.renderHtml("<p>Hello</p>", container);
    await vi.waitFor(() => {
      expect(shadowRoot?.querySelector("iframe")).toBeTruthy();
    });

    const iframe = shadowRoot!.querySelector("iframe")!;
    const contentWindow = setContentWindow(iframe);
    const iframeOrigin = new URL(iframe.src).origin;
    emitWindowMessage({ type: "ready" }, iframeOrigin, contentWindow);
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    await expect(frame.fullyLoadedPromiseWithTimeout(10)).rejects.toThrow(
      "Timeout",
    );
    frame.dispose();
  });
});
