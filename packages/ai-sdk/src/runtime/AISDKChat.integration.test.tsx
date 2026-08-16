// @vitest-environment jsdom

import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import { AISDKChat } from "./AISDKChat";
import { createCancellableTransport } from "./__tests__/controlled-transport";

describe("AISDKChat React integration", () => {
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
