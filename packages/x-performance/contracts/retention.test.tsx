import { describe, expect, it } from "vitest";
import {
  act,
  createElement,
  StrictMode,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import type { AssistantRuntime } from "@assistant-ui/core";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const Text = ({ text }: { text: string }) => createElement("span", null, text);
const Message = () =>
  createElement(MessagePrimitiveParts, { components: { Text } });
const COMPONENTS = { Message };

const seed = (n: number): Msg[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 ? "assistant" : "user",
    text: `message ${i}`,
  }));

const onNew = async () => {};

const createRenderer = (root: ReturnType<typeof createRoot>) => {
  const current: { element: ReactNode } = { element: null };
  const commit = () => root.render(current.element);
  return async (element: ReactNode) => {
    current.element = element;
    await act(commit);
  };
};

// WeakRef targets survive the job that dereferenced them and a stale stack
// slot can keep one alive through a collection, so collect in bounded rounds
// until the refs clear; a real retention still fails after the last round.
const collectUntilCleared = async (refs: WeakRef<object>[]) => {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc)
    throw new Error("run vitest with --expose-gc (see vitest.config.ts)");
  for (let round = 0; round < 10; round++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    gc();
    if (refs.every((ref) => ref.deref() === undefined)) return;
  }
};

describe("retention", () => {
  it("releases replaced external messages while their runtime stays mounted and usable", async () => {
    const refs: WeakRef<object>[] = [];
    let runtime: AssistantRuntime | undefined;
    const App = ({
      messages,
      threadId,
    }: {
      messages: Msg[];
      threadId: string;
    }) => {
      runtime = useExternalStoreRuntime({
        messages,
        convertMessage,
        onNew,
        adapters: { threadList: { threadId } },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    const root = createRoot(document.createElement("div"));
    const renderRoot = createRenderer(root);
    const render = async (id: string, empty = false) => {
      const message: Msg = {
        id,
        role: "assistant",
        text: `${id}:${"body ".repeat(52_000)}`,
      };
      if (id === "initial") {
        refs.push(new WeakRef(message), new WeakRef({ unrooted: true }));
      }
      await renderRoot(
        <StrictMode>
          <App messages={empty ? [] : [message]} threadId={id} />
        </StrictMode>,
      );
    };
    try {
      await render("initial");
      await render("later");
      expect(runtime!.thread.getState().messages[0]!.content).toEqual([
        { type: "text", text: `later:${"body ".repeat(52_000)}` },
      ]);
      for (let i = 0; i < 6; i++) await render(`empty-${i}`, true);
      expect(runtime!.thread.getState().messages).toEqual([]);
      await collectUntilCleared(refs);
      expect(refs.map((ref) => ref.deref() === undefined)).toEqual([
        true,
        true,
      ]);
      await render("current");
      expect(runtime!.thread.getState().messages[0]!.content).toEqual([
        { type: "text", text: `current:${"body ".repeat(52_000)}` },
      ]);
    } finally {
      act(() => root.unmount());
      runtime = undefined;
    }
  });

  it("releases the runtime, its messages, and the external messages after unmount", async () => {
    const refs: WeakRef<object>[] = [];
    const App = () => {
      const [messages] = useState<Msg[]>(() => seed(100));
      const runtime = useExternalStoreRuntime<Msg>({
        messages,
        convertMessage,
        onNew: async () => {},
      });
      if (refs.length === 0) {
        refs.push(new WeakRef(runtime), new WeakRef(messages[0]!));
        refs.push(new WeakRef(runtime.thread.getState().messages[0]!));
      }
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={COMPONENTS} />
        </AssistantRuntimeProvider>
      );
    };
    const root = createRoot(document.createElement("div"));
    act(() => root.render(createElement(App)));
    expect(refs.map((ref) => ref.deref() !== undefined)).toEqual([
      true,
      true,
      true,
    ]);

    act(() => root.unmount());
    await collectUntilCleared(refs);

    expect(refs.map((ref) => ref.deref())).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
