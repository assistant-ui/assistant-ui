// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import { InMemoryThreadList } from "../client/InMemoryThreadList";
import { ExternalThread } from "../client/ExternalThread";

const renderThreads = () => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [] }),
      }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  render(<App />);
  return { aui: () => captured.aui! };
};

describe("InMemoryThreadList delete", () => {
  it("falls back to a live thread when the switch target is deleted in the same tick", async () => {
    const { aui } = renderThreads();

    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const newId = aui().threads.getState().mainThreadId;
    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );

    aui().threads.switchToThread(newId);
    aui().threads.item({ id: newId }).delete();

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe("main");
      expect(state.threadIds).not.toContain(newId);
    });
  });
});
