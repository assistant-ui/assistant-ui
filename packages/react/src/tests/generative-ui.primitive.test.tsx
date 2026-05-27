// @vitest-environment jsdom

import { defineComponent, createLibrary } from "@openuidev/react-lang";
import { render, screen, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { AssistantRuntimeProvider } from "../context";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter, ThreadMessageLike } from "../index";

vi.mock("@openuidev/react-lang", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@openuidev/react-lang")>();
  return {
    ...actual,
    Renderer: ({ response }: { response: string | null }) => (
      <div data-testid="openui-renderer">{response}</div>
    ),
  };
});

const Card = defineComponent({
  name: "Card",
  description: "Card",
  props: z.object({ title: z.string().optional() }),
  component: ({ props }) => <div data-component="Card">{props.title}</div>,
});

const testLibrary = createLibrary({
  root: "Card",
  components: [Card],
});

const sampleSource = `root = Card([], "Hello")`;

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const generativeMessages = (source: string): ThreadMessageLike[] => [
  {
    role: "assistant",
    content: [{ type: "generative-ui", source }],
    status: { type: "complete", reason: "stop" },
  },
];

const RuntimeProvider: FC<
  PropsWithChildren<{ messages: ThreadMessageLike[] }>
> = ({ children, messages }) => {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: messages,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const renderThread = (MessageComponent: FC, messages: ThreadMessageLike[]) => {
  render(
    <RuntimeProvider messages={messages}>
      <ThreadPrimitive.Messages components={{ Message: MessageComponent }} />
    </RuntimeProvider>,
  );
};

describe("MessagePrimitive.Parts generative-ui slot", () => {
  it("renders a generative-ui part via components.generativeUI slot", async () => {
    const Slot: FC = () => (
      <MessagePrimitive.GenerativeUI library={testLibrary} />
    );

    const Message: FC = () => (
      <MessagePrimitive.Parts components={{ generativeUI: Slot }} />
    );

    renderThread(Message, generativeMessages(sampleSource));

    await waitFor(() => {
      expect(screen.getByTestId("openui-renderer")).toBeTruthy();
    });
  });

  it("warns when generative-ui part has no slot", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const Message: FC = () => (
      <div data-testid="parts-host">
        <MessagePrimitive.Parts components={{}} />
      </div>
    );

    renderThread(Message, generativeMessages(sampleSource));

    await waitFor(() => {
      expect(screen.getByTestId("parts-host")).toBeTruthy();
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("`components.generativeUI` slot"),
    );

    warn.mockRestore();
  });
});

describe("MessagePrimitive.GenerativeUI (store-backed)", () => {
  it("reads source from part scope when no source prop is passed", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "generative-ui") {
            return <MessagePrimitive.GenerativeUI library={testLibrary} />;
          }
          return null;
        }}
      </MessagePrimitive.Parts>
    );

    renderThread(Message, generativeMessages(sampleSource));

    await waitFor(() => {
      expect(screen.getByTestId("openui-renderer").textContent).toBe(
        sampleSource,
      );
    });
  });
});
