import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren, ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ThreadFollowupSuggestions } from "./follow-up-suggestions";

type FakeSuggestion = { title?: string; label?: string; prompt: string };

const mocks = vi.hoisted(() => ({
  state: {
    thread: {
      isEmpty: false,
      isRunning: false,
      suggestions: [] as { title?: string; label?: string; prompt: string }[],
    },
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAuiState: (selector: (s: typeof mocks.state) => unknown) =>
    selector(mocks.state),
  AuiIf: ({
    condition,
    children,
  }: PropsWithChildren<{ condition: (s: typeof mocks.state) => boolean }>) =>
    condition(mocks.state) ? children : null,
  ThreadPrimitive: {
    Suggestion: ({
      prompt,
      method,
      autoSend,
      children,
    }: {
      prompt: string;
      method: string;
      autoSend: boolean;
      children: ReactNode;
    }) => (
      <button
        data-testid="suggestion"
        data-prompt={prompt}
        data-method={method}
        data-autosend={String(autoSend)}
      >
        {children}
      </button>
    ),
  },
}));

const renderWith = (suggestions: FakeSuggestion[]) => {
  mocks.state.thread.suggestions = suggestions;
  render(<ThreadFollowupSuggestions />);
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

describe("ThreadFollowupSuggestions", () => {
  it("shows title and label while still sending the full prompt", () => {
    renderWith([
      {
        title: "Weather",
        label: "in SF",
        prompt: "What is the weather in San Francisco today?",
      },
    ]);

    const pill = screen.getByTestId("suggestion");
    expect(pill.textContent).toBe("Weatherin SF");
    expect(pill.textContent).not.toContain("San Francisco");
    expect(pill.getAttribute("data-prompt")).toBe(
      "What is the weather in San Francisco today?",
    );
    expect(pill.getAttribute("data-method")).toBe("replace");
    expect(pill.getAttribute("data-autosend")).toBe("true");
    expect(
      pill.querySelector(".aui-thread-followup-suggestion-label")?.textContent,
    ).toBe("in SF");
  });

  it("falls back to the prompt when no title is given", () => {
    renderWith([{ prompt: "Summarize this" }]);

    const pill = screen.getByTestId("suggestion");
    expect(pill.textContent).toBe("Summarize this");
    expect(pill.getAttribute("data-prompt")).toBe("Summarize this");
  });

  it("omits the label span when label is absent or empty", () => {
    renderWith([
      { title: "Recap", prompt: "Recap the thread" },
      { title: "Next", label: "", prompt: "What is next?" },
    ]);

    const pills = screen.getAllByTestId("suggestion");
    expect(pills).toHaveLength(2);
    for (const pill of pills) {
      expect(
        pill.querySelector(".aui-thread-followup-suggestion-label"),
      ).toBeNull();
    }
    expect(pills[0]?.textContent).toBe("Recap");
    expect(pills[1]?.textContent).toBe("Next");
  });
});
