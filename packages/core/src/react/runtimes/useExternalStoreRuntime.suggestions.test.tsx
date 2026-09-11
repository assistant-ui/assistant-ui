// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AuiConfig,
  useAui,
  useAuiState,
  type AssistantClient,
} from "@assistant-ui/store";
import type { ThreadSuggestion } from "../../runtime/interfaces/thread-runtime-core";
import { Suggestions } from "../../store/clients/suggestions";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

let aui!: AssistantClient;
let scopeSuggestions!: readonly { prompt: string }[];

const Consumer = () => {
  aui = useAui();
  scopeSuggestions = useAuiState((s) => s.suggestions.suggestions);
  return null;
};

const App = ({
  suggestions,
  config,
  strict,
}: {
  suggestions?: ThreadSuggestion[];
  config?: AuiConfig;
  strict?: boolean;
}) => {
  const runtime = useExternalStoreRuntime({
    messages: [],
    onNew: async () => {},
    ...(suggestions && { suggestions }),
  });
  const tree = (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Consumer />
    </AssistantRuntimeProvider>
  );
  return strict ? <StrictMode>{tree}</StrictMode> : tree;
};

afterEach(() => {
  cleanup();
});

describe("useExternalStoreRuntime suggestions scope", () => {
  it("exposes runtime suggestions on the suggestions scope", () => {
    render(
      <App
        suggestions={[
          { title: "Weather", label: "in SF", prompt: "What's the weather?" },
          { prompt: "Help" },
        ]}
      />,
    );

    expect(scopeSuggestions).toEqual([
      { title: "Weather", label: "in SF", prompt: "What's the weather?" },
      { title: "Help", label: "", prompt: "Help" },
    ]);
    expect(aui.suggestions.suggestion({ index: 0 }).getState()).toEqual({
      title: "Weather",
      label: "in SF",
      prompt: "What's the weather?",
    });
    expect(aui.suggestions.suggestion({ index: 1 }).getState()).toEqual({
      title: "Help",
      label: "",
      prompt: "Help",
    });
    expect(aui.thread.getState().suggestions).toEqual([
      { title: "Weather", label: "in SF", prompt: "What's the weather?" },
      { prompt: "Help" },
    ]);
  });

  it("exposes runtime suggestions under StrictMode", () => {
    render(<App strict suggestions={[{ prompt: "Tell me a joke" }]} />);

    expect(scopeSuggestions).toEqual([
      { title: "Tell me a joke", label: "", prompt: "Tell me a joke" },
    ]);
  });

  it("reports an empty scope without runtime suggestions", () => {
    render(<App />);

    expect(scopeSuggestions).toEqual([]);
  });

  it("follows runtime suggestion updates", async () => {
    const view = render(<App suggestions={[{ prompt: "First" }]} />);
    expect(scopeSuggestions).toEqual([
      { title: "First", label: "", prompt: "First" },
    ]);

    view.rerender(<App suggestions={[{ prompt: "Second" }]} />);
    await waitFor(() => {
      expect(scopeSuggestions).toEqual([
        { title: "Second", label: "", prompt: "Second" },
      ]);
    });
  });

  it("prefers config-provided suggestions over runtime suggestions", () => {
    render(
      <App
        suggestions={[{ prompt: "Runtime" }]}
        config={AuiConfig({ suggestions: Suggestions(["Static"]) })}
      />,
    );

    expect(scopeSuggestions).toEqual([
      { title: "Static", label: "", prompt: "Static" },
    ]);
    expect(aui.thread.getState().suggestions).toEqual([{ prompt: "Runtime" }]);
  });
});
