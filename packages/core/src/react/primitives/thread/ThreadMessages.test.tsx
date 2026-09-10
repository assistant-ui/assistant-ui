// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { type FC, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ExternalThread,
  type ExternalThreadProps,
} from "../../../store/clients/external-thread";
import type { MessageState } from "../../../store";
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
  return <span>{`${initialId}:${message.id}`}</span>;
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
});
