// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { useAui } from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";
import { ExternalThread } from "../client/ExternalThread";
import { InMemoryThreadList } from "../client/InMemoryThreadList";

describe("tap thread reload", () => {
  it("refetches an ExternalThread through its automatic thread list", async () => {
    const onRefetchThread = vi.fn().mockResolvedValue(undefined);
    let aui!: ReturnType<typeof useAui>;

    const App = () => {
      aui = useAui({
        thread: ExternalThread({ messages: [], onRefetchThread }),
      });
      return null;
    };

    render(<App />);

    expect(aui.thread.getState().capabilities.refetchThread).toBe(true);
    await aui.threads.reloadMainThread();
    expect(onRefetchThread).toHaveBeenCalledOnce();
  });

  it("propagates InMemoryThreadList refetch failures", async () => {
    const error = new Error("refetch failed");
    const onRefetchThread = vi.fn().mockRejectedValue(error);
    let aui!: ReturnType<typeof useAui>;

    const App = () => {
      aui = useAui({
        threads: InMemoryThreadList({
          thread: () => ExternalThread({ messages: [], onRefetchThread }),
        }),
      });
      return null;
    };

    render(<App />);

    await expect(aui.threads.reloadMainThread()).rejects.toBe(error);
    expect(onRefetchThread).toHaveBeenCalledOnce();
  });

  it("keeps reload a no-op when the thread has no remote state", async () => {
    let aui!: ReturnType<typeof useAui>;

    const App = () => {
      aui = useAui({ thread: ExternalThread({ messages: [] }) });
      return null;
    };

    render(<App />);

    expect(aui.thread.getState().capabilities.refetchThread).toBe(false);
    await expect(aui.threads.reloadMainThread()).resolves.toBeUndefined();
  });
});
