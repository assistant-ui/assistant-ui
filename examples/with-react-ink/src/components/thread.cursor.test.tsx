import { useState } from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  InMemoryThreadListAdapter,
  useAui,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react-ink";
import { Thread } from "./thread";
import { ThreadShell } from "./thread-shell";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([42, 100])(
  "preserves the composer cursor while searching the sidebar at %i columns",
  async (columns) => {
    let client: ReturnType<typeof useAui> | undefined;
    const adapter = {
      async *run() {
        yield { content: [{ type: "text" as const, text: "Ready" }] };
      },
    };
    function Content() {
      client = useAui();
      return <ThreadShell>{(options) => <Thread {...options} />}</ThreadShell>;
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
    const { stdin, stdout } = render(<App />);
    const press = async (value: string) => {
      stdin.write(value);
      await new Promise((resolve) => setTimeout(resolve, 50));
    };
    await vi.waitFor(() => expect(client).toBeDefined());
    vi.spyOn(stdout, "columns", "get").mockReturnValue(columns);
    stdout.emit("resize");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await press("abcd");
    await press("\x1b[D");
    await press("\x1b[D");
    await press("\x07");
    await press("/");
    await press("search text");
    expect(client!.composer.getState().text).toBe("abcd");
    await press("\x1b");
    await press("\x07");
    await press("X");
    expect(client!.composer.getState().text).toBe("abXcd");
  },
);
