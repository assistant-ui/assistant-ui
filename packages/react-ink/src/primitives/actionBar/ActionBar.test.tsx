import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "ink";
import { cleanup } from "ink-testing-library";
import { renderFrame } from "../../tests/helpers";
import { ActionBarCopy } from "./ActionBarCopy";
import { ActionBarFeedbackNegative } from "./ActionBarFeedbackNegative";
import { ActionBarFeedbackPositive } from "./ActionBarFeedbackPositive";

const h = vi.hoisted(() => ({
  copy: vi.fn<() => void>(),
  feedbackNegative: vi.fn<() => void>(),
  feedbackPositive: vi.fn<() => void>(),
  renderState: null as unknown,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useActionBarCopy: () => ({
      copy: h.copy,
      disabled: false,
      isCopied: false,
    }),
    useActionBarFeedbackNegative: () => ({
      submit: h.feedbackNegative,
      isSubmitted: false,
    }),
    useActionBarFeedbackPositive: () => ({
      submit: h.feedbackPositive,
      isSubmitted: false,
    }),
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: vi.fn(),
  };
});

beforeEach(() => {
  h.renderState = null;
});

afterEach(() => {
  cleanup();
});

describe("ActionBar render children", () => {
  const assertRenderState = async <TState extends object>(
    render: (children: (state: TState) => ReactNode) => ReactElement,
    expectedState: TState,
  ) => {
    const frame = await renderFrame(
      render((state) => {
        h.renderState = state;
        return <Text>label</Text>;
      }),
    );

    expect(frame).toContain("label");
    expect(h.renderState).toMatchObject(expectedState);
  };

  it("ActionBarCopy passes Pressable state alongside isCopied", async () => {
    await assertRenderState(
      (children) => <ActionBarCopy>{children}</ActionBarCopy>,
      { isFocused: true, disabled: false, isCopied: false },
    );
  });

  it("ActionBarFeedbackPositive passes Pressable state alongside isSubmitted", async () => {
    await assertRenderState(
      (children) => (
        <ActionBarFeedbackPositive>{children}</ActionBarFeedbackPositive>
      ),
      { isFocused: true, disabled: false, isSubmitted: false },
    );
  });

  it("ActionBarFeedbackNegative passes Pressable state alongside isSubmitted", async () => {
    await assertRenderState(
      (children) => (
        <ActionBarFeedbackNegative>{children}</ActionBarFeedbackNegative>
      ),
      { isFocused: true, disabled: false, isSubmitted: false },
    );
  });

  it("still renders plain children", async () => {
    const frame = await renderFrame(
      <>
        <ActionBarCopy>
          <Text>copy</Text>
        </ActionBarCopy>
        <ActionBarFeedbackPositive>
          <Text>positive</Text>
        </ActionBarFeedbackPositive>
        <ActionBarFeedbackNegative>
          <Text>negative</Text>
        </ActionBarFeedbackNegative>
      </>,
    );

    expect(frame).toContain("copy");
    expect(frame).toContain("positive");
    expect(frame).toContain("negative");
  });
});
