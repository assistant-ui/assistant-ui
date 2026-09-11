// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { ThreadPrimitiveMessageByIndex } from "../thread/ThreadMessages";
import { MessagePrimitiveUnstable_PartsGroupedByParentId } from "./MessagePartsGrouped";

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

const Example = ({ content }: { content: ThreadMessageLike["content"] }) => {
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
      <ThreadPrimitiveMessageByIndex index={0} components={{ Message }} />
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
});
