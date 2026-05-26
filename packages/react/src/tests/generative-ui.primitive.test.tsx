// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../context";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type {
  ChatModelAdapter,
  GenerativeUISpec,
  ThreadMessageLike,
} from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const Card = ({ title, children }: any) => (
  <div data-component="Card">
    <h3 data-testid="card-title">{title}</h3>
    {children}
  </div>
);

const Button = ({ label }: any) => (
  <button type="button" data-component="Button">
    {label}
  </button>
);

const Fallback = ({ component }: { component: string; props?: unknown }) => (
  <span data-fallback={component}>missing</span>
);

const spec: GenerativeUISpec = {
  root: {
    component: "Card",
    props: { title: "Hello" },
    children: [{ component: "Button", props: { label: "Click me" } }],
  },
};

const unknownSpec: GenerativeUISpec = {
  root: { component: "NotAllowed", props: { foo: 1 } },
};

const generativeMessages = (s: GenerativeUISpec): ThreadMessageLike[] => [
  {
    role: "assistant",
    content: [{ type: "generative-ui", spec: s }],
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

describe("MessagePrimitive.Parts generative-ui (store-backed)", () => {
  it("renders a generative-ui part via the components.generativeUI allowlist", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts
        components={{ generativeUI: { components: { Card, Button } } }}
      />
    );

    renderThread(Message, generativeMessages(spec));

    await waitFor(() => {
      expect(screen.getByTestId("card-title").textContent).toBe("Hello");
    });
    expect(screen.getByText("Click me")).toBeTruthy();
    expect(document.querySelector('[data-component="Card"]')).not.toBeNull();
    expect(document.querySelector('[data-component="Button"]')).not.toBeNull();
  });

  it("renders nothing for a generative-ui part when no allowlist is provided and warns in dev", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const Message: FC = () => (
      <div data-testid="parts-host">
        <MessagePrimitive.Parts components={{}} />
      </div>
    );

    renderThread(Message, generativeMessages(spec));

    await waitFor(() => {
      expect(screen.getByTestId("parts-host")).toBeTruthy();
    });

    expect(document.querySelector('[data-component="Card"]')).toBeNull();
    expect(document.querySelector('[data-component="Button"]')).toBeNull();
    expect(screen.getByTestId("parts-host").textContent).toBe("");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("`components.generativeUI.components` allowlist"),
    );

    warn.mockRestore();
  });

  it("renders the Fallback for an unknown component name instead of throwing", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts
        components={{ generativeUI: { components: { Card }, Fallback } }}
      />
    );

    renderThread(Message, generativeMessages(unknownSpec));

    await waitFor(() => {
      expect(
        document.querySelector('[data-fallback="NotAllowed"]'),
      ).not.toBeNull();
    });
    expect(screen.getByText("missing")).toBeTruthy();
  });
});

describe("MessagePrimitive.GenerativeUI (store-backed, reads part from scope)", () => {
  it("renders the spec read from the surrounding part scope when no spec prop is passed", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "generative-ui") {
            return (
              <MessagePrimitive.GenerativeUI components={{ Card, Button }} />
            );
          }
          return null;
        }}
      </MessagePrimitive.Parts>
    );

    renderThread(Message, generativeMessages(spec));

    await waitFor(() => {
      expect(screen.getByTestId("card-title").textContent).toBe("Hello");
    });
    expect(screen.getByText("Click me")).toBeTruthy();
  });
});
