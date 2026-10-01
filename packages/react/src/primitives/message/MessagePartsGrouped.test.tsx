// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import {
  useEffect,
  useState,
  type FC,
  type ReactNode,
  type PropsWithChildren,
} from "react";
import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useAssistantDataUI,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
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
const GlobalFallback = () => <b>global-fallback</b>;

const RegisterFallbackDataUI: FC<{ render: typeof GlobalFallback }> = ({
  render,
}) => {
  const aui = useAui();
  useEffect(() => aui.dataRenderers.setFallbackDataUI(render), [aui, render]);
  return null;
};

const RegisterNamedDataUI: FC<{ name: string; render: typeof Named }> = ({
  name,
  render,
}) => {
  useAssistantDataUI({ name, render });
  return null;
};

const Example = ({
  content,
  Message: MessageComponent = Message,
  extra,
  isRunning = false,
}: {
  content: ThreadMessageLike["content"];
  Message?: FC;
  extra?: ReactNode;
  isRunning?: boolean;
}) => {
  const messages: ThreadMessageLike[] = [
    { id: "message", role: "assistant", content },
  ];
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    isRunning,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {extra}
      <ThreadPrimitiveMessageByIndex
        index={0}
        components={{ Message: MessageComponent }}
      />
    </AssistantRuntimeProvider>
  );
};

describe("MessagePrimitive.Unstable_PartsGroupedByParentId", () => {
  it.each(["tool-call", "reasoning"] as const)(
    "keeps wrapper and mounted state when a tool call is appended after %s",
    (firstType) => {
      let mounts = 0;
      const Group = ({ children }: PropsWithChildren) => {
        const [mount] = useState(() => ++mounts);
        return <section data-mount={mount}>{children}</section>;
      };
      const Text = ({ text }: { text: string }) => {
        const [seed] = useState(text);
        return <span>{`${seed}:${text}`}</span>;
      };
      const Tool = ({ argsText }: { argsText: string }) => (
        <Text text={argsText} />
      );
      const Message = partsMessage({
        Reasoning: Text,
        Group,
        tools: { Fallback: Tool },
      });
      const first =
        firstType === "tool-call"
          ? {
              type: "tool-call" as const,
              toolCallId: "t2",
              toolName: "task",
              args: {},
              argsText: "draft",
              parentId: "parent",
            }
          : { type: "reasoning" as const, text: "draft", parentId: "parent" };
      const view = render(
        <Example Message={Message} content={[first]} isRunning />,
      );
      const wrapper = view.container.querySelector("section");
      const streamed =
        first.type === "tool-call"
          ? { ...first, argsText: "streamed" }
          : { ...first, text: "streamed" };
      const appended = {
        type: "tool-call" as const,
        toolCallId: "t1",
        toolName: "task",
        args: {},
        argsText: "appended",
        parentId: "parent",
      };
      view.rerender(
        <Example Message={Message} content={[streamed, appended]} isRunning />,
      );
      expect(view.container.querySelector("section")).toBe(wrapper);
      expect(wrapper?.dataset.mount).toBe("1");
      expect(
        Array.from(
          view.container.querySelectorAll("span"),
          (el) => el.textContent,
        ),
      ).toEqual(["draft:streamed", "appended:appended"]);
      view.rerender(
        <Example
          Message={Message}
          content={[
            streamed,
            { ...appended, argsText: "updated" },
            { ...appended, toolCallId: "t0", argsText: "last" },
          ]}
          isRunning
        />,
      );
      expect(view.container.querySelector("section")).toBe(wrapper);
      expect(
        Array.from(
          view.container.querySelectorAll("span"),
          (el) => el.textContent,
        ),
      ).toEqual(["draft:streamed", "appended:updated", "last:last"]);
    },
  );

  it("keeps parent names and part ids with key delimiters separate", () => {
    let mounts = 0;
    const Group = ({ children }: PropsWithChildren) => {
      const [mount] = useState(() => ++mounts);
      return <section data-mount={mount}>{children}</section>;
    };
    const Text = ({ text }: { text: string }) => {
      const [seed] = useState(text);
      return <span>{`${seed}:${text}`}</span>;
    };
    const Message = partsMessage({ Text, Group });
    const first = {
      type: "text" as const,
      id: "x-id:text:y",
      text: "first",
      parentId: "a",
    };
    const second = {
      type: "text" as const,
      id: "y",
      text: "second",
      parentId: "a-id:text:x",
    };
    const view = render(
      <Example Message={Message} content={[first, second]} />,
    );
    view.rerender(
      <Example
        Message={Message}
        content={[
          { ...second, text: "second updated" },
          { ...first, text: "first updated" },
        ]}
      />,
    );
    expect(
      Array.from(
        view.container.querySelectorAll("section"),
        (el) => el.dataset.mount,
      ),
    ).toEqual(["2", "1"]);
    expect(
      Array.from(
        view.container.querySelectorAll("span"),
        (el) => el.textContent,
      ),
    ).toEqual(["second:second updated", "first:first updated"]);
  });

  it.each([undefined, "parent"])(
    "keeps wrapper and leaf state when later identified parts swap with parent=%s",
    (parentId) => {
      let mounts = 0;
      const Group = ({ children }: PropsWithChildren) => {
        const [mount] = useState(() => ++mounts);
        return <section data-mount={mount}>{children}</section>;
      };
      const Text = ({ text }: { text: string }) => {
        const [seed] = useState(text);
        return <span>{`${seed}:${text}`}</span>;
      };
      const Message = partsMessage({ Text, Group });
      const first = {
        type: "text" as const,
        id: "p1",
        text: "first",
        ...(parentId !== undefined && { parentId }),
      };
      const second = {
        type: "text" as const,
        id: "p2",
        text: "second",
        ...(parentId !== undefined && { parentId }),
      };
      const third = {
        ...second,
        id: "p3",
        text: "third",
      };
      const view = render(
        <Example Message={Message} content={[first, second, third]} />,
      );
      view.rerender(
        <Example
          Message={Message}
          content={[
            { ...first, text: "first updated" },
            { ...third, text: "third updated" },
            { ...second, text: "second updated" },
          ]}
        />,
      );
      expect(
        Array.from(
          view.container.querySelectorAll("span"),
          (el) => el.textContent,
        ),
      ).toEqual([
        "first:first updated",
        "third:third updated",
        "second:second updated",
      ]);
      expect(
        Array.from(
          view.container.querySelectorAll("section"),
          (el) => el.dataset.mount,
        ),
      ).toEqual(parentId === undefined ? ["1", "3", "2"] : ["1"]);
    },
  );

  it("keys unidentified groups by index and keeps parent names separate", () => {
    let mounts = 0;
    const Group = ({
      groupKey,
      children,
    }: PropsWithChildren<{ groupKey: string | undefined }>) => {
      const [mount] = useState(() => ++mounts);
      return (
        <section data-mount={mount} data-parent={groupKey}>
          {children}
        </section>
      );
    };
    const Message = partsMessage({ Group });
    const parts = [
      { type: "text" as const, text: "first" },
      { type: "text" as const, text: "second" },
    ];
    const view = render(<Example Message={Message} content={parts} />);
    view.rerender(
      <Example
        Message={Message}
        content={[
          { type: "text", text: "parented", parentId: "ungrouped" },
          ...parts,
        ]}
      />,
    );
    expect(
      Array.from(
        view.container.querySelectorAll("section"),
        (el) => el.dataset.mount,
      ),
    ).toEqual(["3", "2", "4"]);
  });

  it("keeps a text seed while streaming and resets it for a replacement id", () => {
    const SeededText = ({ text }: { text: string }) => {
      const [seed] = useState(text);
      return <span>{`${seed}:${text}`}</span>;
    };
    const Message = partsMessage({ Text: SeededText });
    const view = render(
      <Example
        Message={Message}
        content={[{ type: "text", id: "p1", text: "old" }]}
      />,
    );

    view.rerender(
      <Example
        Message={Message}
        content={[{ type: "text", id: "p1", text: "old streamed" }]}
      />,
    );
    expect(view.container.textContent).toBe("old:old streamed");

    view.rerender(
      <Example
        Message={Message}
        content={[{ type: "text", id: "p2", text: "new" }]}
      />,
    );
    expect(view.container.textContent).toBe("new:new");
  });

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

  it("uses dataRenderers.fallbacks[0] before inline data.Fallback", async () => {
    const { container } = render(
      <Example
        content={[{ type: "data", name: "chart", data: 1 }]}
        Message={partsMessage({ data: { Fallback } })}
        extra={<RegisterFallbackDataUI render={GlobalFallback} />}
      />,
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe("<b>global-fallback</b>");
    });
  });

  it("uses dataRenderers.fallbacks[0] when no named renderer or inline Fallback is set", async () => {
    const { container } = render(
      <Example
        content={[{ type: "data", name: "chart", data: 1 }]}
        Message={partsMessage({})}
        extra={<RegisterFallbackDataUI render={GlobalFallback} />}
      />,
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe("<b>global-fallback</b>");
    });
  });

  it("prefers a named data renderer over dataRenderers.fallbacks", async () => {
    const { container } = render(
      <Example
        content={[{ type: "data", name: "chart", data: 1 }]}
        Message={partsMessage({ data: { Fallback } })}
        extra={
          <>
            <RegisterFallbackDataUI render={GlobalFallback} />
            <RegisterNamedDataUI name="chart" render={Named} />
          </>
        }
      />,
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe("<b>named</b>");
    });
  });
});
