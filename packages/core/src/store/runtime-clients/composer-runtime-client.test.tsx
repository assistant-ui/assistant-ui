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
