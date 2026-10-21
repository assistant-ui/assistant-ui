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
import {
  AuiConfig,
  AuiProvider,
  Derived,
  useAui,
  useAuiState,
} from "@assistant-ui/store";
import { ExternalThread, InMemoryThreadList } from "@assistant-ui/core/store";
import { resource, useResource } from "@assistant-ui/tap";
import type { ThreadMessage } from "@assistant-ui/core";
import { unstable_useComposerInputHistory } from "./useComposerInputHistory";

const messages: ThreadMessage[] = [
  {
    id: "user-1",
    role: "user",
    createdAt: new Date(0),
    content: [{ type: "text", text: "Previous question" }],
    attachments: [],
    metadata: { custom: {} },
  },
];
const StandaloneThread = resource(function useStandaloneThread() {
  return useResource(ExternalThread({ messages }));
});
const Input = () => {
  const aui = useAui();
  const value = useAuiState((s) => s.composer.text);
  const history = unstable_useComposerInputHistory();
  return (
    <textarea
      aria-label="Composer"
      value={value}
      onChange={(e) => aui.composer.setText(e.target.value)}
      {...history}
    />
  );
};
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
      <Input />
    </AuiProvider>
  );
};

afterEach(cleanup);

it("recalls history without a thread-list scope", async () => {
  render(<StandaloneApp />);
  const input = screen.getByRole("textbox", {
    name: "Composer",
  }) as HTMLTextAreaElement;
  await act(async () => {
    fireEvent.keyDown(input, { key: "ArrowUp" });
  });
  expect(input.value).toBe("Previous question");
  await act(async () => {
    fireEvent.keyDown(input, { key: "ArrowDown" });
  });
  expect(input.value).toBe("");
});

it("resets browsing when the thread switches without remounting the input", async () => {
  let captured!: ReturnType<typeof useAui>;
  const App = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages }),
      }),
    });
    captured = aui;
    return (
      <AuiProvider value={aui}>
        <Input />
      </AuiProvider>
    );
  };
  render(<App />);
  const input = screen.getByRole("textbox", {
    name: "Composer",
  }) as HTMLTextAreaElement;
  await act(async () => {
    fireEvent.keyDown(input, { key: "ArrowUp" });
  });
  expect(input.value).toBe("Previous question");

  const oldId = captured.threads.getState().mainThreadId;
  await act(async () => {
    captured.threads.switchToNewThread();
  });
  await waitFor(() =>
    expect(captured.threads.getState().mainThreadId).not.toBe(oldId),
  );
  await act(async () => {
    fireEvent.change(input, { target: { value: "Previous question" } });
  });
  input.setSelectionRange(input.value.length, input.value.length);
  await act(async () => {
    fireEvent.keyDown(input, { key: "ArrowDown" });
  });
  expect(screen.getByRole("textbox", { name: "Composer" })).toBe(input);
  expect(input.value).toBe("Previous question");
});
