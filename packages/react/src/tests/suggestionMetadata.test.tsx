// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  Suggestions,
  useAui,
  useExternalStoreRuntime,
  type AppendMessage,
  type SuggestionConfig,
  type ThreadMessageLike,
} from "../index";
import * as ThreadPrimitive from "../primitives/thread";
import * as SuggestionPrimitive from "../primitives/suggestion";

const Runtime: FC<{
  onNew: (message: AppendMessage) => void;
  children: ReactNode;
}> = ({ onNew, children }) => {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: [],
    convertMessage: (m) => m,
    onNew: async (m) => onNew(m),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const WithSuggestions: FC<{ suggestions: SuggestionConfig[] }> = ({
  suggestions,
}) => {
  const aui = useAui();
  const config = AuiConfig({ suggestions: Suggestions(suggestions) });
  return (
    <AuiProvider extends={aui} config={config}>
      <ThreadPrimitive.Suggestions>
        {({ suggestion }) => (
          <SuggestionPrimitive.Trigger send>
            {suggestion.title}
          </SuggestionPrimitive.Trigger>
        )}
      </ThreadPrimitive.Suggestions>
    </AuiProvider>
  );
};

afterEach(() => {
  cleanup();
});

describe("suggestion metadata", () => {
  it("sends a configured suggestion's metadata as the message's custom metadata", async () => {
    const onNew = vi.fn();
    render(
      <Runtime onNew={onNew}>
        <WithSuggestions
          suggestions={[
            {
              title: "Grade lab 3",
              label: "against the rubric",
              prompt: "Grade lab 3 against the rubric.",
              metadata: { labId: "lab-3" },
            },
            "Explain lab 4",
          ]}
        />
      </Runtime>,
    );

    fireEvent.click(await screen.findByText("Grade lab 3"));
    fireEvent.click(screen.getByText("Explain lab 4"));

    await vi.waitFor(() => expect(onNew).toHaveBeenCalledTimes(2));
    const [first, second] = onNew.mock.calls.map(
      ([message]) => message as AppendMessage,
    );
    expect(first!.content).toEqual([
      { type: "text", text: "Grade lab 3 against the rubric." },
    ]);
    expect(first!.metadata.custom).toEqual({ labId: "lab-3" });
    expect(second!.metadata.custom).toEqual({});
  });

  it("sends an inline suggestion's metadata prop", async () => {
    const onNew = vi.fn();
    render(
      <Runtime onNew={onNew}>
        <ThreadPrimitive.Suggestion
          prompt="Grade lab 3."
          metadata={{ labId: "lab-3" }}
          send
        >
          Grade
        </ThreadPrimitive.Suggestion>
      </Runtime>,
    );

    fireEvent.click(screen.getByText("Grade"));

    await vi.waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    expect((onNew.mock.calls[0]![0] as AppendMessage).metadata.custom).toEqual({
      labId: "lab-3",
    });
  });
});
