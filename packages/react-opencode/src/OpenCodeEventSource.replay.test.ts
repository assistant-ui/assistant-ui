import { afterEach, expect, it, vi } from "vitest";
import {
  OpenCodeEventSource,
  STREAM_RECONNECTED_EVENT_TYPE,
} from "./OpenCodeEventSource";

const createSource = () => {
  const signals: AbortSignal[] = [];
  const subscribe = vi.fn((_: unknown, options: { signal: AbortSignal }) => {
    signals.push(options.signal);
    return Promise.resolve({
      stream: (async function* () {
        await new Promise<void>((resolve) => {
          options.signal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
      })(),
    });
  });
  return {
    source: new OpenCodeEventSource({ event: { subscribe } } as never),
    signals,
    subscribe,
  };
};

afterEach(() => vi.useRealTimers());

it("keeps the live stream through a same-tick subscription replay", async () => {
  vi.useFakeTimers();
  const { source, signals, subscribe } = createSource();
  const listener = vi.fn();

  const unsubscribe = source.subscribe(listener);
  await Promise.resolve();
  expect(subscribe).toHaveBeenCalledOnce();

  unsubscribe();
  const unsubscribeAgain = source.subscribe(listener);

  expect(signals[0]!.aborted).toBe(false);
  await vi.runAllTimersAsync();
  expect(subscribe).toHaveBeenCalledOnce();
  expect(listener).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: STREAM_RECONNECTED_EVENT_TYPE }),
  );

  unsubscribeAgain();
  await vi.runAllTimersAsync();
  source.dispose();
});

it("disconnects after a genuine last unsubscribe", async () => {
  vi.useFakeTimers();
  const { source, signals, subscribe } = createSource();
  const unsubscribe = source.subscribe(vi.fn());
  await Promise.resolve();
  expect(subscribe).toHaveBeenCalledOnce();

  unsubscribe();
  await vi.runAllTimersAsync();

  expect(signals[0]!.aborted).toBe(true);
  source.dispose();
});

it("reconnects when a listener returns after the replay window", async () => {
  const { source, signals, subscribe } = createSource();
  const unsubscribe = source.subscribe(vi.fn());
  await Promise.resolve();
  expect(subscribe).toHaveBeenCalledOnce();

  unsubscribe();
  await Promise.resolve();
  const listener = vi.fn();
  source.subscribe(listener);

  await vi.waitFor(() => expect(subscribe).toHaveBeenCalledTimes(2));
  expect(signals[0]!.aborted).toBe(true);
  await vi.waitFor(() =>
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ type: STREAM_RECONNECTED_EVENT_TYPE }),
    ),
  );
  source.dispose();
});
