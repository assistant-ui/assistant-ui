import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { MessagePrimitiveParts } from "./MessageParts";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const messages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      { type: "text", text: "Answer" },
      { type: "reasoning", text: "Thinking" },
      {
        type: "generative-ui",
        spec: {
          root: [
            { component: "Card", props: { title: "Result" } },
            { component: "Unknown" },
          ],
        },
      },
      { type: "data", name: "chart", data: 42 },
      { type: "data", name: "other", data: 7 },
    ],
  },
];

const components = {
  generativeUI: {
    components: {
      Card: ({ title }: { title: string }) => <Text>{title}</Text>,
    },
    Fallback: ({ component }: { component: string }) => (
      <Text>Unavailable: {component}</Text>
    ),
  },
  data: {
    by_name: {
      chart: ({ data }: { data: unknown }) => (
        <Text>Chart: {String(data)}</Text>
      ),
    },
    Fallback: ({ data }: { data: unknown }) => (
      <Text>Data: {String(data)}</Text>
    ),
  },
};

const App = (props: MessagePrimitiveParts.Props) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {
      throw new Error("This thread is read-only");
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageByIndexProvider index={0}>
        <MessagePrimitiveParts {...props} />
      </MessageByIndexProvider>
    </AssistantRuntimeProvider>
  );
};

const ChainOfThought = () => <Text>Thought group</Text>;

describe("MessagePrimitiveParts", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders generative UI and its fallback beside native text", async () => {
    await act(async () => root.render(<App components={components} />));
    expect(container.textContent).toBe(
      "AnswerResultUnavailable: UnknownChart: 42Data: 7",
    );
  });

  it("keeps data and generative UI when chain-of-thought grouping changes", async () => {
    await act(async () => root.render(<App components={components} />));
    expect(container.textContent).toBe(
      "AnswerResultUnavailable: UnknownChart: 42Data: 7",
    );

    await act(async () =>
      root.render(<App components={{ ...components, ChainOfThought }} />),
    );
    expect(container.textContent).toBe(
      "AnswerThought groupResultUnavailable: UnknownChart: 42Data: 7",
    );

    await act(async () => root.render(<App components={components} />));
    expect(container.textContent).toBe(
      "AnswerResultUnavailable: UnknownChart: 42Data: 7",
    );
  });
});
