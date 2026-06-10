// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { useOpenCodeControllerState } from "./useOpenCodeControllerState";
import type { OpenCodeServerEvent, OpenCodeThreadState } from "./types";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const createEventSource = () => {
  let listener: ((event: OpenCodeServerEvent) => void) | undefined;
  const unsubscribe = vi.fn();

  return {
    emit(event: OpenCodeServerEvent) {
      listener?.(event);
    },
    subscribe: vi.fn((nextListener: (event: OpenCodeServerEvent) => void) => {
      listener = nextListener;
      return unsubscribe;
    }),
    unsubscribe,
  };
};

const sessionUpdated = (title: string): OpenCodeServerEvent => ({
  type: "session.updated",
  sessionId: "ses_1",
  properties: {
    info: {
      id: "ses_1",
      title,
      time: {},
    },
  },
  raw: {},
});

describe("useOpenCodeControllerState", () => {
  let root: Root | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
  });

  it("keeps the event subscription across event-driven re-renders", () => {
    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      {} as never,
      () => eventSource,
      "ses_1",
    );

    const snapshots: OpenCodeThreadState[] = [];
    const Probe = () => {
      snapshots.push(useOpenCodeControllerState(controller));
      return null;
    };

    act(() => {
      root = createRoot(document.createElement("div"));
      root.render(<Probe />);
    });

    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);

    act(() => {
      eventSource.emit(sessionUpdated("First response"));
    });

    expect(snapshots.length).toBeGreaterThan(1);
    expect(snapshots.at(-1)?.session).toMatchObject({
      id: "ses_1",
      title: "First response",
    });
    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);
    expect(eventSource.unsubscribe).not.toHaveBeenCalled();

    act(() => {
      root?.unmount();
    });
    root = undefined;

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("stays attached to events after a StrictMode double mount", () => {
    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      {} as never,
      () => eventSource,
      "ses_1",
    );

    const snapshots: OpenCodeThreadState[] = [];
    const Probe = () => {
      snapshots.push(useOpenCodeControllerState(controller));
      return null;
    };

    act(() => {
      root = createRoot(document.createElement("div"));
      root.render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      );
    });

    expect(eventSource.subscribe.mock.calls.length).toBe(
      eventSource.unsubscribe.mock.calls.length + 1,
    );

    const subscribesAfterMount = eventSource.subscribe.mock.calls.length;

    act(() => {
      eventSource.emit(sessionUpdated("Recovered"));
    });

    expect(snapshots.at(-1)?.session).toMatchObject({
      id: "ses_1",
      title: "Recovered",
    });
    expect(eventSource.subscribe.mock.calls.length).toBe(subscribesAfterMount);
  });
});
