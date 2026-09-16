import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  PartByIndexProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { MessagePartPrimitiveImage } from "./MessagePartImage";

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");

  const ImageMock = React.forwardRef(function ImageMock(
    props: { source?: { uri?: string }; testID?: string },
    ref: React.Ref<HTMLImageElement>,
  ) {
    return React.createElement("img", {
      ref,
      src: props.source?.uri,
      "data-testid": props.testID,
    });
  });

  return { ...actual, Image: ImageMock };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const messages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      { type: "text", text: "Answer" },
      { type: "image", image: "https://example.com/image.png" },
    ],
  },
];

const App = ({ partIndex }: { partIndex: number }) => {
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
        <PartByIndexProvider index={partIndex}>
          <MessagePartPrimitiveImage testID="image" />
        </PartByIndexProvider>
      </MessageByIndexProvider>
    </AssistantRuntimeProvider>
  );
};

describe("MessagePartPrimitiveImage", () => {
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

  const mount = async (partIndex: number) => {
    await act(async () => root.render(<App partIndex={partIndex} />));
    return container.querySelector('[data-testid="image"]') as HTMLImageElement;
  };

  it("renders the current image part URI", async () => {
    const image = await mount(1);
    expect(image.getAttribute("src")).toBe("https://example.com/image.png");
  });

  it("renders an image without a URI for a non-image part", async () => {
    const image = await mount(0);
    expect(image.getAttribute("src")).toBeNull();
  });
});
