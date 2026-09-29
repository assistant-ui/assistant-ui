import { flushTapSync } from "@assistant-ui/tap";
// @vitest-environment jsdom

import { StrictMode, useLayoutEffect, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import type { ChatTransport, UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { AISDKChat } from "./AISDKChat";
import {
  createCancellableTransport,
  createStreamHarness,
} from "./__tests__/controlled-transport";

describe("AISDKChat React integration", () => {
  it("aborts the in-flight transport after a real unmount", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning } = createStreamHarness();

    const view = render(
      <StrictMode>
        <AuiProvider config={AuiConfig({ threads: AISDKChat({ transport }) })}>
          <Probe />
        </AuiProvider>
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));
    // the Strict Mode double mount already ran a host cleanup by now
    expect(getCancelCount()).toBe(0);

    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
  });
});

describe("AISDKChat legacy useAui host integration", () => {
  const LegacyProvider = ({
    transport,
    children,
  }: {
    transport: ChatTransport<UIMessage>;
    children: ReactNode;
  }) => {
    const aui = useAui(AuiConfig({ threads: AISDKChat({ transport }) }));
    return <AuiProvider value={aui}>{children}</AuiProvider>;
  };

  it("aborts the in-flight transport after a real unmount", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning } = createStreamHarness();

    const view = render(
      <StrictMode>
        <LegacyProvider transport={transport}>
          <Probe />
        </LegacyProvider>
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));
    expect(getCancelCount()).toBe(0);

    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
  });
});

describe("replacement transports", () => {
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
});
