import { describe, it, expect } from "vitest";
import { createTapRoot, useResource } from "@assistant-ui/tap";
import {
  Suggestions,
  ThreadSuggestions,
  type SuggestionConfig,
} from "./suggestions";
import type { ThreadSuggestion } from "../../runtime/interfaces/thread-runtime-core";

const render = (suggestions?: SuggestionConfig[]) => {
  const root = createTapRoot(function Root() {
    return useResource(Suggestions(suggestions));
  });
  return { sub: root, unmount: () => root.unmount() };
};

const renderThread = (suggestions: readonly ThreadSuggestion[]) => {
  const root = createTapRoot(function ThreadRoot() {
    return useResource(ThreadSuggestions(suggestions));
  });
  return { sub: root, unmount: () => root.unmount() };
};

describe("Suggestions", () => {
  it("normalizes string configs to title/label/prompt", () => {
    const { sub, unmount } = render(["hello"]);
    try {
      expect(sub.getValue().getState().suggestions).toEqual([
        { title: "hello", label: "", prompt: "hello" },
      ]);
    } finally {
      unmount();
    }
  });

  it("preserves explicit title and label", () => {
    const { sub, unmount } = render([
      { title: "Weather", label: "in SF", prompt: "What's the weather?" },
    ]);
    try {
      expect(sub.getValue().getState().suggestions).toEqual([
        { title: "Weather", label: "in SF", prompt: "What's the weather?" },
      ]);
    } finally {
      unmount();
    }
  });

  it("exposes each suggestion through the suggestion accessor", () => {
    const { sub, unmount } = render([
      { title: "One", label: "first", prompt: "One" },
      "Two",
    ]);
    try {
      const client = sub.getValue();
      expect(client.suggestion({ index: 0 }).getState()).toEqual({
        title: "One",
        label: "first",
        prompt: "One",
      });
      expect(client.suggestion({ index: 1 }).getState()).toEqual({
        title: "Two",
        label: "",
        prompt: "Two",
      });
    } finally {
      unmount();
    }
  });
});

describe("ThreadSuggestions", () => {
  it("carries title and label from the runtime suggestion", () => {
    const { sub, unmount } = renderThread([
      { title: "Weather", label: "in SF", prompt: "What's the weather?" },
    ]);
    try {
      expect(sub.getValue().getState().suggestions).toEqual([
        { title: "Weather", label: "in SF", prompt: "What's the weather?" },
      ]);
    } finally {
      unmount();
    }
  });

  it("defaults title to prompt and label to empty when absent", () => {
    const { sub, unmount } = renderThread([{ prompt: "Summarize this" }]);
    try {
      expect(sub.getValue().getState().suggestions).toEqual([
        { title: "Summarize this", label: "", prompt: "Summarize this" },
      ]);
    } finally {
      unmount();
    }
  });
});
