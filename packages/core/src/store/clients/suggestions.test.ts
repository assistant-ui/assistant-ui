import { useState } from "react";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import type { ThreadSuggestion } from "../../runtime/interfaces/thread-runtime-core";
import {
  Suggestions,
  ThreadSuggestions,
  type SuggestionConfig,
} from "./suggestions";

describe("Suggestions", () => {
  it("keeps equal inline string suggestions stable across owner renders", () => {
    let rerender!: () => void;
    const root = createTapRoot(function SuggestionsRoot() {
      const [, setTick] = useState(0);
      rerender = () => setTick((tick) => tick + 1);
      return useResource(Suggestions(["account-a", "account-b"]));
    });

    try {
      const firstState = root.getValue().getState();
      const firstSuggestion = root
        .getValue()
        .suggestion({ index: 0 })
        .getState();

      flushTapSync(rerender);

      expect(root.getValue().getState()).toBe(firstState);
      expect(root.getValue().suggestion({ index: 0 }).getState()).toBe(
        firstSuggestion,
      );
    } finally {
      root.unmount();
    }
  });

  it("keeps equal inline object suggestions stable across owner renders", () => {
    let rerender!: () => void;
    const root = createTapRoot(function SuggestionsRoot() {
      const [, setTick] = useState(0);
      rerender = () => setTick((tick) => tick + 1);
      return useResource(
        Suggestions([{ title: "Title", label: "Label", prompt: "Prompt" }]),
      );
    });

    try {
      const firstState = root.getValue().getState();
      const firstSuggestion = root
        .getValue()
        .suggestion({ index: 0 })
        .getState();

      flushTapSync(rerender);

      expect(root.getValue().getState()).toBe(firstState);
      expect(root.getValue().suggestion({ index: 0 }).getState()).toBe(
        firstSuggestion,
      );
    } finally {
      root.unmount();
    }
  });

  it("updates when the configured suggestions change", () => {
    let setSuggestions!: (suggestions: SuggestionConfig[]) => void;
    const root = createTapRoot(function SuggestionsRoot() {
      const [suggestions, setValue] = useState<SuggestionConfig[]>([
        "account-a",
      ]);
      setSuggestions = setValue;
      return useResource(Suggestions(suggestions));
    });

    try {
      expect(root.getValue().getState().suggestions[0]?.prompt).toBe(
        "account-a",
      );

      flushTapSync(() => setSuggestions(["account-b"]));

      expect(root.getValue().getState().suggestions[0]?.prompt).toBe(
        "account-b",
      );
    } finally {
      root.unmount();
    }
  });

  it("reuses unchanged suggestion state when one entry changes", () => {
    let setSuggestions!: (suggestions: SuggestionConfig[]) => void;
    const root = createTapRoot(function SuggestionsRoot() {
      const [suggestions, setValue] = useState<SuggestionConfig[]>([
        { title: "Title A", label: "Label A", prompt: "Prompt A" },
        { title: "Title B", label: "Label B", prompt: "Prompt B" },
      ]);
      setSuggestions = setValue;
      return useResource(Suggestions(suggestions));
    });

    try {
      const firstState = root.getValue().getState();
      const unchangedSuggestion = root
        .getValue()
        .suggestion({ index: 1 })
        .getState();

      flushTapSync(() =>
        setSuggestions([
          { title: "Changed", label: "Label A", prompt: "Prompt A" },
          { title: "Title B", label: "Label B", prompt: "Prompt B" },
        ]),
      );

      expect(root.getValue().getState()).not.toBe(firstState);
      expect(root.getValue().getState().suggestions[0]?.title).toBe("Changed");
      expect(root.getValue().suggestion({ index: 1 }).getState()).toBe(
        unchangedSuggestion,
      );
    } finally {
      root.unmount();
    }
  });
});

describe("ThreadSuggestions", () => {
  it("keeps equal runtime suggestions stable across owner renders", () => {
    let rerender!: () => void;
    const root = createTapRoot(function ThreadSuggestionsRoot() {
      const [, setTick] = useState(0);
      rerender = () => setTick((tick) => tick + 1);
      return useResource(ThreadSuggestions([{ prompt: "Prompt" }]));
    });

    try {
      const firstState = root.getValue().getState();
      const firstSuggestion = root
        .getValue()
        .suggestion({ index: 0 })
        .getState();

      flushTapSync(rerender);

      expect(root.getValue().getState()).toBe(firstState);
      expect(root.getValue().suggestion({ index: 0 }).getState()).toBe(
        firstSuggestion,
      );
    } finally {
      root.unmount();
    }
  });

  it("reuses unchanged suggestion state when one entry changes", () => {
    let setSuggestions!: (suggestions: ThreadSuggestion[]) => void;
    const root = createTapRoot(function ThreadSuggestionsRoot() {
      const [suggestions, setValue] = useState<ThreadSuggestion[]>([
        { prompt: "Prompt A" },
        { prompt: "Prompt B" },
      ]);
      setSuggestions = setValue;
      return useResource(ThreadSuggestions(suggestions));
    });

    try {
      const firstState = root.getValue().getState();
      const unchangedSuggestion = root
        .getValue()
        .suggestion({ index: 1 })
        .getState();

      flushTapSync(() =>
        setSuggestions([{ prompt: "Changed" }, { prompt: "Prompt B" }]),
      );

      expect(root.getValue().getState()).not.toBe(firstState);
      expect(root.getValue().getState().suggestions[0]?.prompt).toBe("Changed");
      expect(root.getValue().suggestion({ index: 1 }).getState()).toBe(
        unchangedSuggestion,
      );
    } finally {
      root.unmount();
    }
  });
});
