// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { AssistantFrameHost, ModelContextRegistry } from "@assistant-ui/core";
import { expect, it, vi } from "vitest";
import { useAssistantFrameHost } from "./useAssistantFrameHost";

const attachFrame = () => {
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
  return iframe;
};

const publishTool = (iframe: HTMLIFrameElement, name: string) => {
  window.dispatchEvent(
    new MessageEvent("message", {
      source: iframe.contentWindow,
      origin: window.location.origin,
      data: {
        channel: "assistant-ui-frame",
        message: {
          type: "model-context-update",
          context: {
            tools: {
              [name]: { parameters: { type: "object", properties: {} } },
            },
          },
        },
      },
    }),
  );
};

it("withdraws a detached frame's tools and calls, then serves an attached frame", async () => {
  const registry = new ModelContextRegistry();
  const firstFrame = attachFrame();
  const iframeRef = { current: firstFrame };
  const register = (host: Parameters<typeof registry.addProvider>[0]) =>
    registry.addProvider(host).remove;
  const { unmount } = renderHook(() =>
    useAssistantFrameHost({ iframeRef, register }),
  );

  try {
    publishTool(firstFrame, "search");
    const search = registry.getModelContext().tools?.search;
    expect(search).toBeDefined();
    const pending = search!.execute!({}, {} as any);
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );

    firstFrame.remove();
    await vi.waitFor(() => {
      expect(registry.getModelContext().tools).toBeUndefined();
    });
    expect(await outcome).toMatchObject({
      message: "AssistantFrameHost has been disposed",
    });

    const secondFrame = attachFrame();
    iframeRef.current = secondFrame;
    await vi.waitFor(() => {
      publishTool(secondFrame, "replacement");
      expect(registry.getModelContext().tools?.replacement).toBeDefined();
    });
    secondFrame.remove();
  } finally {
    unmount();
    firstFrame.remove();
  }
});

it("serves a replacement frame before reporting a disposal failure", () => {
  const disposalError = new Error("tool cancellation failed");
  const dispose = vi
    .spyOn(AssistantFrameHost.prototype, "dispose")
    .mockImplementationOnce(() => {
      throw disposalError;
    });
  const mutationCallbacks: MutationCallback[] = [];
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(callback: MutationCallback) {
        mutationCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );

  const registry = new ModelContextRegistry();
  const firstFrame = attachFrame();
  const secondFrame = attachFrame();
  const iframeRef = { current: firstFrame };
  const register = (host: Parameters<typeof registry.addProvider>[0]) =>
    registry.addProvider(host).remove;
  const { unmount } = renderHook(() =>
    useAssistantFrameHost({ iframeRef, register }),
  );

  try {
    publishTool(firstFrame, "search");
    expect(registry.getModelContext().tools?.search).toBeDefined();

    iframeRef.current = secondFrame;
    expect(() => mutationCallbacks[0]!([], {} as MutationObserver)).toThrow(
      disposalError,
    );

    expect(registry.getModelContext().tools?.search).toBeUndefined();
    publishTool(secondFrame, "replacement");
    expect(registry.getModelContext().tools?.replacement).toBeDefined();
  } finally {
    unmount();
    firstFrame.remove();
    secondFrame.remove();
    dispose.mockRestore();
    vi.unstubAllGlobals();
  }
});
