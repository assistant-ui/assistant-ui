// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantCloudEvents,
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
});
