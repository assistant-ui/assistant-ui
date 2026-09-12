// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { type FC, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ExternalThread,
  type ExternalThreadProps,
} from "../../../store/clients/external-thread";
import type { MessageState } from "../../../store";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { ThreadPrimitiveMessages } from "./ThreadMessages";

const message = (id: string, role: "user" | "assistant") =>
  ({
    id,
    createdAt: new Date(0),
    role,
    content: [{ type: "text", text: id }],
    attachments: [],
    metadata: {
      custom: {},
    },
    ...(role === "assistant" ? { status: { type: "complete" } } : undefined),
  }) as ExternalThreadProps["messages"][number];

const StatefulMessage = ({ message }: { message: MessageState }) => {
  const [initialId] = useState(message.id);
  return <span data-role={message.role}>{`${initialId}:${message.id}`}</span>;
};

const renderMessages = (messages: ExternalThreadProps["messages"]) => {
  const App: FC<{ messages: ExternalThreadProps["messages"] }> = ({
    messages,
  }) => {
    const aui = useAui({ thread: ExternalThread({ messages }) });
    return (
      <AuiProvider value={aui}>
        <ThreadPrimitiveMessages>
          {({ message }) => <StatefulMessage message={message} />}
        </ThreadPrimitiveMessages>
      </AuiProvider>
    );
  };
  const result = render(<App messages={messages} />);
  return {
    rerender: (nextMessages: ExternalThreadProps["messages"]) =>
      result.rerender(<App messages={nextMessages} />),
  };
};

const renderExternalStoreMessages = (
  messages: ExternalThreadProps["messages"],
  isRunning: boolean,
) => {
  const App: FC<{
    messages: ExternalThreadProps["messages"];
    isRunning: boolean;
  }> = ({ messages, isRunning }) => {
    const runtime = useExternalStoreRuntime({
      messages,
      isRunning,
      convertMessage: (message) => message,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages>
          {({ message }) => <StatefulMessage message={message} />}
        </ThreadPrimitiveMessages>
      </AssistantRuntimeProvider>
    );
  };
  const result = render(<App messages={messages} isRunning={isRunning} />);
  return {
    container: result.container,
    rerender: (
      nextMessages: ExternalThreadProps["messages"],
      nextIsRunning: boolean,
    ) =>
      result.rerender(
        <App messages={nextMessages} isRunning={nextIsRunning} />,
      ),
  };
};

describe("ThreadPrimitiveMessages", () => {
  afterEach(cleanup);

  it("keeps component state with the surviving message after removal", () => {
    const first = message("first", "user");
    const second = message("second", "assistant");
    const thread = renderMessages([first, second]);

    thread.rerender([second]);

    expect(screen.queryByText("second:second")).not.toBeNull();
    expect(screen.queryByText("first:second")).toBeNull();
  });

  it("keeps component state with messages after prepending history", () => {
    const first = message("first", "user");
    const second = message("second", "assistant");
    const thread = renderMessages([first, second]);

    thread.rerender([message("zeroth", "assistant"), first, second]);

    expect(screen.queryByText("first:first")).not.toBeNull();
    expect(screen.queryByText("second:second")).not.toBeNull();
    expect(screen.queryByText("first:zeroth")).toBeNull();
    expect(screen.queryByText("second:first")).toBeNull();
  });

  it("remounts a message when its runtime ID changes", () => {
    const thread = renderMessages([message("client-id", "assistant")]);

    thread.rerender([message("server-id", "assistant")]);

    expect(screen.queryByText("server-id:server-id")).not.toBeNull();
    expect(screen.queryByText("client-id:server-id")).toBeNull();
  });

  it("remounts an optimistic placeholder as the real assistant message", async () => {
    const userMessage = message("user-id", "user");
    const thread = renderExternalStoreMessages([userMessage], true);
    const optimisticRow = thread.container.querySelector(
      '[data-role="assistant"]',
    );

    expect(optimisticRow).not.toBeNull();
    expect(optimisticRow?.textContent).not.toBe("assistant-id:assistant-id");

    thread.rerender([userMessage, message("assistant-id", "assistant")], false);

    await waitFor(() => {
      expect(screen.queryByText("assistant-id:assistant-id")).not.toBeNull();
    });
    expect(optimisticRow?.isConnected).toBe(false);
  });
});
