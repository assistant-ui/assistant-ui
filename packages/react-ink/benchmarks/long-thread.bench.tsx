/**
 * Long-thread microbenchmark for `@assistant-ui/react-ink`.
 *
 * Renders a 1000-message thread, then drives a simulated 60+ tokens/sec
 * stream against the most recent message. Compares three rendering modes
 * to attribute the per-frame cost to memo vs windowing:
 *
 *   - legacy   : every message inline, no MemoMessage boundary (pre-PR)
 *   - memo     : MemoMessage per index, no windowing
 *   - windowed : MemoMessage + windowSize=50, prefix flushed via <Static>
 *
 * Reports frame count, mean ms/frame, and peak ms/frame for each mode plus
 * percentage deltas. Frame counting reads `ink-testing-library`'s in-memory
 * `stdout.frames` array — every committed Ink flush is one entry.
 *
 * The harness mounts the readonly thread runtime once and drives streaming
 * by calling `core.setMessages(...)` directly. We deliberately bypass
 * `ReadonlyThreadProvider`'s `messages`-prop-driven update path so the
 * provider tree does not re-render on every token; otherwise per-token
 * provider re-render cost dominates and masks the rendering-mode delta.
 *
 * Run:
 *   pnpm --filter @assistant-ui/react-ink exec tsx benchmarks/long-thread.bench.tsx
 */
import { performance } from "node:perf_hooks";
import type React from "react";
import { useMemo, useState } from "react";
import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import {
  AuiProvider,
  Derived,
  RenderChildrenWithAccessor,
  useAui,
  useAuiState,
} from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";
import {
  ReadonlyThreadRuntimeCore,
  ThreadRuntimeImpl,
  type ThreadRuntimeCoreBinding,
  type ThreadListItemRuntimeBinding,
} from "@assistant-ui/core/internal";
import { ThreadClient } from "@assistant-ui/core/store/internal";
import type { ThreadMessage } from "@assistant-ui/core";
import { ThreadPrimitive } from "../src/index";

/* ------------------------------------------------------------------ */
/*                       Bench harness (provider)                       */
/* ------------------------------------------------------------------ */

const READONLY_THREAD_PATH = Object.freeze({
  ref: "readonly-thread",
  threadSelector: { type: "main" as const },
});

const READONLY_THREAD_LIST_ITEM = Object.freeze({
  id: "readonly",
  remoteId: undefined,
  externalId: undefined,
  isMain: true,
  status: "regular" as const,
  title: undefined,
});

const READONLY_THREAD_LIST_ITEM_BINDING: ThreadListItemRuntimeBinding =
  Object.freeze({
    path: READONLY_THREAD_PATH,
    getState: () => READONLY_THREAD_LIST_ITEM,
    subscribe: () => () => {},
  });

/**
 * Mirrors `ReadonlyThreadProvider` but exposes the underlying
 * `ReadonlyThreadRuntimeCore` to the test driver via `coreRef`. The provider
 * mounts once with the initial messages and then never re-renders — the
 * driver pushes streaming updates straight into `core.setMessages`, which
 * notifies subscribers exactly the same way the production provider does.
 */
const BenchProvider: React.FC<{
  initialMessages: readonly ThreadMessage[];
  coreRef: { current: ReadonlyThreadRuntimeCore | null };
  children: React.ReactNode;
}> = ({ initialMessages, coreRef, children }) => {
  const [core] = useState(() => {
    const c = new ReadonlyThreadRuntimeCore();
    c.setMessages(initialMessages);
    return c;
  });

  // Stash for the driver. Stable for the lifetime of the harness.
  coreRef.current = core;

  const threadRuntime = useMemo(() => {
    const threadBinding: ThreadRuntimeCoreBinding = {
      path: READONLY_THREAD_PATH,
      getState: () => core,
      subscribe: (callback) => core.subscribe(callback),
      outerSubscribe: (callback) => core.subscribe(callback),
    };
    return new ThreadRuntimeImpl(
      threadBinding,
      READONLY_THREAD_LIST_ITEM_BINDING,
    );
  }, [core]);

  const aui = useAui({
    thread: ThreadClient({ runtime: threadRuntime }),
    composer: Derived({
      source: "thread",
      query: {},
      get: (a) => a.thread().composer(),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

/* ------------------------------------------------------------------ */
/*                            App under test                           */
/* ------------------------------------------------------------------ */

/**
 * Each rendered message subscribes to its own first-part text length. Per-
 * token mutations to the streaming message therefore flow through the
 * message-level selector and produce a visibly different render output —
 * exactly the production behavior the perf changes target. Without this,
 * `parts[0]` reference changes but the rendered DOM is identical and Ink
 * skips the commit, so `stdout.frames` doesn't grow and the bench
 * measures nothing.
 */
const Message = () => {
  const len = useAuiState((s) => {
    const part = s.message.parts[0];
    return part && part.type === "text" ? part.text.length : 0;
  });
  return (
    <Box>
      <Text>m{len}</Text>
    </Box>
  );
};

/**
 * Pre-PR baseline: render every message inline without the `MemoMessage`
 * boundary. Mirrors `ThreadMessages` before this PR so the perf contribution
 * of the memo change can be isolated from windowing.
 */
const LegacyThreadMessages: React.FC = () => {
  const messagesLength = useAuiState((s) => s.thread.messages.length);
  if (messagesLength === 0) return null;
  return (
    <Box flexDirection="column">
      {Array.from({ length: messagesLength }, (_, index) => (
        <MessageByIndexProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) => aui.thread().message({ index }).getState()}
          >
            {() => <Message />}
          </RenderChildrenWithAccessor>
        </MessageByIndexProvider>
      ))}
    </Box>
  );
};

type Mode = "legacy" | "memo" | "windowed";

const App: React.FC<{
  coreRef: { current: ReadonlyThreadRuntimeCore | null };
  initialMessages: readonly ThreadMessage[];
  mode: Mode;
  windowSize?: number | undefined;
}> = ({ coreRef, initialMessages, mode, windowSize }) => (
  <BenchProvider initialMessages={initialMessages} coreRef={coreRef}>
    <ThreadPrimitive.Root>
      {mode === "legacy" ? (
        <LegacyThreadMessages />
      ) : (
        <ThreadPrimitive.Messages
          windowSize={mode === "windowed" ? windowSize : undefined}
          components={{ Message }}
        />
      )}
    </ThreadPrimitive.Root>
  </BenchProvider>
);

/* ------------------------------------------------------------------ */
/*                                 Run                                 */
/* ------------------------------------------------------------------ */

const N_MESSAGES = 1000;
const N_TOKENS = 300; // ≈5 seconds of streaming at 60 tok/s
const TOKEN_INTERVAL_MS = 16; // 62.5 tok/s
const N_TRIALS = 2;

const userMsg = (i: number): ThreadMessage =>
  ({
    id: `m${i}`,
    role: "user",
    content: [{ type: "text", text: `seed message ${i}` }],
    attachments: [],
    metadata: { custom: {} },
    createdAt: new Date(0),
  }) as unknown as ThreadMessage;

const assistantMsg = (i: number, text: string): ThreadMessage =>
  ({
    id: `m${i}`,
    role: "assistant",
    content: [{ type: "text", text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
    createdAt: new Date(0),
  }) as unknown as ThreadMessage;

const seed = (n: number): ThreadMessage[] =>
  Array.from({ length: n }, (_, i) =>
    i % 2 === 0 ? userMsg(i) : assistantMsg(i, `seed message ${i}`),
  );

type Result = {
  label: string;
  frames: number;
  meanMs: number;
  peakMs: number;
};

const run = async (
  label: string,
  mode: Mode,
  windowSize?: number,
): Promise<Result> => {
  const initialMessages = seed(N_MESSAGES);
  const coreRef: { current: ReadonlyThreadRuntimeCore | null } = {
    current: null,
  };

  const frameTimes: number[] = [];
  let lastFrame = performance.now();

  const instance = render(
    <App
      coreRef={coreRef}
      initialMessages={initialMessages}
      mode={mode}
      windowSize={windowSize}
    />,
  );

  const stdout = (instance as unknown as { stdout: { frames: string[] } })
    .stdout;
  let lastSeen = stdout.frames.length;

  // Distribute elapsed wall time evenly across new frames if multiple flushed
  // between sample ticks. Keeps `frames` honest and the per-entry delta close
  // to the true per-frame interval; the burst's actual frame timing is not
  // observable through `stdout.frames.length` alone.
  const sample = () => {
    const newFrames = stdout.frames.length - lastSeen;
    if (newFrames <= 0) return;
    const now = performance.now();
    const perFrame = (now - lastFrame) / newFrames;
    for (let i = 0; i < newFrames; i++) frameTimes.push(perFrame);
    lastFrame = now;
    lastSeen = stdout.frames.length;
  };

  // Initial mount frames have settled.
  await new Promise((r) => setTimeout(r, 100));
  sample();
  frameTimes.length = 0;
  lastFrame = performance.now();

  const core = coreRef.current;
  if (!core) throw new Error("BenchProvider did not capture core");

  // Drive streaming via the captured core handle. No React prop changes —
  // the provider does not re-render. Every update is `core.setMessages(...)
  // → notifySubscribers`, exactly the production update path under load.
  //
  // Each token both (a) mutates the trailing streaming message's text and
  // (b) appends a new message to the thread. (a) exercises the message-
  // level subscriber on the streaming entry; (b) makes the parent length
  // selector tick every token, which is what triggers the per-token parent
  // re-render that the memo + windowing changes optimize. Without (b), the
  // parent would only re-render on new turns and the bench would primarily
  // measure ink-flush cost rather than reconciliation cost.
  let acc = "";
  let cur: ThreadMessage[] = [...initialMessages];
  for (let t = 0; t < N_TOKENS; t++) {
    acc += "x";
    const streamingIdx = cur.length - 1;
    const updatedStreaming = assistantMsg(streamingIdx, acc);
    const newTail = userMsg(cur.length); // index = previous length
    const next: ThreadMessage[] = [
      ...cur.slice(0, -1),
      updatedStreaming,
      newTail,
    ];
    core.setMessages(next);
    cur = next;
    await new Promise((r) => setTimeout(r, TOKEN_INTERVAL_MS));
    sample();
  }

  instance.unmount();

  const frames = frameTimes.length;
  const meanMs =
    frames === 0 ? 0 : frameTimes.reduce((a, b) => a + b, 0) / frames;
  const peakMs = frames === 0 ? 0 : Math.max(...frameTimes);

  return { label, frames, meanMs, peakMs };
};

const fmt = (r: Result) =>
  `${r.label.padEnd(28)}  frames=${String(r.frames).padStart(4)}  mean=${r.meanMs
    .toFixed(2)
    .padStart(6)}ms  peak=${r.peakMs.toFixed(2).padStart(6)}ms`;

const main = async () => {
  console.log(
    `\n=== long-thread.bench (${N_MESSAGES} messages, ${(N_TOKENS * TOKEN_INTERVAL_MS) / 1000}s @ ${(1000 / TOKEN_INTERVAL_MS).toFixed(0)} tok/s, ${N_TRIALS} trials each) ===\n`,
  );

  // Warm-up.
  console.log("warmup...");
  await run("warmup", "windowed", 50);

  const legacyTrials: Result[] = [];
  const memoTrials: Result[] = [];
  const windowedTrials: Result[] = [];
  const trialDriver = async (
    label: string,
    mode: Mode,
    bucket: Result[],
    windowSize?: number,
  ) => {
    const r = await run(label, mode, windowSize);
    bucket.push(r);
    console.log(fmt(r));
  };
  for (let i = 0; i < N_TRIALS; i++) {
    await trialDriver(
      `legacy (no memo)      #${i + 1}`,
      "legacy",
      legacyTrials,
    );
    await trialDriver(`memo only (no window) #${i + 1}`, "memo", memoTrials);
    await trialDriver(
      `windowed 50 + memo    #${i + 1}`,
      "windowed",
      windowedTrials,
      50,
    );
  }

  const avg = (rs: Result[]) => ({
    frames: rs.reduce((a, r) => a + r.frames, 0) / rs.length,
    mean: rs.reduce((a, r) => a + r.meanMs, 0) / rs.length,
    peak: rs.reduce((a, r) => a + r.peakMs, 0) / rs.length,
  });
  const l = avg(legacyTrials);
  const m = avg(memoTrials);
  const w = avg(windowedTrials);
  console.log("\n=== averages ===");
  console.log(
    `legacy        frames=${l.frames.toFixed(0)}  mean=${l.mean.toFixed(2)}ms  peak=${l.peak.toFixed(2)}ms`,
  );
  console.log(
    `memo only     frames=${m.frames.toFixed(0)}  mean=${m.mean.toFixed(2)}ms  peak=${m.peak.toFixed(2)}ms`,
  );
  console.log(
    `windowed 50   frames=${w.frames.toFixed(0)}  mean=${w.mean.toFixed(2)}ms  peak=${w.peak.toFixed(2)}ms`,
  );

  const pct = (a: number, b: number) => ((a - b) / a) * 100;
  console.log("\n=== attribution ===");
  console.log(
    `memo vs legacy        mean -${pct(l.mean, m.mean).toFixed(1)}%   peak -${pct(l.peak, m.peak).toFixed(1)}%`,
  );
  console.log(
    `windowed vs memo      mean -${pct(m.mean, w.mean).toFixed(1)}%   peak -${pct(m.peak, w.peak).toFixed(1)}%`,
  );
  console.log(
    `windowed vs legacy    mean -${pct(l.mean, w.mean).toFixed(1)}%   peak -${pct(l.peak, w.peak).toFixed(1)}%\n`,
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
