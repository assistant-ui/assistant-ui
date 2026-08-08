// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import type { FeedbackAdapter } from "@assistant-ui/core";
import type {
  ExternalThreadMessage,
  ExternalThreadProps,
} from "../client/ExternalThread";
import { ExternalThread } from "../client/ExternalThread";

const MESSAGES = [
  {
    id: "u1",
    role: "user",
    content: [{ type: "text", text: "hi" }],
    createdAt: new Date(0),
    attachments: [],
    metadata: { custom: {} },
  },
  {
    id: "a1",
    role: "assistant",
    content: [{ type: "text", text: "hello there" }],
    createdAt: new Date(0),
    metadata: { custom: {} },
  },
] as unknown as readonly ExternalThreadMessage[];

const createFakeAdapter = () => {
  const submit = vi.fn();
  const adapter: FeedbackAdapter = { submit };
  return { adapter, submit };
};

const renderThreadWithProps = (props: Partial<ExternalThreadProps>) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ props: Partial<ExternalThreadProps> }> = ({ props }) => {
    const aui = useAui({
      thread: ExternalThread({
        messages: MESSAGES,
        isRunning: false,
        ...props,
      }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };

  const view = render(<App props={props} />);
  return {
    aui: () => captured.aui!,
    rerender: (nextProps: Partial<ExternalThreadProps>) =>
      view.rerender(<App props={nextProps} />),
  };
};

describe("ExternalThread feedback", () => {
  it("reports the feedback capability based on adapter presence", () => {
    const { aui: withoutAdapter } = renderThreadWithProps({});
    expect(withoutAdapter().thread.getState().capabilities.feedback).toBe(
      false,
    );

    const { adapter } = createFakeAdapter();
    const { aui: withAdapter } = renderThreadWithProps({
      feedbackAdapter: adapter,
    });
    expect(withAdapter().thread.getState().capabilities.feedback).toBe(true);
  });

  it("throws on submitFeedback when no adapter is configured", () => {
    const { aui } = renderThreadWithProps({});
    expect(() =>
      aui().thread.message({ id: "a1" }).submitFeedback({ type: "positive" }),
    ).toThrow("Feedback adapter not configured");
  });

  it("submits feedback to the adapter and marks the assistant message", async () => {
    const { adapter, submit } = createFakeAdapter();
    const { aui } = renderThreadWithProps({ feedbackAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).submitFeedback({ type: "positive" });
    });

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({
      message: MESSAGES[1],
      type: "positive",
    });
    await waitFor(() => {
      expect(
        aui().thread.message({ id: "a1" }).getState().metadata
          .submittedFeedback,
      ).toEqual({ type: "positive" });
    });

    await act(async () => {
      aui().thread.message({ id: "a1" }).submitFeedback({ type: "negative" });
    });

    expect(submit).toHaveBeenLastCalledWith({
      message: MESSAGES[1],
      type: "negative",
    });
    await waitFor(() => {
      expect(
        aui().thread.message({ id: "a1" }).getState().metadata
          .submittedFeedback,
      ).toEqual({ type: "negative" });
    });
  });

  it("prefers owner-supplied submittedFeedback over the local overlay", async () => {
    const { adapter } = createFakeAdapter();
    const { aui, rerender } = renderThreadWithProps({
      feedbackAdapter: adapter,
    });

    await act(async () => {
      aui().thread.message({ id: "a1" }).submitFeedback({ type: "positive" });
    });
    await waitFor(() => {
      expect(
        aui().thread.message({ id: "a1" }).getState().metadata
          .submittedFeedback,
      ).toEqual({ type: "positive" });
    });

    const ownerMessages = [
      MESSAGES[0]!,
      {
        ...MESSAGES[1]!,
        metadata: { custom: {}, submittedFeedback: { type: "negative" } },
      },
    ] as unknown as readonly ExternalThreadMessage[];
    await act(async () => {
      rerender({ feedbackAdapter: adapter, messages: ownerMessages });
    });

    expect(
      aui().thread.message({ id: "a1" }).getState().metadata.submittedFeedback,
    ).toEqual({ type: "negative" });
  });

  it("re-rates an owner-marked message locally, then honors an owner clear", async () => {
    const { adapter } = createFakeAdapter();
    const ratedMessages = [
      MESSAGES[0]!,
      {
        ...MESSAGES[1]!,
        metadata: { custom: {}, submittedFeedback: { type: "positive" } },
      },
    ] as unknown as readonly ExternalThreadMessage[];
    const { aui, rerender } = renderThreadWithProps({
      feedbackAdapter: adapter,
      messages: ratedMessages,
    });

    await act(async () => {
      aui().thread.message({ id: "a1" }).submitFeedback({ type: "negative" });
    });
    await waitFor(() => {
      expect(
        aui().thread.message({ id: "a1" }).getState().metadata
          .submittedFeedback,
      ).toEqual({ type: "negative" });
    });

    await act(async () => {
      rerender({ feedbackAdapter: adapter, messages: MESSAGES });
    });
    expect(
      aui().thread.message({ id: "a1" }).getState().metadata.submittedFeedback,
    ).toBeUndefined();
  });

  it("submits user message feedback without marking the message", async () => {
    const { adapter, submit } = createFakeAdapter();
    const { aui } = renderThreadWithProps({ feedbackAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "u1" }).submitFeedback({ type: "negative" });
    });

    expect(submit).toHaveBeenCalledWith({
      message: MESSAGES[0],
      type: "negative",
    });
    expect(
      aui().thread.message({ id: "u1" }).getState().metadata.submittedFeedback,
    ).toBeUndefined();
  });
});
