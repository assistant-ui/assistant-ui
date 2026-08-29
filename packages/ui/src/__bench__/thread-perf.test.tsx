import { Profiler, useState, type ComponentType } from "react";
import { act, render } from "@testing-library/react";
import { appendFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    INTERNAL: {
      ...original.INTERNAL,
      useSmooth: (part: { text: string }) => part,
      useSmoothStatus: () => ({ type: "complete" }),
      withSmoothContextProvider: (component: ComponentType) => component,
    },
  };
});

const MESSAGES = Number(process.env.BENCH_MESSAGES ?? 100);
const TOKENS = Number(process.env.BENCH_TOKENS ?? 300);
const APPENDS = Number(process.env.BENCH_APPENDS ?? 20);
const LABEL = process.env.BENCH_LABEL ?? "unlabeled";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const makeMessage = (i: number): ThreadMessageLike => ({
  id: `m${i}`,
  role: i % 2 === 0 ? "user" : "assistant",
  content: [{ type: "text", text: `${LOREM} (${i})` }],
  createdAt: new Date(1_700_000_000_000 + i * 1000),
});

let setStore!: (
  update: (s: { messages: ThreadMessageLike[]; isRunning: boolean }) => {
    messages: ThreadMessageLike[];
    isRunning: boolean;
  },
) => void;

const convertMessage = (m: ThreadMessageLike) => m;

const App = ({ onRender }: { onRender: (d: number) => void }) => {
  const [store, set] = useState(() => ({
    messages: Array.from({ length: MESSAGES }, (_, i) => makeMessage(i)),
    isRunning: false,
  }));
  setStore = set;
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: store.messages,
    isRunning: store.isRunning,
    convertMessage,
    onNew: async () => {},
  });
  return (
    <Profiler id="thread" onRender={(_, __, actual) => onRender(actual)}>
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread autoFocus={false} />
      </AssistantRuntimeProvider>
    </Profiler>
  );
};

type Phase = { commits: number; profiled: number; wall: number };

const phase = (fn: () => void): Phase => {
  const p: Phase = { commits: 0, profiled: 0, wall: 0 };
  currentPhase = p;
  const start = performance.now();
  fn();
  p.wall = performance.now() - start;
  return p;
};
let currentPhase: Phase | undefined;

describe("thread perf", () => {
  it("mount, stream, append", () => {
    Element.prototype.scrollIntoView ??= () => {};
    (globalThis as any).ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    const onRender = (d: number) => {
      if (!currentPhase) return;
      currentPhase.commits++;
      currentPhase.profiled += d;
    };

    let container!: HTMLElement;
    const mount = phase(() => {
      container = render(<App onRender={onRender} />).container;
    });
    expect(container.textContent).toContain(`(${MESSAGES - 1})`);

    const appendToken = (token: string) =>
      act(() => {
        setStore((s) => {
          const last = s.messages[s.messages.length - 1]!;
          const text = (last.content as { text: string }[])[0]!.text + token;
          return {
            ...s,
            messages: [
              ...s.messages.slice(0, -1),
              { ...last, content: [{ type: "text", text }] },
            ],
          };
        });
      });

    act(() => setStore((s) => ({ ...s, isRunning: true })));
    const stream = phase(() => {
      for (let i = 0; i < TOKENS; i++) appendToken(" tok" + i);
    });
    act(() => setStore((s) => ({ ...s, isRunning: false })));

    const append = phase(() => {
      for (let i = 0; i < APPENDS; i++) {
        act(() => {
          setStore((s) => ({
            ...s,
            messages: [...s.messages, makeMessage(s.messages.length)],
          }));
        });
      }
    });

    const row = (name: string, p: Phase, n: number) =>
      `${name.padEnd(8)} commits=${String(p.commits).padStart(5)} ` +
      `profiled=${p.profiled.toFixed(1).padStart(9)}ms ` +
      `wall=${p.wall.toFixed(1).padStart(9)}ms ` +
      `per-op=${(p.wall / n).toFixed(2)}ms`;
    const report = [
      `[bench ${LABEL}] messages=${MESSAGES} tokens=${TOKENS} appends=${APPENDS}`,
      row("mount", mount, 1),
      row("stream", stream, TOKENS),
      row("append", append, APPENDS),
    ].join("\n");
    expect(container.textContent).toContain(`tok${TOKENS - 1}`);
    expect(container.textContent).toContain(`(${MESSAGES + APPENDS - 1})`);
    console.log(report);
    if (process.env.BENCH_OUT) appendFileSync(process.env.BENCH_OUT, report + "\n");
  });
});
