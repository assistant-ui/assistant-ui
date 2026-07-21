// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SafeContentFrame } from "./index";

class MockMessagePort {
  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly close = vi.fn();
}

class MockMessageChannel {
  static instances: MockMessageChannel[] = [];

  readonly port1 = new MockMessagePort();
  readonly port2 = new MockMessagePort();

  constructor() {
    MockMessageChannel.instances.push(this);
  }
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
    Object.defineProperty(iframe, "contentWindow", {
      configurable: true,
      value: { postMessage: vi.fn() },
    });
    iframe.dispatchEvent(new Event("load"));
    const frame = await framePromise;

    frame.dispose();
    frame.dispose();

    expect(container.childElementCount).toBe(0);
    expect(MockMessageChannel.instances[0]!.port1.close).toHaveBeenCalledOnce();
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
});
