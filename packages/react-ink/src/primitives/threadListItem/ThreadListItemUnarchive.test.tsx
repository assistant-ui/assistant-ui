import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  ThreadListItemByIndexProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { ThreadListItemUnarchive } from "./ThreadListItemUnarchive";

afterEach(cleanup);

it("exposes the adapter's unarchive availability to the terminal button", async () => {
  const onUnarchive = vi.fn(async () => {});
  function App({ supported }: { supported: boolean }) {
    const runtime = useExternalStoreRuntime<ThreadMessage>({
      messages: [],
      onNew: async () => {},
      adapters: {
        threadList: {
          archivedThreads: [{ id: "archived", status: "archived" }],
          onUnarchive: supported ? onUnarchive : undefined,
        },
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadListItemByIndexProvider index={0} archived>
          <ThreadListItemUnarchive disabled={false}>
            {({ disabled }) => (
              <Text>
                {disabled ? "Unarchive unavailable" : "Unarchive enabled"}
              </Text>
            )}
          </ThreadListItemUnarchive>
        </ThreadListItemByIndexProvider>
      </AssistantRuntimeProvider>
    );
  }
  const view = render(<App supported={false} />);
  await vi.waitFor(() =>
    expect(view.lastFrame()).toContain("Unarchive unavailable"),
  );
  view.rerender(<App supported />);
  await vi.waitFor(() =>
    expect(view.lastFrame()).toContain("Unarchive enabled"),
  );
  view.rerender(<App supported={false} />);
  await vi.waitFor(() =>
    expect(view.lastFrame()).toContain("Unarchive unavailable"),
  );
});
