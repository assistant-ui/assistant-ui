/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SuggestionState } from "../../../store/scopes/suggestion";

const mocks = vi.hoisted(() => ({
  suggestions: [] as SuggestionState[],
  aui: {
    suggestions: {
      suggestion: ({ index }: { index: number }) => ({
        getState: () => mocks.suggestions[index],
      }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ suggestions: { suggestions: mocks.suggestions } }),
  RenderChildrenWithAccessor: ({
    getItemState,
    children,
  }: {
    getItemState: (aui: typeof mocks.aui) => SuggestionState;
    children: (getItem: () => SuggestionState) => ReactNode;
  }) => children(() => getItemState(mocks.aui)),
}));

vi.mock("../../providers/SuggestionByIndexProvider", () => ({
  SuggestionByIndexProvider: ({ children }: { children: ReactNode }) =>
    children,
}));

import { ThreadPrimitiveSuggestions } from "./ThreadSuggestions";

const suggestion = (prompt: string): SuggestionState => ({
  title: prompt,
  label: prompt,
  prompt,
});

const StatefulSuggestion = ({
  suggestion,
}: {
  suggestion: SuggestionState;
}) => {
  const [initialPrompt] = useState(suggestion.prompt);
  return <span>{initialPrompt}</span>;
};

const renderSuggestions = () => (
  <ThreadPrimitiveSuggestions>
    {({ suggestion }) => <StatefulSuggestion suggestion={suggestion} />}
  </ThreadPrimitiveSuggestions>
);

describe("ThreadPrimitiveSuggestions", () => {
  it("does not reuse component state for a different suggestion", () => {
    mocks.suggestions = [suggestion("first prompt"), suggestion("second")];

    const view = render(renderSuggestions());

    mocks.suggestions = [mocks.suggestions[1]!];
    view.rerender(renderSuggestions());

    expect(screen.queryByText("second")).not.toBeNull();
    expect(screen.queryByText("first prompt")).toBeNull();
  });

  it("keeps a surviving suggestion's state when an earlier one is removed", () => {
    mocks.suggestions = [
      suggestion("alpha"),
      suggestion("beta"),
      suggestion("gamma"),
    ];

    const view = render(renderSuggestions());

    mocks.suggestions = [mocks.suggestions[0]!, mocks.suggestions[2]!];
    view.rerender(renderSuggestions());

    expect(screen.queryByText("alpha")).not.toBeNull();
    expect(screen.queryByText("gamma")).not.toBeNull();
    expect(screen.queryByText("beta")).toBeNull();
  });

  it("renders suggestions that share a prompt under distinct keys", () => {
    mocks.suggestions = [suggestion("same"), suggestion("same")];

    render(renderSuggestions());

    expect(screen.queryAllByText("same")).toHaveLength(2);
  });
});
