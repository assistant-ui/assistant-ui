// @vitest-environment jsdom
import { act, startTransition, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { renderHtmlMock } = vi.hoisted(() => ({ renderHtmlMock: vi.fn() }));

vi.mock("safe-content-frame", async (importOriginal) => ({
  ...(await importOriginal<typeof import("safe-content-frame")>()),
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
    fullyLoadedPromiseWithTimeout: vi.fn(() => new Promise<void>(() => {})),
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

  it("reports a frame that never finishes loading through onError", async () => {
    const rendered = fakeRendered();
    rendered.fullyLoadedPromiseWithTimeout.mockImplementation(() =>
      Promise.reject(
        Object.assign(new Error("Failed to load shim: https://fake.scf.test"), {
          code: "shim-unavailable",
        }),
      ),
    );
    renderHtmlMock.mockResolvedValue(rendered);
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
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]![0]).toMatchObject({
      code: "shim-unavailable",
      message: "Failed to load shim: https://fake.scf.test",
    });
    expect(rendered.dispose).not.toHaveBeenCalled();
  });

  it("stays silent when the shim started and the render is merely slow", async () => {
    const rendered = fakeRendered();
    rendered.fullyLoadedPromiseWithTimeout.mockImplementation(() =>
      Promise.reject(
        Object.assign(new Error("Timeout"), { code: "render-timeout" }),
      ),
    );
    renderHtmlMock.mockResolvedValue(rendered);
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

    expect(rendered.fullyLoadedPromiseWithTimeout).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(rendered.dispose).not.toHaveBeenCalled();
  });

  it("reports a load failure that carries no shim code", async () => {
    const rendered = fakeRendered();
    rendered.fullyLoadedPromiseWithTimeout.mockImplementation(() =>
      Promise.reject(new Error("Failed to load iframe")),
    );
    renderHtmlMock.mockResolvedValue(rendered);
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
    expect(onError.mock.calls[0]![0].message).toBe("Failed to load iframe");
  });

  it("does not report a load failure after unmount", async () => {
    const rendered = fakeRendered();
    let rejectLoad: (error: Error) => void;
    rendered.fullyLoadedPromiseWithTimeout.mockReturnValue(
      new Promise<void>((_, reject) => {
        rejectLoad = reject;
      }),
    );
    renderHtmlMock.mockResolvedValue(rendered);
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

    await act(async () => {
      root.unmount();
    });
    rejectLoad!(new Error("Timeout"));
    await flush();

    expect(rendered.fullyLoadedPromiseWithTimeout).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
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

  it("does not report render failures after unmount", async () => {
    let rejectRender!: (error: Error) => void;
    renderHtmlMock.mockReturnValue(
      new Promise((_, reject) => {
        rejectRender = reject;
      }),
    );
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

    await act(async () => {
      root.unmount();
    });
    rejectRender(new Error("late failure"));
    await flush();

    expect(onError).not.toHaveBeenCalled();
  });

  it("contains failures thrown by onError", async () => {
    const renderError = new Error("render failed");
    const callbackError = new Error("error callback failed");
    renderHtmlMock.mockRejectedValue(renderError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await act(async () => {
        root.render(
          <SandboxHost
            content={{ html: "" }}
            contentKey="k"
            createBridge={() => ({ onMessage: vi.fn(), dispose: vi.fn() })}
            onError={() => {
              throw callbackError;
            }}
          />,
        );
      });
      await flush();

      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] SandboxHost onError callback threw an error",
        callbackError,
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("disposes the rendered frame when bridge creation fails", async () => {
    const rendered = fakeRendered();
    renderHtmlMock.mockResolvedValue(rendered);
    const error = new Error("bridge failed");
    const onError = vi.fn();

    await act(async () => {
      root.render(
        <SandboxHost
          content={{ html: "" }}
          contentKey="k"
          createBridge={() => {
            throw error;
          }}
          onError={onError}
        />,
      );
    });
    await flush();

    expect(onError).toHaveBeenCalledWith(error);
    expect(rendered.dispose).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    expect(rendered.dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps bridge options scoped to committed renders", async () => {
    let resolveRender!: (frame: ReturnType<typeof fakeRendered>) => void;
    renderHtmlMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRender = resolve;
      }),
    );
    const rendered = fakeRendered();
    const bridge = { onMessage: vi.fn(), dispose: vi.fn() };
    const createBridgeA = vi.fn(() => bridge);
    const createBridgeB = vi.fn(() => bridge);
    const interruptedRender = vi.fn();
    const pending = new Promise<never>(() => {});
    const Block = () => {
      interruptedRender();
      throw pending;
    };
    const view = (createBridge: typeof createBridgeA, blocked: boolean) => (
      <Suspense fallback={null}>
        <SandboxHost
          content={{ html: "" }}
          contentKey="k"
          createBridge={createBridge}
        />
        {blocked ? <Block /> : null}
      </Suspense>
    );

    await act(async () => {
      root.render(view(createBridgeA, false));
    });
    act(() => {
      startTransition(() => root.render(view(createBridgeB, true)));
    });
    await vi.waitFor(() => expect(interruptedRender).toHaveBeenCalled());
    await act(async () => {
      resolveRender(rendered);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(createBridgeA).toHaveBeenCalledTimes(1);
    expect(createBridgeB).not.toHaveBeenCalled();
  });
});
