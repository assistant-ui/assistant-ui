// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { ModelContextRegistry } from "@assistant-ui/core";
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
