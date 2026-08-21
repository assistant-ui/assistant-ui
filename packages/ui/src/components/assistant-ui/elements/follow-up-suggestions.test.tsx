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
      { label: "", prompt: "Summarize this" },
    ]);

    const [rich, plain] = screen.getAllByTestId("suggestion");
    expect(rich?.textContent).toBe("Weatherin SF");
    expect(rich?.getAttribute("data-prompt")).toBe(
      "What is the weather in San Francisco today?",
    );
    expect(rich?.getAttribute("data-method")).toBe("replace");
    expect(rich?.getAttribute("data-autosend")).toBe("true");
    expect(
      rich?.querySelector(".aui-thread-followup-suggestion-label")?.textContent,
    ).toBe("in SF");

    expect(plain?.textContent).toBe("Summarize this");
    expect(
      plain?.querySelector(".aui-thread-followup-suggestion-label"),
    ).toBeNull();
  });
});
