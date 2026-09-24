// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantCloudEvents,
  clearPendingAssistantCloudEvents,
  type AssistantCloudEvent,
} from "./AssistantCloudEvents";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";

const event = (index: number): AssistantCloudEvent => ({
  kind: "message_sent",
  thread_id: `thread-${index}`,
});

const createEvents = (enabled: boolean | (() => boolean) = true) => {
  const makeRequest = vi.fn().mockResolvedValue({ accepted: 1 });
  const events = new AssistantCloudEvents(
    { makeRequest } as unknown as AssistantCloudAPI,
    typeof enabled === "function" ? enabled : () => enabled,
  );
  return { events, makeRequest };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});

describe("AssistantCloudEvents", () => {
  it("flushes twenty events in one keepalive request", async () => {
    const { events, makeRequest } = createEvents();

    for (let index = 0; index < 20; index++) events.track(event(index));

    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
    expect(makeRequest).toHaveBeenCalledWith("/events", {
      method: "POST",
      body: { events: Array.from({ length: 20 }, (_, index) => event(index)) },
      keepalive: true,
    });
  });

  it("keeps its page listeners only while events are buffered", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { events, makeRequest } = createEvents();

    for (let index = 0; index < 20; index++) events.track(event(index));
    expect(add).toHaveBeenCalledWith("pagehide", expect.any(Function));

    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(remove).toHaveBeenCalledWith("pagehide", expect.any(Function)),
    );
  });

  it("dispose removes the listeners and flushes what is buffered", async () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { events, makeRequest } = createEvents();

    events.track(event(1));
    events.dispose();

    expect(remove).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
  });

  it("flushes buffered events after two seconds", async () => {
    vi.useFakeTimers();
    const { events, makeRequest } = createEvents();

    events.track(event(1));
    await vi.advanceTimersByTimeAsync(1_999);
    expect(makeRequest).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(makeRequest).toHaveBeenCalledOnce();
  });

  it("retries a failed event batch with bounded backoff", async () => {
    vi.useFakeTimers();
    const { events, makeRequest } = createEvents();
    makeRequest.mockRejectedValueOnce(new Error("temporary failure"));

    for (let index = 0; index < 20; index++) events.track(event(index));
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());

    await vi.advanceTimersByTimeAsync(249);
    expect(makeRequest).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);

    expect(makeRequest).toHaveBeenCalledTimes(2);
    expect(makeRequest.mock.calls[1]).toEqual(makeRequest.mock.calls[0]);
  });

  it("does not retry a cleared batch", async () => {
    vi.useFakeTimers();
    const { events, makeRequest } = createEvents();
    makeRequest.mockRejectedValueOnce(new Error("temporary failure"));

    for (let index = 0; index < 20; index++) events.track(event(index));
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());

    clearPendingAssistantCloudEvents(events);
    await vi.runAllTimersAsync();

    expect(makeRequest).toHaveBeenCalledOnce();
  });

  it("does not let an invalidated flush consume new events", async () => {
    vi.useFakeTimers();
    let resolveFirstRequest!: (value: { accepted: number }) => void;
    const { events, makeRequest } = createEvents();
    makeRequest
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("temporary failure"));

    for (let index = 0; index < 20; index++) events.track(event(index));
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());

    window.dispatchEvent(new Event("pagehide"));
    clearPendingAssistantCloudEvents(events);
    events.track(event(20));
    resolveFirstRequest({ accepted: 20 });

    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(250);

    expect(makeRequest).toHaveBeenCalledTimes(3);
    expect(makeRequest.mock.calls[1]?.[1].body.events).toEqual([event(20)]);
    expect(makeRequest.mock.calls[2]).toEqual(makeRequest.mock.calls[1]);
  });

  it("stops retrying an event batch after three attempts", async () => {
    vi.useFakeTimers();
    const { events, makeRequest } = createEvents();
    makeRequest.mockRejectedValue(new Error("persistent failure"));

    for (let index = 0; index < 20; index++) events.track(event(index));
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());

    await vi.advanceTimersByTimeAsync(250);
    expect(makeRequest).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999);
    expect(makeRequest).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(makeRequest).toHaveBeenCalledTimes(3);
    await vi.runAllTimersAsync();

    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it("keeps dispose delivery best effort", async () => {
    vi.useFakeTimers();
    const { events, makeRequest } = createEvents();
    makeRequest.mockRejectedValue(new Error("offline"));

    events.track(event(1));
    events.dispose();
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
    await vi.runAllTimersAsync();

    expect(makeRequest).toHaveBeenCalledOnce();
  });

  it.each(["dispose", "pagehide"] as const)(
    "interrupts retry backoff on %s and drains buffered events once",
    async (trigger) => {
      vi.useFakeTimers();
      const { events, makeRequest } = createEvents();
      makeRequest.mockRejectedValue(new Error("offline"));

      for (let index = 0; index < 20; index++) events.track(event(index));
      await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
      events.track(event(20));

      if (trigger === "dispose") {
        events.dispose();
      } else {
        window.dispatchEvent(new Event("pagehide"));
      }
      await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledTimes(2));
      await vi.runAllTimersAsync();

      expect(makeRequest).toHaveBeenCalledTimes(2);
      expect(makeRequest.mock.calls[1]?.[1].body.events).toEqual([event(20)]);
    },
  );

  it("flushes when the document becomes hidden", async () => {
    const { events, makeRequest } = createEvents();
    events.track(event(1));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
  });

  it("does not send events when telemetry is disabled", async () => {
    vi.useFakeTimers();
    const { events, makeRequest } = createEvents(false);
    events.track(event(1));

    await vi.advanceTimersByTimeAsync(2_000);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it("does not send queued batches after telemetry is disabled", async () => {
    let enabled = true;
    let resolveFirstRequest!: (value: { accepted: number }) => void;
    const { events, makeRequest } = createEvents(() => enabled);
    makeRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstRequest = resolve;
        }),
    );

    for (let index = 0; index < 51; index++) events.track(event(index));
    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());

    enabled = false;
    resolveFirstRequest({ accepted: 50 });

    await vi.waitFor(() =>
      expect(makeRequest.mock.results[0]?.value).resolves.toEqual({
        accepted: 50,
      }),
    );
    expect(makeRequest).toHaveBeenCalledOnce();
  });

  it("keeps every request below the server batch limit", async () => {
    const { events, makeRequest } = createEvents();

    for (let index = 0; index < 51; index++) events.track(event(index));

    const sent = () =>
      makeRequest.mock.calls.reduce(
        (count, [, options]) => count + options.body.events.length,
        0,
      );
    await vi.waitFor(() => expect(sent()).toBe(51));
    for (const [, options] of makeRequest.mock.calls) {
      expect(options.body.events.length).toBeLessThanOrEqual(50);
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "drops props containing the non-finite number %s",
    async (value) => {
      const { events, makeRequest } = createEvents();

      events.track({ kind: "message_sent", props: { value } });
      events.dispose();

      await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
      expect(makeRequest).toHaveBeenCalledWith("/events", {
        method: "POST",
        body: { events: [{ kind: "message_sent" }] },
        keepalive: true,
      });
    },
  );

  it("keeps finite numeric props", async () => {
    const { events, makeRequest } = createEvents();

    events.track({
      kind: "message_sent",
      props: { negative: -1.5, zero: 0, positive: 2.5 },
    });
    events.dispose();

    await vi.waitFor(() => expect(makeRequest).toHaveBeenCalledOnce());
    expect(makeRequest).toHaveBeenCalledWith("/events", {
      method: "POST",
      body: {
        events: [
          {
            kind: "message_sent",
            props: { negative: -1.5, zero: 0, positive: 2.5 },
          },
        ],
      },
      keepalive: true,
    });
  });
});
