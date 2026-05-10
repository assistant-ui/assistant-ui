// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAssistantSuggestion } from "../index";

const addMock = vi.fn<(input: unknown) => () => void>();
const unsubscribeMock = vi.fn();
const stableAui = {
  suggestions: () => ({ add: addMock }),
};

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => stableAui,
  };
});

afterEach(() => {
  cleanup();
  addMock.mockReset();
  unsubscribeMock.mockReset();
});

describe("useAssistantSuggestion", () => {
  it("registers once on mount with an object literal", () => {
    addMock.mockImplementation(() => unsubscribeMock);

    renderHook(() =>
      useAssistantSuggestion({
        title: "Summarize",
        label: "case",
        prompt: "Summarize this case",
      }),
    );

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith({
      title: "Summarize",
      label: "case",
      prompt: "Summarize this case",
    });
  });

  it("does not re-register when caller passes a new object literal with identical fields", () => {
    addMock.mockImplementation(() => unsubscribeMock);

    const { rerender } = renderHook(
      ({ s }: { s: { title: string; label: string; prompt: string } }) =>
        useAssistantSuggestion(s),
      {
        initialProps: {
          s: { title: "a", label: "b", prompt: "c" },
        },
      },
    );

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).not.toHaveBeenCalled();

    rerender({ s: { title: "a", label: "b", prompt: "c" } });
    rerender({ s: { title: "a", label: "b", prompt: "c" } });

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).not.toHaveBeenCalled();
  });

  it("re-registers when any field changes", () => {
    addMock.mockImplementation(() => unsubscribeMock);

    const { rerender } = renderHook(
      ({ s }: { s: { title: string; label: string; prompt: string } }) =>
        useAssistantSuggestion(s),
      {
        initialProps: { s: { title: "a", label: "b", prompt: "c" } },
      },
    );

    rerender({ s: { title: "a2", label: "b", prompt: "c" } });

    expect(addMock).toHaveBeenCalledTimes(2);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes on unmount", () => {
    addMock.mockImplementation(() => unsubscribeMock);

    const { unmount } = renderHook(() =>
      useAssistantSuggestion({ title: "x", label: "y", prompt: "z" }),
    );

    expect(unsubscribeMock).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes string input to title/prompt with empty label", () => {
    addMock.mockImplementation(() => unsubscribeMock);

    renderHook(() => useAssistantSuggestion("Just a string"));

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith({
      title: "Just a string",
      label: "",
      prompt: "Just a string",
    });
  });

  it("does not re-register when string input keeps same value across renders", () => {
    addMock.mockImplementation(() => unsubscribeMock);

    const { rerender } = renderHook(
      ({ s }: { s: string }) => useAssistantSuggestion(s),
      { initialProps: { s: "hello" } },
    );

    rerender({ s: "hello" });
    rerender({ s: "hello" });

    expect(addMock).toHaveBeenCalledTimes(1);
  });
});
