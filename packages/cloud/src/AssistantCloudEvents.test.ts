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

const createEvents = (enabled = true) => {
  const makeRequest = vi.fn().mockResolvedValue({ accepted: 1 });
  const events = new AssistantCloudEvents(
    { makeRequest } as unknown as AssistantCloudAPI,
    () => enabled,
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
