/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import type * as CoreReact from "@assistant-ui/core/react";
import type * as AssistantStore from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionBarPrimitiveFeedbackNegative } from "./ActionBarFeedbackNegative";
import { ActionBarPrimitiveFeedbackPositive } from "./ActionBarFeedbackPositive";

const { storeState } = vi.hoisted(() => ({
  storeState: {
    message: {
      metadata: {
        submittedFeedback: undefined as
          | { type: "positive" | "negative" }
          | undefined,
      },
    },
  },
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreReact>();
  return {
    ...actual,
    useActionBarFeedbackPositive: () => ({ submit: vi.fn() }),
    useActionBarFeedbackNegative: () => ({ submit: vi.fn() }),
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof AssistantStore>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (state: typeof storeState) => T) =>
      selector(storeState),
  };
});

afterEach(() => {
  storeState.message.metadata.submittedFeedback = undefined;
});

describe("ActionBar feedback primitives", () => {
  it.each([
    [undefined, "false", "false"],
    [{ type: "positive" as const }, "true", "false"],
    [{ type: "negative" as const }, "false", "true"],
  ])(
    "exposes the submitted state for %s",
    (submittedFeedback, positivePressed, negativePressed) => {
      storeState.message.metadata.submittedFeedback = submittedFeedback;

      const { container } = render(
        <>
          <ActionBarPrimitiveFeedbackPositive aria-label="Helpful" />
          <ActionBarPrimitiveFeedbackNegative aria-label="Not helpful" />
        </>,
      );

      const [positive, negative] = Array.from(
        container.querySelectorAll("button"),
      );
      expect(positive?.getAttribute("aria-pressed")).toBe(positivePressed);
      expect(negative?.getAttribute("aria-pressed")).toBe(negativePressed);
      expect(positive?.hasAttribute("data-submitted")).toBe(
        positivePressed === "true",
      );
      expect(negative?.hasAttribute("data-submitted")).toBe(
        negativePressed === "true",
      );
    },
  );

  it("forwards the submitted state through asChild", () => {
    storeState.message.metadata.submittedFeedback = { type: "positive" };

    const { container } = render(
      <ActionBarPrimitiveFeedbackPositive asChild>
        <button type="button">Helpful</button>
      </ActionBarPrimitiveFeedbackPositive>,
    );

    expect(
      container.querySelector("button")?.getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
