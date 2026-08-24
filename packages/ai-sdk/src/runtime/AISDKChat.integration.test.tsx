// @vitest-environment jsdom

import { useEffect, useLayoutEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";
import type { ChatTransport, UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { AISDKChat } from "./AISDKChat";
import { createCancellableTransport } from "./__tests__/controlled-transport";

describe("AISDKChat React integration", () => {
  it("routes sends through a replacement transport", async () => {
    const emptyStream = () =>
      new ReadableStream({ start: (controller) => controller.close() });
    const sendA = vi.fn(async () => emptyStream());
    const sendB = vi.fn(async () => emptyStream());
    const transportA: ChatTransport<UIMessage> = {
      sendMessages: sendA,
      reconnectToStream: vi.fn(),
    };
    const transportB: ChatTransport<UIMessage> = {
      sendMessages: sendB,
      reconnectToStream: vi.fn(),
    };
    let initialClient: ReturnType<typeof useAui> | undefined;
    let currentClient: ReturnType<typeof useAui> | undefined;
    const CaptureClient = () => {
      const aui = useAui();
      initialClient ??= aui;
      currentClient = aui;
      return null;
    };
    const SendOnLayout = () => {
      const aui = useAui();
      useLayoutEffect(() => {
        flushTapSync(() => {
          aui.composer.setText("hello");
          aui.composer.send();
        });
      }, [aui]);
      return null;
    };
    const App = ({
      transport,
      send = false,
    }: {
      transport: ChatTransport<UIMessage>;
      send?: boolean;
    }) => (
      <AuiProvider config={AuiConfig({ threads: AISDKChat({ transport }) })}>
        <CaptureClient />
        {send && <SendOnLayout />}
      </AuiProvider>
    );

    const view = render(<App transport={transportA} />);
    view.rerender(<App transport={transportB} send />);

    await waitFor(() => expect(sendB).toHaveBeenCalledOnce());
    expect(sendA).not.toHaveBeenCalled();
    expect(currentClient).toBe(initialClient);
  });

  it("does not treat React provider unmount as client destruction", async () => {
    const { transport, getCancelCount, close } = createCancellableTransport();
    let started = false;
    let isRunning = () => false;

    const SendOnMount = () => {
      const aui = useAui();
      isRunning = () => aui.thread.getState().isRunning;
      useEffect(() => {
        if (started) return;
        started = true;
        flushTapSync(() => aui.composer.setText("keep streaming"));
        flushTapSync(() => aui.composer.send());
      }, [aui]);
      return null;
    };

    const view = render(
      <StrictMode>
        <AuiProvider config={AuiConfig({ threads: AISDKChat({ transport }) })}>
          <SendOnMount />
        </AuiProvider>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(isRunning()).toBe(true);
    });

    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getCancelCount()).toBe(0);
    close();
  });
});
