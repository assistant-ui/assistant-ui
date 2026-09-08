// @vitest-environment jsdom

import { Activity, StrictMode, useState } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";
import { afterEach, describe, expect, it } from "vitest";
import { AISDKThreads } from "./AISDKThreads";
import {
  createCancellableTransport,
  createStreamHarness,
  nextTask,
} from "./__tests__/controlled-transport";

afterEach(cleanup);

const createThreadTransports = () => {
  const chats: ReturnType<typeof createCancellableTransport>[] = [];
  return {
    chats,
    transport: () => {
      const chat = createCancellableTransport();
      chats.push(chat);
      return chat.transport;
    },
  };
};

describe("AISDKThreads React host integration", () => {
  it("stops every cached chat when the React host unmounts", async () => {
    const { chats, transport } = createThreadTransports();
    const { Probe, send, isRunning, client } = createStreamHarness();

    let setMode: ((mode: "visible" | "hidden") => void) | undefined;
    const Shell = () => {
      const [mode, set] = useState<"visible" | "hidden">("visible");
      setMode = set;
      return (
        <Activity mode={mode}>
          <AuiProvider
            config={AuiConfig({ threads: AISDKThreads({ transport }) })}
          >
            <Probe />
          </AuiProvider>
        </Activity>
      );
    };

    const view = render(
      <StrictMode>
        <Shell />
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));

    await act(async () => {
      flushTapSync(() => client().threads.switchToNewThread());
    });
    await act(async () => send());
    await waitFor(() => {
      expect(chats).toHaveLength(2);
      expect(isRunning()).toBe(true);
    });

    // Hiding the host is not teardown: the cached chats keep streaming.
    await act(async () => setMode?.("hidden"));
    await act(nextTask);
    expect(chats.map((chat) => chat.getCancelCount())).toEqual([0, 0]);

    await act(async () => setMode?.("visible"));
    await act(nextTask);
    expect(chats.map((chat) => chat.getCancelCount())).toEqual([0, 0]);

    view.unmount();
    await waitFor(() =>
      expect(chats.map((chat) => chat.getCancelCount())).toEqual([1, 1]),
    );
  });
});
