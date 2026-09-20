import { describe, expect, it } from "vitest";
import { useState } from "react";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { createAssistantClient } from "../createAssistantClient";
import type { AssistantClient } from "../types/client";
import {
  getProxiedAssistantState,
  withBatchedStateReads,
} from "./proxied-assistant-state";

type ThreadState = { version: number };
type ThreadMethods = { getState(): ThreadState; bump(): void };

const createCountingClient = () => {
  const counter = { reads: 0 };
  const useThreadClient = (): ThreadMethods => {
    const [version, setVersion] = useState(0);
    return {
      getState: () => {
        counter.reads += 1;
        return { version };
      },
      bump: () => setVersion((v) => v + 1),
    };
  };
  const ThreadClient = resource(useThreadClient);

  const handle = createAssistantClient({
    thread: ThreadClient(),
  } as never) as {
    getClient(): AssistantClient;
    subscribe(listener: () => void): () => void;
    destroy(): void;
  };
  handle.subscribe(() => {});
  const client = handle.getClient();

  return {
    counter,
    state: getProxiedAssistantState(client) as unknown as {
      thread: ThreadState;
    },
    bump: () => (client.thread as unknown as ThreadMethods).bump(),
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

  it("serves the state written inside a window once the window closes", () => {
    const { state, bump, destroy } = createCountingClient();

    expect(state.thread.version).toBe(0);
    withBatchedStateReads(() => {
      void state.thread;
      flushTapSync(() => bump());
    });
    expect(state.thread.version).toBe(1);

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
