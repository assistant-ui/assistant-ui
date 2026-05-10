// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../context";
import * as MessagePartPrimitive from "../primitives/messagePart";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter, ThreadMessageLike } from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const initialMessages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [],
    status: { type: "running" },
  },
];

const completeInitialMessages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [],
    status: { type: "complete", reason: "stop" },
  },
];

const RunningText: FC = () => {
  return (
    <p>
      <MessagePartPrimitive.Text />
      <MessagePartPrimitive.InProgress>
        <span data-testid="loading-dot">dot</span>
      </MessagePartPrimitive.InProgress>
    </p>
  );
};

const ComponentsMessage: FC = () => {
  return <MessagePrimitive.Parts components={{ Text: RunningText }} />;
};

const ChildrenMessage: FC = () => {
  return (
    <MessagePrimitive.Parts>
      {({ part }) => {
        if (part.type === "text") return <RunningText />;
        return null;
      }}
    </MessagePrimitive.Parts>
  );
};

const RuntimeProvider: FC<
  PropsWithChildren<{ messages?: ThreadMessageLike[] }>
> = ({ children, messages = initialMessages }) => {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: messages,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const renderThread = (MessageComponent: FC, messages?: ThreadMessageLike[]) => {
  render(
    <RuntimeProvider messages={messages}>
      <ThreadPrimitive.Messages components={{ Message: MessageComponent }} />
    </RuntimeProvider>,
  );
};

describe("MessagePrimitive.Parts loading state", () => {
  it("renders the loading indicator for the components API when assistant parts are empty", async () => {
    renderThread(ComponentsMessage);

    await waitFor(() => {
      expect(screen.getByTestId("loading-dot")).toBeTruthy();
    });
  });

  it("renders the loading indicator for the children API when assistant parts are empty", async () => {
    renderThread(ChildrenMessage);

    await waitFor(() => {
      expect(screen.getByTestId("loading-dot")).toBeTruthy();
    });
  });

  it("does not render the loading indicator when assistant parts are empty but the message is complete", async () => {
    renderThread(ChildrenMessage, completeInitialMessages);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-dot")).toBeNull();
    });
  });
});
