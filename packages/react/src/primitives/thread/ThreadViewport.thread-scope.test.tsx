// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import { resource, useResource } from "@assistant-ui/tap";
import { ExternalThread } from "@assistant-ui/core/store";
import { ThreadPrimitiveViewport } from "./ThreadViewport";

const StandaloneThread = resource(function useStandaloneThread() {
  return useResource(ExternalThread({ messages: [] }));
});

const Harness = ({ standalone }: { standalone: boolean }) => {
  const config = AuiConfig({
    thread: standalone ? StandaloneThread() : ExternalThread({ messages: [] }),
  });
  return (
    <AuiProvider config={config}>
      <ThreadPrimitiveViewport role="region" aria-label="Conversation">
        Conversation content
      </ThreadPrimitiveViewport>
    </AuiProvider>
  );
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([true, false])(
  "renders a thread viewport with standalone=%s",
  (standalone) => {
    const view = render(<Harness standalone={standalone} />);
    expect(view.getByRole("region", { name: "Conversation" }).textContent).toBe(
      "Conversation content",
    );
  },
);
