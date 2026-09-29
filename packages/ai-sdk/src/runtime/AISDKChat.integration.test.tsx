// @vitest-environment jsdom

import { StrictMode, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import type { ChatTransport, UIMessage } from "ai";
import { describe, expect, it } from "vitest";
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
