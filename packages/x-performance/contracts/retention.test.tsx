import { describe, expect, it } from "vitest";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";

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

const collectGarbage = async () => {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc)
    throw new Error("run vitest with --expose-gc (see vitest.config.ts)");
  await new Promise((resolve) => setTimeout(resolve, 0));
  gc();
  await new Promise((resolve) => setTimeout(resolve, 0));
  gc();
};

describe("retention", () => {
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
    await collectGarbage();

    expect(refs.map((ref) => ref.deref())).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
