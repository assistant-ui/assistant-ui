import { describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { createAssistantClient } from "../createAssistantClient";
import type { AssistantClient } from "../types/client";
import {
  getProxiedAssistantState,
  withBatchedStateReads,
} from "./proxied-assistant-state";

const createCountingClient = () => {
  const counter = { reads: 0 };
  const useThreadClient = () => ({
    getState: () => {
      counter.reads += 1;
      return { ready: true };
    },
  });
  const ThreadClient = resource(useThreadClient);

  const handle = createAssistantClient({
    thread: ThreadClient(),
  } as never) as { getClient(): AssistantClient; destroy(): void };

  return {
    counter,
    state: getProxiedAssistantState(handle.getClient()),
    destroy: () => handle.destroy(),
  };
};

describe("batched state reads", () => {
  it("resolves a scope once inside a window and again in the next one", () => {
    const { counter, state, destroy } = createCountingClient();

    counter.reads = 0;
    withBatchedStateReads(() => {
      void state.thread;
      void state.thread;
      void state.thread;
    });
    expect(counter.reads).toBe(1);

    withBatchedStateReads(() => {
      void state.thread;
    });
    expect(counter.reads).toBe(2);

    destroy();
  });

  it("resolves every read outside a window", () => {
    const { counter, state, destroy } = createCountingClient();

    counter.reads = 0;
    void state.thread;
    void state.thread;
    void state.thread;
    expect(counter.reads).toBe(3);

    destroy();
  });

  it("re-resolves after a nested window closes", () => {
    const { counter, state, destroy } = createCountingClient();

    counter.reads = 0;
    withBatchedStateReads(() => {
      void state.thread;
      withBatchedStateReads(() => {
        void state.thread;
      });
      void state.thread;
    });
    expect(counter.reads).toBe(3);

    destroy();
  });
});
