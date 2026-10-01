import { describe, inject, test } from "vitest";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  ThreadPrimitiveUnstable_MessageById,
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
type Variant =
  | "runtime only"
  | "provider only"
  | "all messages"
  | "all messages by id"
  | "20 message window";

const mount = (n: number, variant: Variant = "all messages"): Host => {
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const last = `m${n - 1}`;
  const body = seedText(n - 1);
  const byIdIds =
    variant === "all messages by id"
      ? Array.from({ length: n }, (_, i) => `m${i}`)
      : variant === "20 message window"
        ? Array.from(
            { length: Math.min(n, 20) },
            (_, i) => `m${Math.max(0, n - 20) + i}`,
          )
        : null;
  const App = () => {
    const [messages, set] = useState<Msg[]>(() => seed(n));
    setMessages = set;
    const runtime = useExternalStoreRuntime<Msg>({
      messages,
      convertMessage,
      onNew: async () => {},
    });
    if (variant === "runtime only") return null;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {variant === "all messages" ? (
          <ThreadPrimitiveMessages components={COMPONENTS} />
        ) : (
          byIdIds?.map((messageId) => (
            <ThreadPrimitiveUnstable_MessageById
              key={messageId}
              messageId={messageId}
              components={COMPONENTS}
            />
          ))
        )}
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
      setMessages((prev) =>
        prev.map((m) => (m.id === last ? { ...m, text: `${body}${tail}` } : m)),
      );
    },
    unmount: () => flushSync(() => root.unmount()),
  };
};

const SIZES = [10, 100, 1000];

describe("external-store thread: mount+unmount by message count", () => {
  for (const n of SIZES) {
    test(`${n} messages`, async ({ bench }) => {
      await bench(`${n} messages`, () => mount(n).unmount()).run(
        inject("benchSampling"),
      );
    });
  }
});

// The last message flips between two same-length endings, so every sample
// pays for one token change at a fixed thread size instead of an ever-growing
// message.
describe("external-store thread: one token changed in the last message, by thread length", () => {
  for (const n of SIZES) {
    let host: Host;
    test(`${n} messages`, async ({ bench }) => {
      await bench(
        `${n} messages`,
        {
          beforeAll: () => {
            host = mount(n);
          },
          afterAll: () => host.unmount(),
        },
        () => flushSync(host.tick),
      ).run(inject("benchSampling"));
    });
  }
});

// `act` settles each token's host update and runtime store notification.
// Runtime only mounts the hook; provider only adds thread and message clients.
// All messages uses the list path; all messages by id uses the ID path at full count.
// The 20 message window uses the ID path for only the last 20 scopes.
describe("external-store thread: one token changed in the last message, by layer", () => {
  for (const n of SIZES) {
    for (const variant of [
      "runtime only",
      "provider only",
      "all messages",
      "all messages by id",
      "20 message window",
    ] as const) {
      const row = `${variant}, ${n} messages`;
      let host: Host;
      test(row, async ({ bench }) => {
        await bench(
          row,
          {
            beforeAll: () => {
              host = mount(n, variant);
              (
                globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
              ).IS_REACT_ACT_ENVIRONMENT = true;
            },
            afterAll: () => {
              (
                globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
              ).IS_REACT_ACT_ENVIRONMENT = false;
              host.unmount();
            },
          },
          async () => {
            await act(host.tick);
          },
        ).run(inject("benchSampling"));
      });
    }
  }
});
