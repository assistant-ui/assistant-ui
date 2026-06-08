// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { renderHtmlMock } = vi.hoisted(() => ({ renderHtmlMock: vi.fn() }));

vi.mock("safe-content-frame", () => ({
  SafeContentFrame: class {
    renderHtml = renderHtmlMock;
  },
}));

import {
  SandboxHost,
  isSandboxFrameMessage,
  type SandboxBridge,
  type SandboxHostApi,
} from "./SandboxHost";

const validData = { jsonrpc: "2.0", method: "x" };

function makeFrame() {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  return { iframe, origin: "https://app.example" };
}

function fakeRendered() {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  return {
    iframe,
    origin: "https://fake.scf.test",
    sendMessage: vi.fn(),
    dispose: vi.fn(),
    fullyLoadedPromiseWithTimeout: vi.fn(),
  };
}

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

describe("isSandboxFrameMessage", () => {
  it("accepts a message from the frame's contentWindow at its origin", () => {
    const frame = makeFrame();
    const event = new MessageEvent("message", {
      data: validData,
      origin: frame.origin,
      source: frame.iframe.contentWindow,
    });
    expect(isSandboxFrameMessage(event, frame)).toBe(true);
  });

  it("rejects a message from a different origin", () => {
    const frame = makeFrame();
    const event = new MessageEvent("message", {
      data: validData,
      origin: "https://attacker.example",
      source: frame.iframe.contentWindow,
    });
    expect(isSandboxFrameMessage(event, frame)).toBe(false);
  });

  it("rejects a message from a different source window", () => {
    const frame = makeFrame();
    const event = new MessageEvent("message", {
      data: validData,
      origin: frame.origin,
      source: window,
    });
    expect(isSandboxFrameMessage(event, frame)).toBe(false);
  });
});

describe("SandboxHost", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    renderHtmlMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      try {
        root.unmount();
      } catch {
        // already unmounted by the test
      }
    });
    container.remove();
  });

  it("delivers only frame-validated messages to the bridge", async () => {
    const rendered = fakeRendered();
    renderHtmlMock.mockResolvedValue(rendered);
    const onMessage = vi.fn();
    const bridge: SandboxBridge = { onMessage, dispose: vi.fn() };

    await act(async () => {
      root.render(
        <SandboxHost
          content={{ html: "" }}
          contentKey="k"
          createBridge={() => bridge}
        />,
      );
    });
    await flush();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: validData,
        origin: rendered.origin,
        source: rendered.iframe.contentWindow,
      }),
    );
    expect(onMessage).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: validData,
        origin: "https://attacker.example",
        source: rendered.iframe.contentWindow,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        data: validData,
        origin: rendered.origin,
        source: window,
      }),
    );
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it("clamps the bridge-reported height to maxHeight and ignores invalid values", async () => {
    const rendered = fakeRendered();
    renderHtmlMock.mockResolvedValue(rendered);
    let host!: SandboxHostApi;
    const bridge: SandboxBridge = { onMessage: vi.fn(), dispose: vi.fn() };

    await act(async () => {
      root.render(
        <SandboxHost
          content={{ html: "" }}
          contentKey="k"
          maxHeight={800}
          createBridge={(_frame, h) => {
            host = h;
            return bridge;
          }}
        />,
      );
    });
    await flush();

    const div = container.firstElementChild as HTMLDivElement;
    await act(async () => host.setHeight(200));
    expect(div.style.height).toBe("200px");
    await act(async () => host.setHeight(5000));
    expect(div.style.height).toBe("800px");
    await act(async () => host.setHeight(0));
    expect(div.style.height).toBe("800px");
  });

  it("disposes the bridge before the frame and detaches the listener on unmount", async () => {
    const rendered = fakeRendered();
    renderHtmlMock.mockResolvedValue(rendered);
    const order: string[] = [];
    const onMessage = vi.fn();
    const bridge: SandboxBridge = {
      onMessage,
      dispose: vi.fn(() => order.push("bridge")),
    };
    rendered.dispose = vi.fn(() => order.push("frame"));

    await act(async () => {
      root.render(
        <SandboxHost
          content={{ html: "" }}
          contentKey="k"
          createBridge={() => bridge}
        />,
      );
    });
    await flush();

    await act(async () => {
      root.unmount();
    });

    expect(order).toEqual(["bridge", "frame"]);

    onMessage.mockClear();
    window.dispatchEvent(
      new MessageEvent("message", {
        data: validData,
        origin: rendered.origin,
        source: rendered.iframe.contentWindow,
      }),
    );
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("calls onError when rendering rejects", async () => {
    renderHtmlMock.mockRejectedValue(new Error("boom"));
    const onError = vi.fn();

    await act(async () => {
      root.render(
        <SandboxHost
          content={{ html: "" }}
          contentKey="k"
          createBridge={() => ({ onMessage: vi.fn(), dispose: vi.fn() })}
          onError={onError}
        />,
      );
    });
    await flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0].message).toBe("boom");
  });
});
