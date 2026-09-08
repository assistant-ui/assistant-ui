// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessage } from "../../types/message";
import type { ThreadState } from "../../runtime/api/thread-runtime";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import { AssistantRuntimeProvider } from "../../react/AssistantRuntimeProvider";
import { useLocalRuntime } from "../../react/runtimes/useLocalRuntime";
import { getRenderableMessages } from "./thread-runtime-client";

const staleSnapshot = vi.hoisted(() => ({
  state: null as ThreadState | null,
}));

vi.mock("./useSubscribable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useSubscribable")>();
  return {
    ...actual,
    useSubscribable: (
      subscribable: Parameters<typeof actual.useSubscribable>[0],
    ) => {
      const current = actual.useSubscribable(subscribable);
      return staleSnapshot.state &&
        typeof current === "object" &&
        current !== null &&
        "messages" in current &&
        "capabilities" in current
        ? staleSnapshot.state
        : current;
    },
  };
});

const message = (id: string) => ({ id }) as ThreadMessage;

afterEach(() => {
  staleSnapshot.state = null;
});

describe("getRenderableMessages", () => {
  it("keeps the original snapshot when the runtime is unchanged", () => {
    const messages = [message("message-1")];

    expect(getRenderableMessages(messages, messages)).toBe(messages);
  });

  it("omits messages removed after the render snapshot was read", () => {
    const removed = message("removed");
    const current = message("current");

    expect(getRenderableMessages([removed, current], [current])).toEqual([
      current,
    ]);
  });
});

describe("ThreadClient", () => {
  it("does not render a message removed after its thread snapshot", async () => {
    const chatModel: ChatModelAdapter = {
      run: async () => ({ content: [] }),
    };
    let runtime: ReturnType<typeof useLocalRuntime> | null = null;

    const App = () => {
      runtime = useLocalRuntime(chatModel);
      staleSnapshot.state = {
        ...runtime.thread.getState(),
        messages: [message("removed")],
      };
      return <AssistantRuntimeProvider runtime={runtime} />;
    };

    await act(async () => {
      render(<App />);
    });
    expect(runtime!.thread.getState().messages).toHaveLength(0);
  });
});
