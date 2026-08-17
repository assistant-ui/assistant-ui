// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../store/clients/external-thread";
import type { ThreadMessage } from "../types/message";

const message = (id: string, role: "user" | "assistant"): ThreadMessage =>
  ({
    id,
    role,
    content: [{ type: "text", text: `text of ${id}` }],
    createdAt: new Date(1718000000000),
    ...(role === "assistant"
      ? { status: { type: "complete", reason: "stop" } }
      : { attachments: [] }),
    metadata: { custom: {} },
  }) as ThreadMessage;

let aui!: ReturnType<typeof useAui>;

const Capture: FC = () => {
  aui = useAui();
  return null;
};

const renderThread = (props: Parameters<typeof ExternalThread>[0]) => {
  const App: FC = () => {
    const value = useAui({ thread: ExternalThread(props) });
    return (
      <AuiProvider value={value}>
        <Capture />
      </AuiProvider>
    );
  };
  render(<App />);
};

afterEach(() => {
  cleanup();
});

describe("ExternalThread refetch", () => {
  it("routes reloadMainThread to onRefetchThread and reports the capability", async () => {
    const onRefetchThread = vi.fn(async () => {});
    renderThread({ messages: [], onRefetchThread });

    await waitFor(() =>
      expect(
        aui.threads.thread("main").getState().capabilities.refetchThread,
      ).toBe(true),
    );

    await aui.threads.reloadMainThread();
    expect(onRefetchThread).toHaveBeenCalledTimes(1);
  });

  it("resolves reloadMainThread without a callback and reports the capability off", async () => {
    renderThread({ messages: [] });

    await waitFor(() =>
      expect(
        aui.threads.thread("main").getState().capabilities.refetchThread,
      ).toBe(false),
    );

    await expect(aui.threads.reloadMainThread()).resolves.toBeUndefined();
  });

  it("propagates a refetch rejection to the caller", async () => {
    const onRefetchThread = vi.fn(async () => {
      throw new Error("refetch failed");
    });
    renderThread({ messages: [], onRefetchThread });

    await waitFor(() =>
      expect(
        aui.threads.thread("main").getState().capabilities.refetchThread,
      ).toBe(true),
    );

    await expect(aui.threads.reloadMainThread()).rejects.toThrow(
      "refetch failed",
    );
  });

  it("applies refetched messages in place with the composer draft intact", async () => {
    const App: FC = () => {
      const [messages, setMessages] = useState<readonly ThreadMessage[]>([]);
      const value = useAui({
        thread: ExternalThread({
          messages,
          onRefetchThread: async () => {
            setMessages([message("a1", "assistant")]);
          },
        }),
      });
      return (
        <AuiProvider value={value}>
          <Capture />
        </AuiProvider>
      );
    };
    render(<App />);

    aui.thread.composer().setText("draft");
    await aui.threads.reloadMainThread();

    await waitFor(() =>
      expect(aui.thread.getState().messages.map((m) => m.id)).toEqual(["a1"]),
    );
    expect(aui.thread.composer().getState().text).toBe("draft");
  });
});
