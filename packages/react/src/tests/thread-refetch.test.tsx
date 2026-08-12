// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect, vi } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import { ExternalThread } from "../index";

type ExternalThreadProps = Parameters<typeof ExternalThread>[0];

const renderThread = (props: ExternalThreadProps) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({ thread: ExternalThread(props) });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  render(<App />);
  return { aui: () => captured.aui! };
};

describe("thread refetch", () => {
  it("routes reloadMainThread to onRefetchThread and reports the capability", async () => {
    const onRefetchThread = vi.fn(async () => {});
    const { aui } = renderThread({ messages: [], onRefetchThread });

    await waitFor(() =>
      expect(
        aui().threads.thread("main").getState().capabilities.refetchThread,
      ).toBe(true),
    );

    await aui().threads.reloadMainThread();
    expect(onRefetchThread).toHaveBeenCalledTimes(1);
  });

  it("resolves reloadMainThread without a callback and reports the capability off", async () => {
    const { aui } = renderThread({ messages: [] });

    await waitFor(() =>
      expect(
        aui().threads.thread("main").getState().capabilities.refetchThread,
      ).toBe(false),
    );

    await expect(aui().threads.reloadMainThread()).resolves.toBeUndefined();
  });

  it("propagates a refetch rejection to the caller", async () => {
    const onRefetchThread = vi.fn(async () => {
      throw new Error("refetch failed");
    });
    const { aui } = renderThread({ messages: [], onRefetchThread });

    await waitFor(() =>
      expect(
        aui().threads.thread("main").getState().capabilities.refetchThread,
      ).toBe(true),
    );

    await expect(aui().threads.reloadMainThread()).rejects.toThrow(
      "refetch failed",
    );
  });
});
