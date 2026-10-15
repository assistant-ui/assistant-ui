// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";

const mocks = vi.hoisted(() => ({
  useRemoteThreadListRuntime: (options: {
    runtimeHook: () => AssistantRuntime;
  }) => options.runtimeHook(),
}));

vi.mock("./useRemoteThreadListRuntime", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./useRemoteThreadListRuntime")>();
  return { ...actual, ...mocks };
});

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

describe("useLocalRuntime history scope", () => {
  it("clears rendered messages during the scope-switch layout", async () => {
    const firstHistory: ThreadHistoryAdapter = {
      scopeId: "first",
      load: async () => ({
        headId: "first",
        messages: [
          {
            parentId: null,
            message: {
              id: "first",
              role: "user",
              content: [{ type: "text", text: "first scope" }],
              attachments: [],
              createdAt: new Date(0),
              metadata: { custom: {} },
            },
          },
        ],
      }),
      append: async () => {},
    };
    const secondHistory: ThreadHistoryAdapter = {
      scopeId: "second",
      load: () => new Promise<never>(() => {}),
      append: async () => {},
    };
    let switchScope = () => {};
    let messageCountDuringScopeCommit: number | undefined;

    const MessageText = () => {
      const text = useAuiState((state) => {
        const part = state.thread.messages[0]?.content[0];
        return part?.type === "text" ? part.text : "";
      });
      return <div data-testid="message-text">{text}</div>;
    };

    const App = () => {
      const [history, setHistory] = useState(firstHistory);
      switchScope = () => setHistory(secondHistory);
      const runtime = useLocalRuntime(chatModel, {
        adapters: { history },
      });
      useLayoutEffect(() => {
        if (history !== secondHistory) return;
        messageCountDuringScopeCommit =
          runtime.thread.getState().messages.length;
      }, [history, runtime]);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <MessageText />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<App />);
    await waitFor(() => {
      expect(view.getByTestId("message-text").textContent).toBe("first scope");
    });

    await act(async () => {
      await Promise.resolve();
      switchScope();
    });

    expect(messageCountDuringScopeCommit).toBe(0);
    expect(view.getByTestId("message-text").textContent).toBe("");
  });
});
