import { act, useState } from "react";
import { Text } from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterEach, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  InMemoryThreadListAdapter,
  useAui,
  useAuiState,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react-ink";
import { ThreadShell } from "./thread-shell";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => act(async () => cleanup()));

it("keeps drafts while navigating, renaming, archiving and restoring real runtime threads", async () => {
  let client: ReturnType<typeof useAui> | undefined;
  const adapter = {
    async *run() {
      yield { content: [{ type: "text" as const, text: "Ready" }] };
    },
  };
  function Content() {
    client = useAui();
    const draft = useAuiState((s) => s.composer.text);
    return (
      <ThreadShell>
        {({ isComposing }) => (
          <>
            <Text>Draft: {draft}</Text>
            {isComposing ? <ComposerPrimitive.Input submitOnEnter /> : null}
          </>
        )}
      </ThreadShell>
    );
  }
  function App() {
    const [threads] = useState(() => new InMemoryThreadListAdapter());
    const runtime = useRemoteThreadListRuntime({
      adapter: threads,
      runtimeHook: function RuntimeHook() {
        return useLocalRuntime(adapter);
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Content />
      </AssistantRuntimeProvider>
    );
  }
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<App />);
  });
  const { stdin } = result;
  const press = async (value: string) => {
    await act(async () => {
      stdin.write(value);
    });
  };
  await vi.waitFor(() => expect(client).toBeDefined());
  await press("Hello");
  await press("\r");
  await vi.waitFor(() =>
    expect(client!.threads.getState().threadIds.length).toBe(1),
  );
  const first = client!.threads.getState().mainThreadId;
  await press("Unsent draft");
  await press("\x07");
  await press("r");
  await press("\x15");
  await press("Renamed thread");
  await press("\r");
  await vi.waitFor(() =>
    expect(client!.threads.item({ id: first }).getState().title).toBe(
      "Renamed thread",
    ),
  );
  expect(client!.composer.getState().text).toBe("Unsent draft");
  await press("a");
  await vi.waitFor(() =>
    expect(client!.threads.getState().archivedThreadIds).toContain(first),
  );
  await press("x");
  await press("a");
  await vi.waitFor(() =>
    expect(client!.threads.getState().threadIds).toContain(first),
  );
  await press("x");
  await press("\r");
  await vi.waitFor(() => {
    expect(client!.threads.getState().mainThreadId).toBe(first);
    expect(client!.composer.getState().text).toBe("Unsent draft");
  });
});
