// @vitest-environment jsdom

import { type FC, type PropsWithChildren, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../context";
import * as MessagePartPrimitive from "../primitives/messagePart";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import {
  useMessagePartReasoning,
  useMessagePartSource,
  useMessagePartFile,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

// A thread whose only assistant message has a single tool-call part at index 0.
// During a thread switch, a still-mounted text/image/reasoning/source/file
// consumer at (0, 0) re-resolves its index-derived part scope against the new
// thread and reads this tool-call part, so its selector must not throw inside
// useSyncExternalStore's getSnapshot (#5118).
const toolCallOnly: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "tc-1",
        toolName: "search",
        args: {},
        argsText: "{}",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
];

const RuntimeProvider: FC<
  PropsWithChildren<{ messages: ThreadMessageLike[] }>
> = ({ messages, children }) => {
  const runtime = useLocalRuntime(noOpAdapter, { initialMessages: messages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

// Renders a part consumer under a Message whose parts always render it,
// regardless of the part type. This mounts the consumer inside the part scope
// at index 0, where it reads the tool-call part — the transient state a
// thread switch produces for a still-mounted consumer.
const MessageWith: FC<{ renderPart: () => ReactNode }> = ({ renderPart }) => (
  <MessagePrimitive.Parts>{() => renderPart()}</MessagePrimitive.Parts>
);

const renderToolCallMessage = (renderPart: () => ReactNode) => {
  const Message: FC = () => <MessageWith renderPart={renderPart} />;
  render(
    <RuntimeProvider messages={toolCallOnly}>
      <ThreadPrimitive.Messages components={{ Message }} />
    </RuntimeProvider>,
  );
};

describe("part hooks tolerate a transient part-type mismatch (#5118)", () => {
  it("MessagePartPrimitive.Text renders empty when the part is a tool-call", async () => {
    renderToolCallMessage(() => (
      <MessagePartPrimitive.Text data-testid="text" />
    ));

    const text = await screen.findByTestId("text");
    expect(text.textContent).toBe("");
  });

  it("MessagePartPrimitive.Image renders an empty image when the part is a tool-call", async () => {
    renderToolCallMessage(() => (
      <MessagePartPrimitive.Image data-testid="image" alt="" />
    ));

    const image = await screen.findByTestId("image");
    expect(image.tagName).toBe("IMG");
  });

  it("useMessagePartReasoning returns an empty reasoning part when the part is a tool-call", async () => {
    const Reader: FC = () => {
      const part = useMessagePartReasoning();
      return <span data-testid="reasoning">{part.text}</span>;
    };
    renderToolCallMessage(() => <Reader />);

    const reasoning = await screen.findByTestId("reasoning");
    expect(reasoning.textContent).toBe("");
  });

  it("useMessagePartSource returns an empty source part when the part is a tool-call", async () => {
    const Reader: FC = () => {
      const part = useMessagePartSource();
      return <span data-testid="source">{part.sourceType}</span>;
    };
    renderToolCallMessage(() => <Reader />);

    const source = await screen.findByTestId("source");
    expect(source.textContent).toBe("url");
  });

  it("useMessagePartFile returns an empty file part when the part is a tool-call", async () => {
    const Reader: FC = () => {
      const part = useMessagePartFile();
      return <span data-testid="file">{part.mimeType}</span>;
    };
    renderToolCallMessage(() => <Reader />);

    const file = await screen.findByTestId("file");
    expect(file.textContent).toBe("");
  });

  it("a real text part still renders its text (no regression in the happy path)", async () => {
    const textMessage: ThreadMessageLike[] = [
      {
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
        status: { type: "complete", reason: "stop" },
      },
    ];
    const Message: FC = () => (
      <MessageWith
        renderPart={() => <MessagePartPrimitive.Text data-testid="text" />}
      />
    );
    render(
      <RuntimeProvider messages={textMessage}>
        <ThreadPrimitive.Messages components={{ Message }} />
      </RuntimeProvider>,
    );

    const text = await screen.findByTestId("text");
    expect(text.textContent).toBe("hello");
  });
});
