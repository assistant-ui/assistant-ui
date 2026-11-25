// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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
import { getMessageQuote } from "@assistant-ui/core/react";
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

describe("suggestion custom metadata", () => {
  it("sends a configured suggestion's custom as the message's metadata.custom", async () => {
    const onNew = vi.fn();
    render(
      <Runtime onNew={onNew}>
        <WithSuggestions
          suggestions={[
            {
              title: "Grade lab 3",
              label: "against the rubric",
              prompt: "Grade lab 3 against the rubric.",
              custom: { labId: "lab-3" },
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

  it("sends an inline suggestion's custom prop as metadata.custom", async () => {
    const onNew = vi.fn();
    render(
      <Runtime onNew={onNew}>
        <ThreadPrimitive.Suggestion
          prompt="Grade lab 3."
          custom={{ labId: "lab-3" }}
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

  it("sends custom as the message's whole metadata.custom, so a quote key is a quote and the composer's quote stays put", async () => {
    const onNew = vi.fn();
    let aui!: ReturnType<typeof useAui>;
    const Capture: FC = () => {
      aui = useAui();
      return null;
    };
    const quote = { text: "rubric row 2", messageId: "a1" };
    render(
      <Runtime onNew={onNew}>
        <Capture />
        <ThreadPrimitive.Suggestion
          prompt="Explain this."
          custom={{ quote }}
          send
        >
          Explain
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion
          prompt="Grade lab 3."
          custom={{ labId: "lab-3" }}
          send
        >
          Grade
        </ThreadPrimitive.Suggestion>
      </Runtime>,
    );

    fireEvent.click(screen.getByText("Explain"));
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    const quoted = onNew.mock.calls[0]![0] as AppendMessage;
    expect(getMessageQuote({ message: quoted })).toEqual(quote);

    const draftQuote = { text: "draft quote", messageId: "a2" };
    act(() => aui.composer.setQuote(draftQuote));
    fireEvent.click(screen.getByText("Grade"));
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledTimes(2));
    expect((onNew.mock.calls[1]![0] as AppendMessage).metadata.custom).toEqual({
      labId: "lab-3",
    });
    expect(aui.composer.getState().quote).toEqual(draftQuote);
  });
});
