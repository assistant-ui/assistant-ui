// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { useAui, useAuiState } from "@assistant-ui/store";
import { AuiProvider } from "@assistant-ui/store";
import type { AssistantClient } from "@assistant-ui/store";
import type { ComposerState } from "../scopes/composer";
import { AssistantRuntimeProvider } from "../../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../../react/runtimes/useExternalStoreRuntime";
import { ExternalThread, InMemoryThreadList } from "../../store";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import { createMessageQueue } from "../../runtime/queue/message-queue";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import type { ThreadMessage } from "../../types/message";

it("reads composer text synchronously and returns the committed state after render", () => {
  let aui!: AssistantClient;
  const rendered: ComposerState[] = [];
  const Reader = () => {
    aui = useAui();
    rendered.push(useAuiState((state) => state.composer));
    return null;
  };
  const App = () => {
    const runtime = useExternalStoreRuntime({
      messages: [] as ThreadMessage[],
      convertMessage: (message) => message,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Reader />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);

  act(() => {
    aui.composer.setText("x");
    expect(aui.composer.getState().text).toBe("x");
    expect(aui.composer.getState()).toBe(aui.composer.getState());
  });

  expect(rendered.at(-1)?.text).toBe("x");
  expect(aui.composer.getState()).toBe(rendered.at(-1));
});

it.each(["reorder", "enqueue"] as const)(
  "keeps queue state and item lookups aligned before a synchronous %s commits",
  (operation) => {
    const queue = createMessageQueue({ run: () => {} });
    queue.hold();
    const enqueue = (text: string) =>
      queue.adapter.enqueue({
        parentId: null,
        sourceId: null,
        role: "user",
        content: [{ type: "text", text }],
        attachments: [],
        createdAt: new Date(0),
        metadata: { custom: {} },
        runConfig: {},
      });
    enqueue("first");
    enqueue("second");

    const store = {
      messages: [] as ThreadMessage[],
      onNew: async () => {},
      queue: queue.adapter,
    };
    const core = new ExternalStoreRuntimeCore(store);
    const runtime = new AssistantRuntimeImpl(core);
    const unsubscribe = queue.subscribe(() => core.setAdapter({ ...store }));
    let aui!: AssistantClient;
    const rendered: ComposerState[] = [];
    const Reader = () => {
      aui = useAui();
      rendered.push(useAuiState((state) => state.composer));
      return null;
    };
    render(
      <AssistantRuntimeProvider runtime={runtime}>
        <Reader />
      </AssistantRuntimeProvider>,
    );
    const committed = aui.composer.getState();

    act(() => {
      if (operation === "reorder") {
        aui.composer.queueItem({ index: 1 }).move({ insertAfter: null });
        expect(runtime.thread.composer.getState().queue).toEqual([
          committed.queue[1],
          committed.queue[0],
        ]);
      } else {
        enqueue("third");
        expect(runtime.thread.composer.getState().queue).toHaveLength(3);
      }

      const state = aui.composer.getState();
      expect(rendered.at(-1)).toBe(committed);
      state.queue.forEach((item, index) => {
        expect(aui.composer.queueItem({ index }).getState()).toBe(item);
        expect(aui.composer.queueItem({ id: item.id }).getState()).toBe(item);
      });
      expect(state.queue).toBe(committed.queue);
    });

    const state = aui.composer.getState();
    expect(state).toBe(rendered.at(-1));
    expect(state.queue).toBe(queue.adapter.items);
    state.queue.forEach((item, index) => {
      expect(aui.composer.queueItem({ index }).getState()).toBe(item);
      expect(aui.composer.queueItem({ id: item.id }).getState()).toBe(item);
    });
    unsubscribe();
  },
);

it("survives a thread switch while composing", () => {
  let aui!: AssistantClient;
  const Reader = () => {
    aui = useAui();
    useAuiState((state) => state.composer.text);
    return null;
  };
  const App = () => {
    const client = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [] }),
      }),
    });
    return (
      <AuiProvider value={client}>
        <Reader />
      </AuiProvider>
    );
  };
  render(<App />);

  act(() => {
    flushTapSync(() => aui.composer.setText("draft"));
  });
  expect(aui.composer.getState().text).toBe("draft");

  act(() => {
    flushTapSync(() => aui.threads.switchToNewThread());
  });
  expect(aui.composer.getState().text).toBe("");
});

afterEach(cleanup);
