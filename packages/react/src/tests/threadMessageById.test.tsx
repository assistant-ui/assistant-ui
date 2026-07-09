// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { useState, type FC, type PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  unstable_useThreadMessageIds,
  type ThreadMessageLike,
} from "../index";
import * as ThreadPrimitive from "../primitives/thread";
import * as MessagePrimitive from "../primitives/message";
import * as MessagePartPrimitive from "../primitives/messagePart";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const TextPart: FC = () => <MessagePartPrimitive.Text />;
const Message: FC = () => (
  <MessagePrimitive.Parts components={{ Text: TextPart }} />
);
const COMPONENTS = { Message };

let setMessages: (updater: (prev: Msg[]) => Msg[]) => void;

const Provider: FC<PropsWithChildren<{ initial: Msg[] }>> = ({
  initial,
  children,
}) => {
  const [messages, setState] = useState(initial);
  setMessages = setState;
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

let lastIds: readonly string[] | undefined;
const idIdentities: (readonly string[])[] = [];

const List: FC = () => {
  const ids = unstable_useThreadMessageIds();
  lastIds = ids;
  if (idIdentities[idIdentities.length - 1] !== ids) idIdentities.push(ids);
  return (
    <>
      {ids.map((id) => (
        <div data-testid={`by-id-${id}`} key={id}>
          <ThreadPrimitive.Unstable_MessageById
            messageId={id}
            components={COMPONENTS}
          />
        </div>
      ))}
    </>
  );
};

const initial: Msg[] = [
  { id: "m1", role: "user", text: "first" },
  { id: "m2", role: "assistant", text: "second" },
  { id: "m3", role: "user", text: "third" },
];

const reset = () => {
  lastIds = undefined;
  idIdentities.length = 0;
};

describe("unstable_useThreadMessageIds", () => {
  it("returns the message ids in thread order", () => {
    reset();
    render(
      <Provider initial={initial}>
        <List />
      </Provider>,
    );
    expect(lastIds).toEqual(["m1", "m2", "m3"]);
  });

  it("keeps a stable array identity across content-only updates", async () => {
    reset();
    render(
      <Provider initial={initial}>
        <List />
      </Provider>,
    );
    const before = lastIds;

    await act(async () => {
      setMessages((prev) =>
        prev.map((m) => (m.id === "m2" ? { ...m, text: "second-edited" } : m)),
      );
    });

    expect(lastIds).toBe(before);
    expect(idIdentities).toHaveLength(1);
  });

  it("changes array identity when the id sequence changes", async () => {
    reset();
    render(
      <Provider initial={initial}>
        <List />
      </Provider>,
    );
    const before = lastIds;

    await act(async () => {
      setMessages((prev) => [
        ...prev,
        { id: "m4", role: "user", text: "fourth" },
      ]);
    });

    expect(lastIds).not.toBe(before);
    expect(lastIds).toEqual(["m1", "m2", "m3", "m4"]);
  });
});

describe("ThreadPrimitive.Unstable_MessageById", () => {
  it("renders the same content as MessageByIndex for a known id", () => {
    reset();
    render(
      <Provider initial={initial}>
        <ThreadPrimitive.MessageByIndex index={1} components={COMPONENTS} />
        <div data-testid="by-id">
          <ThreadPrimitive.Unstable_MessageById
            messageId="m2"
            components={COMPONENTS}
          />
        </div>
      </Provider>,
    );
    expect(screen.getByTestId("by-id").textContent).toBe("second");
  });

  it("renders null for an unknown id without throwing", () => {
    reset();
    expect(() =>
      render(
        <Provider initial={initial}>
          <div data-testid="by-id">
            <ThreadPrimitive.Unstable_MessageById
              messageId="does-not-exist"
              components={COMPONENTS}
            />
          </div>
        </Provider>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId("by-id").textContent).toBe("");
  });

  it("renders null when messageId changes from known to unknown", () => {
    reset();
    const { rerender } = render(
      <Provider initial={initial}>
        <div data-testid="by-id">
          <ThreadPrimitive.Unstable_MessageById
            messageId="m3"
            components={COMPONENTS}
          />
        </div>
      </Provider>,
    );
    expect(screen.getByTestId("by-id").textContent).toBe("third");

    expect(() =>
      rerender(
        <Provider initial={initial}>
          <div data-testid="by-id">
            <ThreadPrimitive.Unstable_MessageById
              messageId="does-not-exist"
              components={COMPONENTS}
            />
          </div>
        </Provider>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId("by-id").textContent).toBe("");
  });

  it("stays attached to the same message across reordering", async () => {
    reset();
    render(
      <Provider initial={initial}>
        <div data-testid="by-id">
          <ThreadPrimitive.Unstable_MessageById
            messageId="m1"
            components={COMPONENTS}
          />
        </div>
      </Provider>,
    );
    expect(screen.getByTestId("by-id").textContent).toBe("first");

    await act(async () => {
      setMessages((prev) => [...prev].reverse());
    });

    expect(screen.getByTestId("by-id").textContent).toBe("first");
  });
});

describe("exports", () => {
  it("exposes the unstable id-keyed surface", () => {
    expect(typeof unstable_useThreadMessageIds).toBe("function");
    expect(ThreadPrimitive.Unstable_MessageById).toBeDefined();
  });
});
