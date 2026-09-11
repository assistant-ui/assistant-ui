import { bench, describe } from "vitest";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const Text = ({ text }: { text: string }) => createElement("span", null, text);
const Message = () => {
  useAuiState((s) => s.message.role);
  return createElement(MessagePrimitiveParts, { components: { Text } });
};
const COMPONENTS = { Message };

const seedText = (i: number) =>
  `message ${i} with a sentence of ordinary length behind it.`;

const seed = (n: number): Msg[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 ? "assistant" : "user",
    text: seedText(i),
  }));

type Host = { tick: () => void; unmount: () => void };

const mount = (n: number): Host => {
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const last = `m${n - 1}`;
  const body = seedText(n - 1);
  const App = () => {
    const [messages, set] = useState<Msg[]>(() => seed(n));
    setMessages = set;
    const runtime = useExternalStoreRuntime<Msg>({
      messages,
      convertMessage,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages components={COMPONENTS} />
      </AssistantRuntimeProvider>
    );
  };
  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(App)));
  let flip = false;
  return {
    tick: () => {
      flip = !flip;
      const tail = flip ? " tok a" : " tok b";
      flushSync(() =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === last ? { ...m, text: `${body}${tail}` } : m,
          ),
        ),
      );
    },
    unmount: () => flushSync(() => root.unmount()),
  };
};

const SIZES = [10, 100, 1000];

describe("external-store thread: mount+unmount by message count", () => {
  for (const n of SIZES) {
    bench(`${n} messages`, () => mount(n).unmount());
  }
});

// The last message flips between two same-length endings, so every sample
// pays for one token change at a fixed thread size instead of an ever-growing
// message.
describe("external-store thread: one token changed in the last message, by thread length", () => {
  for (const n of SIZES) {
    let host: Host;
    bench(`${n} messages`, () => host.tick(), {
      setup: () => {
        host = mount(n);
      },
      teardown: () => host.unmount(),
    });
  }
});
