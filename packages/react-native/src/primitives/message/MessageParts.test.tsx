import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { MessagePrimitiveParts } from "./MessageParts";

const h = vi.hoisted(() => ({
  imageProps: null as Record<string, unknown> | null,
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const ImageMock = (props: Record<string, unknown>) => {
    h.imageProps = props;
    return React.createElement(
      actual.Image as unknown as React.ElementType,
      props,
    );
  };
  return { ...actual, Image: ImageMock };
});

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

const IMAGE = "data:image/png;base64,iVBORw0KGgo=";

const ImageApp = (props: MessagePrimitiveParts.Props) => {
  const runtime = useExternalStoreRuntime({
    messages: [
      { role: "assistant", content: [{ type: "image", image: IMAGE }] },
    ] satisfies ThreadMessageLike[],
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

  it("renders an image part without a components override", async () => {
    await act(async () => root.render(<ImageApp />));

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toContain(IMAGE);
  });

  it("gives the default image a sizing style, which native layout requires", async () => {
    await act(async () => root.render(<ImageApp />));

    // a native Image derives no size from a remote or data URI, so the style
    // reaching the host is the contract, not whatever the DOM shim renders
    expect(h.imageProps?.style).toEqual({ width: "100%", aspectRatio: 1 });
    expect(h.imageProps?.resizeMode).toBe("contain");
  });

  it("lets a caller-supplied Image win over the default", async () => {
    const CustomImage = () => <Text>custom image</Text>;

    await act(async () =>
      root.render(<ImageApp components={{ Image: CustomImage }} />),
    );

    expect(container.textContent).toBe("custom image");
    expect(container.querySelector("img")).toBeNull();
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
