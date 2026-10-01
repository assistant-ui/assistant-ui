// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { ChainOfThoughtByIndicesProvider } from "../../providers/ChainOfThoughtByIndicesProvider";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { ChainOfThoughtPrimitiveParts } from "./ChainOfThoughtParts";

const StateProbe = ({ text }: { text: string }) => {
  const [seed] = useState(text);
  return <span>{`${seed}:${text}`}</span>;
};

const renderThoughtParts = (
  content: ThreadMessageLike["content"],
  startIndex = 0,
) => {
  const Message = () => (
    <ChainOfThoughtByIndicesProvider startIndex={startIndex} endIndex={100}>
      <ChainOfThoughtPrimitiveParts>
        {({ part }) => {
          if (part.type === "text" || part.type === "reasoning")
            return <StateProbe text={part.text} />;
          if (part.type === "image")
            return (
              <StateProbe text={part.image.split("/").pop()!.split(".")[0]!} />
            );
          if (part.type === "tool-call")
            return <StateProbe text={part.argsText} />;
          return null;
        }}
      </ChainOfThoughtPrimitiveParts>
    </ChainOfThoughtByIndicesProvider>
  );
  const App = ({ content }: { content: ThreadMessageLike["content"] }) => {
    const runtime = useExternalStoreRuntime({
      messages: [{ id: "message", role: "assistant", content }],
      convertMessage: (message: ThreadMessageLike) => message,
      isRunning: true,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages components={{ Message }} />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<App content={content} />);
  return {
    setContent: (content: ThreadMessageLike["content"]) =>
      view.rerender(<App content={content} />),
    values: () =>
      Array.from(
        view.container.querySelectorAll("span"),
        (el) => el.textContent,
      ),
  };
};

afterEach(cleanup);

describe("ChainOfThoughtPrimitive.Parts identity", () => {
  it.each(["text", "reasoning"] as const)(
    "keeps the %s seed while streaming and resets it for a replacement id",
    (type) => {
      const view = renderThoughtParts([{ type, id: "p1", text: "old" }]);
      view.setContent([{ type, id: "p1", text: "old streamed" }]);
      expect(view.values()).toEqual(["old:old streamed"]);
      view.setContent([{ type, id: "p2", text: "new" }]);
      expect(view.values()).toEqual(["new:new"]);
    },
  );

  it("keeps each seed with its id when parts swap", () => {
    const view = renderThoughtParts([
      { type: "reasoning", id: "p1", text: "first" },
      { type: "reasoning", id: "p2", text: "second" },
    ]);
    view.setContent([
      { type: "reasoning", id: "p2", text: "second updated" },
      { type: "reasoning", id: "p1", text: "first updated" },
    ]);
    expect(view.values()).toEqual([
      "second:second updated",
      "first:first updated",
    ]);
  });

  it("mounts fresh state when anonymous text becomes an image", () => {
    const view = renderThoughtParts([{ type: "text", text: "old" }]);
    view.setContent([{ type: "image", image: "https://example.com/new.png" }]);
    expect(view.values()).toEqual(["new:new"]);
  });

  it("resolves duplicate ids across the whole message before selecting a chain", () => {
    const view = renderThoughtParts(
      [
        { type: "reasoning", id: "p1", text: "outside" },
        { type: "reasoning", id: "p1", text: "inside" },
      ],
      1,
    );
    view.setContent([
      { type: "reasoning", id: "p1", text: "inside moved" },
      { type: "reasoning", id: "p1", text: "outside moved" },
    ]);
    expect(view.values()).toEqual(["inside:outside moved"]);
    view.setContent([
      { type: "reasoning", id: "p2", text: "outside" },
      { type: "reasoning", id: "p1", text: "new" },
    ]);
    expect(view.values()).toEqual(["new:new"]);
  });

  it("keys duplicate tool call ids positionally and remounts a newly unique id", () => {
    const view = renderThoughtParts([
      {
        type: "tool-call",
        toolCallId: "call",
        toolName: "task",
        args: {},
        argsText: "first",
      },
      {
        type: "tool-call",
        toolCallId: "call",
        toolName: "task",
        args: {},
        argsText: "second",
      },
    ]);
    expect(view.values()).toEqual(["first:first", "second:second"]);
    view.setContent([
      {
        type: "tool-call",
        toolCallId: "call",
        toolName: "task",
        args: {},
        argsText: "second moved",
      },
      {
        type: "tool-call",
        toolCallId: "call",
        toolName: "task",
        args: {},
        argsText: "first moved",
      },
    ]);
    expect(view.values()).toEqual(["first:second moved", "second:first moved"]);
    view.setContent([
      {
        type: "tool-call",
        toolCallId: "call",
        toolName: "task",
        args: {},
        argsText: "second updated",
      },
    ]);
    expect(view.values()).toEqual(["second updated:second updated"]);
  });
});
