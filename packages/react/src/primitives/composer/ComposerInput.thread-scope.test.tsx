// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AuiConfig, AuiProvider, Derived, useAui } from "@assistant-ui/store";
import { ExternalThread, InMemoryThreadList } from "@assistant-ui/core/store";
import { resource, useResource } from "@assistant-ui/tap";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { ComposerPrimitiveInput } from "./ComposerInput";

const StandaloneThread = resource(function useStandaloneThread() {
  return useResource(ExternalThread({ messages: [] }));
});
const StandaloneApp = () => {
  const config = AuiConfig({
    thread: StandaloneThread(),
    composer: Derived({
      source: "thread",
      query: {},
      get: (aui) => aui.thread.composer(),
    }),
  });
  return (
    <AuiProvider config={config}>
      <ThreadPrimitiveViewportProvider>
        <ComposerPrimitiveInput aria-label="Composer" />
      </ThreadPrimitiveViewportProvider>
    </AuiProvider>
  );
};

afterEach(cleanup);

it("edits a draft without a thread-list scope", async () => {
  render(<StandaloneApp />);
  const input = screen.getByRole("textbox", {
    name: "Composer",
  }) as HTMLTextAreaElement;
  await act(async () => {
    fireEvent.change(input, { target: { value: "New question" } });
  });
  expect(input.value).toBe("New question");
});

it("restores composer focus when the thread switches", async () => {
  let captured!: ReturnType<typeof useAui>;
  const App = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [] }),
      }),
    });
    captured = aui;
    return (
      <AuiProvider value={aui}>
        <ThreadPrimitiveViewportProvider>
          <button>Outside</button>
          <ComposerPrimitiveInput aria-label="Composer" autoFocus />
        </ThreadPrimitiveViewportProvider>
      </AuiProvider>
    );
  };
  render(<App />);
  const input = screen.getByRole("textbox", { name: "Composer" });
  expect(document.activeElement).toBe(input);
  act(() => screen.getByRole("button", { name: "Outside" }).focus());
  const oldId = captured.threads.getState().mainThreadId;
  await act(async () => {
    captured.threads.switchToNewThread();
  });
  await waitFor(() =>
    expect(captured.threads.getState().mainThreadId).not.toBe(oldId),
  );
  expect(document.activeElement).toBe(input);
});
