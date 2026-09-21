// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { ThreadPrimitiveMessageByIndex } from "../thread/ThreadMessages";
import {
  type MessagePrimitiveUnstable_PartsGrouped,
  MessagePrimitiveUnstable_PartsGroupedByParentId,
} from "./MessagePartsGrouped";

const Message = () => (
  <MessagePrimitiveUnstable_PartsGroupedByParentId
    components={{
      Text: ({ text }) => <span>{text}</span>,
      Group: ({ groupKey, indices, children }) => (
        <section
          data-testid="group"
          data-parent={groupKey}
          data-indices={indices.join(",")}
        >
          {children}
        </section>
      ),
    }}
  />
);

const partsMessage =
  (components: MessagePrimitiveUnstable_PartsGrouped.Props["components"]): FC =>
  () => (
    <MessagePrimitiveUnstable_PartsGroupedByParentId components={components} />
  );

const Named = () => <b>named</b>;
const Fallback = () => <i>fallback</i>;

const Example = ({
  content,
  Message: MessageComponent = Message,
}: {
  content: ThreadMessageLike["content"];
  Message?: FC;
}) => {
  const messages: ThreadMessageLike[] = [
    { id: "message", role: "assistant", content },
  ];
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitiveMessageByIndex
        index={0}
        components={{ Message: MessageComponent }}
      />
    </AssistantRuntimeProvider>
  );
};

describe("MessagePrimitive.Unstable_PartsGroupedByParentId", () => {
  it("keeps parent IDs separate from ungrouped parts across content updates", () => {
    const { rerender } = render(
      <Example
        content={[
          { type: "text", text: "standalone" },
          { type: "text", text: "child", parentId: "__ungrouped_0" },
        ]}
      />,
    );
    expect(
      screen.getAllByTestId("group").map((group) => ({
        parent: group.getAttribute("data-parent"),
        indices: group.getAttribute("data-indices"),
        text: group.textContent,
      })),
    ).toEqual([
      { parent: null, indices: "0", text: "standalone" },
      { parent: "__ungrouped_0", indices: "1", text: "child" },
    ]);

    rerender(
      <Example
        content={[
          { type: "text", text: "first", parentId: "__ungrouped_parent" },
          { type: "text", text: "standalone" },
          { type: "text", text: "last", parentId: "__ungrouped_parent" },
          { type: "text", text: "numeric", parentId: "1" },
          { type: "text", text: "empty", parentId: "" },
          { type: "text", text: "trailing" },
        ]}
      />,
    );
    expect(
      screen.getAllByTestId("group").map((group) => ({
        parent: group.getAttribute("data-parent"),
        indices: group.getAttribute("data-indices"),
        text: group.textContent,
      })),
    ).toEqual([
      { parent: "__ungrouped_parent", indices: "0,2", text: "firstlast" },
      { parent: null, indices: "1", text: "standalone" },
      { parent: "1", indices: "3", text: "numeric" },
      { parent: "", indices: "4", text: "empty" },
      { parent: null, indices: "5", text: "trailing" },
    ]);
  });

  it.each(["toString", "constructor", "__proto__"])(
    "falls back for a tool call named %s that only Object.prototype has",
    (toolName) => {
      const { container } = render(
        <Example
          content={[
            { type: "tool-call", toolCallId: "call", toolName, args: {} },
          ]}
          Message={partsMessage({
            tools: { by_name: { other: Named }, Fallback },
          })}
        />,
      );

      expect(container.innerHTML).toBe("<i>fallback</i>");
    },
  );

  it.each(["toString", "constructor", "__proto__"])(
    "falls back for a data part named %s that only Object.prototype has",
    (name) => {
      const { container } = render(
        <Example
          content={[{ type: "data", name, data: 1 }]}
          Message={partsMessage({
            data: { by_name: { other: Named }, Fallback },
          })}
        />,
      );

      expect(container.innerHTML).toBe("<i>fallback</i>");
    },
  );

  it("renders tool and data UIs registered under an inherited name", () => {
    const { container } = render(
      <Example
        content={[
          {
            type: "tool-call",
            toolCallId: "call",
            toolName: "toString",
            args: {},
          },
          { type: "data", name: "toString", data: 1 },
        ]}
        Message={partsMessage({
          tools: { by_name: { toString: Named }, Fallback },
          data: { by_name: { toString: Named }, Fallback },
        })}
      />,
    );

    expect(container.innerHTML).toBe("<b>named</b><b>named</b>");
  });
});
