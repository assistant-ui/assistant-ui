// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { MessagePrimitiveParts } from "./MessageParts";

const Named = () => <b>named</b>;
const Fallback = () => <i>fallback</i>;

const renderParts = (
  content: ThreadMessageLike["content"],
  components: MessagePrimitiveParts.Props["components"],
) => {
  const Message = () => <MessagePrimitiveParts components={components} />;
  const messages: ThreadMessageLike[] = [
    { id: "message", role: "assistant", content },
  ];
  const App = () => {
    const runtime = useExternalStoreRuntime({
      messages,
      convertMessage: (message) => message,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages components={{ Message }} />
      </AssistantRuntimeProvider>
    );
  };
  return render(<App />).container.innerHTML;
};

const toolCall = (toolName: string): ThreadMessageLike["content"] => [
  { type: "tool-call", toolCallId: "call", toolName, args: {} },
];

const dataPart = (name: string): ThreadMessageLike["content"] => [
  { type: "data", name, data: 1 },
];

afterEach(cleanup);

describe("MessagePrimitive.Parts", () => {
  it.each(["toString", "constructor", "__proto__"])(
    "falls back for a tool call named %s that only Object.prototype has",
    (toolName) => {
      expect(
        renderParts(toolCall(toolName), {
          tools: { by_name: { other: Named }, Fallback },
        }),
      ).toBe("<i>fallback</i>");
    },
  );

  it.each(["toString", "constructor", "__proto__"])(
    "falls back for a data part named %s that only Object.prototype has",
    (name) => {
      expect(
        renderParts(dataPart(name), {
          data: { by_name: { other: Named }, Fallback },
        }),
      ).toBe("<i>fallback</i>");
    },
  );

  it("renders a tool UI registered under an inherited name", () => {
    expect(
      renderParts(toolCall("toString"), {
        tools: { by_name: { toString: Named }, Fallback },
      }),
    ).toBe("<b>named</b>");
  });

  it("renders a data UI registered under an inherited name", () => {
    expect(
      renderParts(dataPart("toString"), {
        data: { by_name: { toString: Named }, Fallback },
      }),
    ).toBe("<b>named</b>");
  });
});
