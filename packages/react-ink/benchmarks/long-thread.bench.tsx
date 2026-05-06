/**
 * Long-thread microbenchmark for `@assistant-ui/react-ink`.
 *
 * Renders a 1000-message thread, then drives a simulated 60+ tokens/sec
 * stream against the most recent message. Measures:
 *
 *   - frame count   : how many times the Ink renderer flushed a frame
 *   - mean ms/frame : average wall-clock between flushes
 *   - peak ms/frame : worst-case (longest) gap between flushes
 *
 * Frame counting hooks `process.stdout.write` (the channel `ink` uses to push
 * its frame buffer). Each write that begins with the alt-screen / cursor-home
 * sequence is one frame.
 *
 * Run:
 *   pnpm --filter @assistant-ui/react-ink exec tsx benchmarks/long-thread.bench.tsx
 */
import { performance } from "node:perf_hooks";
import type React from "react";
import { Box, Text } from "ink";
// `ink-testing-library` exports a real Ink renderer that writes to an
// in-memory stdout, which is exactly what we want for deterministic timing.
import { render } from "ink-testing-library";
import { AuiProvider, type AssistantClient } from "@assistant-ui/store";
import { ThreadPrimitive } from "../src/index";

/* ------------------------------------------------------------------ */
/*                          Fake assistant store                       */
/* ------------------------------------------------------------------ */

type Listener = () => void;

type Msg = {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
};

const buildState = (msgs: Msg[]) => ({
  thread: { isRunning: false, messages: msgs },
  message: undefined as unknown,
  tools: { tools: {} },
  dataRenderers: { renderers: {} },
});

/**
 * Minimal AuiClient stand-in. We only need:
 *   - subscribe / getState (for useSyncExternalStore)
 *   - thread().message({index}).getState() (for RenderChildrenWithAccessor)
 *   - getProxiedAssistantState behavior — the real store hands a Proxy that
 *     reads from getState(), so we replicate that with a thin getter.
 *
 * AuiProvider takes the client verbatim; the per-message provider in
 * `@assistant-ui/core/react` overlays `state.message` for each index.
 */
const makeFakeClient = (initial: Msg[]) => {
  let msgs = initial.slice();
  const listeners = new Set<Listener>();
  const notify = () => {
    for (const l of listeners) l();
  };

  const client = {
    getState: () => buildState(msgs),
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    thread: () => ({
      message: ({ index }: { index: number }) => ({
        getState: () => msgs[index],
      }),
      getState: () => ({ messages: msgs, isRunning: false }),
    }),
  } as unknown as AssistantClient;

  return {
    client,
    push: (m: Msg) => {
      msgs = msgs.concat(m);
      notify();
    },
    update: (index: number, m: Msg) => {
      msgs = msgs.slice();
      msgs[index] = m;
      notify();
    },
  };
};

/* ------------------------------------------------------------------ */
/*                            App under test                           */
/* ------------------------------------------------------------------ */

const Message = () => (
  <Box>
    <Text>m</Text>
  </Box>
);

type AppProps = {
  client: AssistantClient;
  windowSize?: number | undefined;
};

const App: React.FC<AppProps> = ({ client, windowSize }) => (
  <AuiProvider value={client}>
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Messages
        windowSize={windowSize}
        components={{ Message }}
      />
    </ThreadPrimitive.Root>
  </AuiProvider>
);

/* ------------------------------------------------------------------ */
/*                                 Run                                 */
/* ------------------------------------------------------------------ */

const N_MESSAGES = 1000;
const N_TOKENS = 600; // ≈10 seconds of streaming at 60 tok/s
const TOKEN_INTERVAL_MS = 16; // 62.5 tok/s

const seed = (n: number): Msg[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    parts: [{ type: "text", text: `seed message ${i}` }],
  }));

type Result = {
  label: string;
  frames: number;
  meanMs: number;
  peakMs: number;
};

const run = async (label: string, windowSize?: number): Promise<Result> => {
  const handle = makeFakeClient(seed(N_MESSAGES));

  const frameTimes: number[] = [];
  let lastFrame = performance.now();

  const instance = render(
    <App client={handle.client} windowSize={windowSize} />,
  );

  // ink-testing-library's stdout exposes `frames`. We poll it as a proxy for
  // the renderer flush count — every entry corresponds to one committed frame.
  const stdout = (instance as unknown as { stdout: { frames: string[] } })
    .stdout;
  let lastSeen = stdout.frames.length;

  const sample = () => {
    if (stdout.frames.length !== lastSeen) {
      const now = performance.now();
      frameTimes.push(now - lastFrame);
      lastFrame = now;
      lastSeen = stdout.frames.length;
    }
  };

  // Initial mount frames have settled.
  await new Promise((r) => setTimeout(r, 50));
  sample();
  frameTimes.length = 0;
  lastFrame = performance.now();

  // Drive streaming: append tokens to the last assistant message.
  let acc = "";
  for (let t = 0; t < N_TOKENS; t++) {
    acc += "x";
    handle.update(N_MESSAGES - 1, {
      id: `m${N_MESSAGES - 1}`,
      role: "assistant",
      parts: [{ type: "text", text: acc }],
    });
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
  // Warm-up.
  await run("warmup", 50);

  const baselineTrials: Result[] = [];
  const windowedTrials: Result[] = [];
  for (let i = 0; i < 3; i++) {
    baselineTrials.push(await run(`baseline (no window)  #${i + 1}`));
    windowedTrials.push(await run(`windowed 50           #${i + 1}`, 50));
  }

  console.log("\n=== long-thread.bench (1000 messages, ~10s @ 62 tok/s) ===\n");
  for (const set of [baselineTrials, windowedTrials])
    for (const r of set) console.log(fmt(r));

  const avg = (rs: Result[]) => ({
    frames: rs.reduce((a, r) => a + r.frames, 0) / rs.length,
    mean: rs.reduce((a, r) => a + r.meanMs, 0) / rs.length,
    peak: rs.reduce((a, r) => a + r.peakMs, 0) / rs.length,
  });
  const a = avg(baselineTrials);
  const b = avg(windowedTrials);
  console.log("\n=== averages ===");
  console.log(
    `baseline    frames=${a.frames.toFixed(0)}  mean=${a.mean.toFixed(
      2,
    )}ms  peak=${a.peak.toFixed(2)}ms`,
  );
  console.log(
    `windowed 50 frames=${b.frames.toFixed(0)}  mean=${b.mean.toFixed(
      2,
    )}ms  peak=${b.peak.toFixed(2)}ms`,
  );
  const meanDelta = ((a.mean - b.mean) / a.mean) * 100;
  const peakDelta = ((a.peak - b.peak) / a.peak) * 100;
  console.log(
    `\nmean -${meanDelta.toFixed(1)}%   peak -${peakDelta.toFixed(1)}%\n`,
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
