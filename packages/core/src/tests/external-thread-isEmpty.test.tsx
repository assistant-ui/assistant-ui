// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect } from "vitest";
import { AuiIf, useAui, AuiProvider } from "@assistant-ui/store";
import {
  ExternalThread,
  type ExternalThreadProps,
} from "../store/clients/external-thread";
import { useThreadIsEmpty } from "../react/primitive-hooks/useThreadIsEmpty";

const HookProbe: FC = () => (
  <div data-testid="hook">{useThreadIsEmpty() ? "empty" : "not-empty"}</div>
);

const renderThread = (props: ExternalThreadProps) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ threadProps: ExternalThreadProps }> = ({ threadProps }) => {
    const aui = useAui({ thread: ExternalThread(threadProps) });
    return (
      <AuiProvider value={aui}>
        <Capture />
        <HookProbe />
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div data-testid="aui-if">empty</div>
        </AuiIf>
      </AuiProvider>
    );
  };
  const utils = render(<App threadProps={props} />);
  return {
    state: () => captured.aui!.thread.getState(),
    hookSaysEmpty: () => utils.getByTestId("hook").textContent === "empty",
    auiIfRendered: () => utils.queryByTestId("aui-if") !== null,
    rerender: (next: ExternalThreadProps) =>
      utils.rerender(<App threadProps={next} />),
  };
};

const userMessage = (id: string) =>
  ({
    id,
    role: "user",
    content: [{ type: "text", text: "hi" }],
    createdAt: new Date(0),
    metadata: { custom: {} },
  }) as unknown as ExternalThreadProps["messages"][number];

describe("ExternalThread isEmpty", () => {
  it("is empty when there are no messages and nothing is loading", () => {
    const t = renderThread({ messages: [] });
    expect(t.state().isEmpty).toBe(true);
    expect(t.hookSaysEmpty()).toBe(true);
    expect(t.auiIfRendered()).toBe(true);
  });

  it("is not empty while the adapter is still loading", () => {
    const t = renderThread({ messages: [], isLoading: true });
    expect(t.state().isEmpty).toBe(false);
  });

  it("does not render empty-state consumers while loading", () => {
    const t = renderThread({ messages: [], isLoading: true });
    expect(t.hookSaysEmpty()).toBe(false);
    expect(t.auiIfRendered()).toBe(false);
  });

  it("is not empty once messages arrive", () => {
    const t = renderThread({ messages: [userMessage("m1")] });
    expect(t.state().isEmpty).toBe(false);
  });

  it("becomes empty when loading finishes with no messages", () => {
    const t = renderThread({ messages: [], isLoading: true });
    expect(t.state().isEmpty).toBe(false);
    expect(t.auiIfRendered()).toBe(false);

    t.rerender({ messages: [], isLoading: false });

    expect(t.state().isEmpty).toBe(true);
    expect(t.hookSaysEmpty()).toBe(true);
    expect(t.auiIfRendered()).toBe(true);
  });

  it("stays non-empty when loading finishes with messages", () => {
    const t = renderThread({ messages: [], isLoading: true });
    expect(t.state().isEmpty).toBe(false);

    t.rerender({ messages: [userMessage("m1")], isLoading: false });

    expect(t.state().isEmpty).toBe(false);
    expect(t.hookSaysEmpty()).toBe(false);
    expect(t.auiIfRendered()).toBe(false);
  });
});
