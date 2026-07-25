import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "ink-testing-library";
import type { FC } from "react";
import { Text } from "ink";
import { useExternalStoreRuntime } from "@assistant-ui/core/react";
import { renderFrame } from "./helpers";
import {
  AssistantRuntimeProvider,
  ThreadListPrimitive,
  useAuiState,
} from "../index";

const Row: FC = () => {
  const id = useAuiState((s) => s.threadListItem.id);
  return <Text>row:{id}</Text>;
};

const App: FC = () => {
  const runtime = useExternalStoreRuntime({
    isRunning: false,
    messages: [],
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: "t-1",
        threads: [
          { id: "t-1", title: "First", status: "regular" },
          { id: "t-2", title: "Second", status: "regular" },
        ],
        onSwitchToThread: async () => {},
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListPrimitive.Items renderItem={() => <Row />} />
    </AssistantRuntimeProvider>
  );
};

afterEach(() => {
  cleanup();
});

describe("ThreadListPrimitive.Items thread list item scope", () => {
  it("scopes each row to its own thread list item", async () => {
    const frame = await renderFrame(<App />);

    expect(frame).toContain("row:t-1");
    expect(frame).toContain("row:t-2");
  });
});
