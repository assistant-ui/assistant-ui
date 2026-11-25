// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { GROUPBY_MEMO_KEY, groupPartByType } from "../../utils/groupParts";
import { useAssistantDataUI } from "../../model-context/useAssistantDataUI";
import { useAssistantToolUI } from "../../model-context/useAssistantToolUI";
import { MessagePrimitiveGroupedParts } from "./MessageGroupedParts";

const NamedTool = () => <b>named</b>;
const RegisterNamedTool = () => {
  useAssistantToolUI({ toolName: "task", render: NamedTool });
  return null;
};

const NamedData = ({ data }: { data: { value: string } }) => (
  <b>{data.value}</b>
);
const RegisterNamedData = () => {
  useAssistantDataUI({ name: "status", render: NamedData });
  return null;
};
const RegisterFallbackData = () => {
  const aui = useAui();
  useEffect(() => aui.dataRenderers.setFallbackDataUI(NamedData), [aui]);
  return null;
};

type Msg = {
  id: string;
  content: readonly (
    | {
        type: "tool-call";
        toolCallId: string;
        toolName: string;
        args: {};
        result?: { ok: true };
      }
    | { type: "data"; name: string; data: { value: string } }
  )[];
};

const task = (
  toolCallId: string,
  hasResult: boolean,
): Extract<Msg["content"][number], { type: "tool-call" }> => ({
  type: "tool-call" as const,
  toolCallId,
  toolName: "task",
  args: {},
  ...(hasResult ? { result: { ok: true } } : {}),
});

const convertMessage = (message: Msg): ThreadMessageLike => ({
  id: message.id,
  role: "assistant",
  content: message.content,
});

const StateProbe = ({ text }: { text: string }) => {
  const [seed] = useState(text);
  return <span>{`${seed}:${text}`}</span>;
};

const renderIdentityGroups = (
  content: ThreadMessageLike["content"],
  grouped:
    | boolean
    | "nested"
    | "thought"
    | "nested-thought"
    | "named-tools"
    | MessagePrimitiveGroupedParts.Props["groupBy"],
) => {
  let mounts = 0;
  const Group = ({ children }: PropsWithChildren) => {
    const [mount] = useState(() => ++mounts);
    return <section data-mount={mount}>{children}</section>;
  };
  const path =
    grouped === "nested" || grouped === "nested-thought"
      ? (["group-parts", "group-leaves"] as const)
      : (["group-parts"] as const);
  const Message = () => (
    <MessagePrimitiveGroupedParts
      groupBy={
        typeof grouped === "function"
          ? grouped
          : grouped === "named-tools"
            ? (part) =>
                part.type === "tool-call"
                  ? [part.toolName as `group-${string}`]
                  : []
            : groupPartByType(
                grouped === "thought" || grouped === "nested-thought"
                  ? { reasoning: path, "tool-call": path }
                  : grouped
                    ? {
                        text: path,
                        image: path,
                      }
                    : {},
              )
      }
    >
      {({ part, children }) => {
        if (part.type.startsWith("group-")) return <Group>{children}</Group>;
        if (part.type === "text" || part.type === "reasoning")
          return <StateProbe text={part.text} />;
        if (part.type === "tool-call")
          return <StateProbe text={part.argsText} />;
        if (part.type === "image")
          return (
            <StateProbe text={part.image.split("/").pop()!.split(".")[0]!} />
          );
        return null;
      }}
    </MessagePrimitiveGroupedParts>
  );
  const App = ({
    content,
    isRunning = true,
  }: {
    content: ThreadMessageLike["content"];
    isRunning?: boolean;
  }) => {
    const runtime = useExternalStoreRuntime({
      messages: [{ id: "message", role: "assistant", content }],
      convertMessage: (message: ThreadMessageLike) => message,
      isRunning,
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
    setContent: (content: ThreadMessageLike["content"], isRunning = true) =>
      view.rerender(<App content={content} isRunning={isRunning} />),
    groupMounts: () =>
      Array.from(
        view.container.querySelectorAll("section"),
        (el) => el.dataset.mount,
      ),
    values: () =>
      Array.from(
        view.container.querySelectorAll("span"),
        (el) => el.textContent,
      ),
  };
};

afterEach(cleanup);

describe("MessagePrimitive.GroupedParts", () => {
  it("keeps an inner wrapper from being stolen by a member from another outer group", () => {
    const first = { ...task("t0", false), argsText: "first" };
    const second = { ...task("t1", false), argsText: "second" };
    const third = { ...task("t2", false), argsText: "third" };
    const text = { type: "text" as const, text: "separator" };
    const image = {
      type: "image" as const,
      image: "https://example.com/s1.png",
    };
    const reasoning = { type: "reasoning" as const, text: "r1" };
    const view = renderIdentityGroups(
      [first, text, second, third],
      groupPartByType({
        reasoning: ["group-parts", "group-leaves"],
        "tool-call": ["group-parts", "group-leaves"],
        image: ["group-parts"],
      }),
    );
    view.setContent([
      first,
      image,
      reasoning,
      third,
      text,
      { ...reasoning, text: "r2" },
      second,
    ]);
    const [outer, firstInner, middleInner] = view.groupMounts();
    view.setContent([
      first,
      image,
      reasoning,
      { ...third, argsText: "updated" },
      { ...image, image: "https://example.com/s2.png" },
      second,
    ]);
    expect(view.groupMounts().slice(0, 3)).toEqual([
      outer,
      firstInner,
      middleInner,
    ]);
    expect(view.groupMounts()[3]).not.toBe(middleInner);
    expect(view.values()).toEqual([
      "first:first",
      "s1:s1",
      "r1:r1",
      "third:updated",
      "s2:s2",
      "second:second",
    ]);
  });

  it("inherits an inner wrapper through the member that stayed under a structural ancestor", () => {
    const first = { ...task("t1", false), argsText: "first" };
    const second = { ...task("t0", false), argsText: "second" };
    const firstImage = {
      type: "image" as const,
      image: "https://example.com/i1.png",
    };
    const secondImage = {
      ...firstImage,
      image: "https://example.com/i2.png",
    };
    const view = renderIdentityGroups(
      [
        firstImage,
        first,
        { type: "text", text: "separator" },
        secondImage,
        second,
      ],
      groupPartByType({
        reasoning: ["group-parts", "group-leaves"],
        "tool-call": ["group-parts", "group-leaves"],
        image: ["group-parts"],
      }),
    );
    const [outer, inner] = view.groupMounts();
    view.setContent([
      firstImage,
      second,
      secondImage,
      { type: "reasoning", text: "plan" },
      { ...first, argsText: "updated" },
    ]);
    expect(view.groupMounts()[0]).toBe(outer);
    expect(view.groupMounts()[2]).toBe(inner);
    expect(view.values()).toEqual([
      "i1:i1",
      "second:second",
      "i2:i2",
      "plan:plan",
      "first:updated",
    ]);
  });

  it("keeps nested wrappers with their branch after a separator changes depth", () => {
    const first = { ...task("t1", false), argsText: "first" };
    const second = { ...task("t2", false), argsText: "second" };
    const reasoning = { type: "reasoning" as const, text: "plan" };
    const view = renderIdentityGroups(
      [first, second],
      groupPartByType({
        reasoning: ["group-parts", "group-leaves"],
        "tool-call": ["group-parts", "group-leaves"],
        image: ["group-parts"],
      }),
    );
    const initialMounts = view.groupMounts();
    view.setContent([
      reasoning,
      second,
      { type: "text", text: "separator" },
      first,
    ]);
    const [earlierOuter, earlierInner] = view.groupMounts();
    expect(view.groupMounts().slice(2)).toEqual(initialMounts);
    view.setContent([
      reasoning,
      second,
      { type: "image", image: "https://example.com/separator.png" },
      first,
    ]);
    const [outer, inner, laterInner] = view.groupMounts();
    expect(outer).toBe(earlierOuter);
    expect(inner).toBe(earlierInner);
    expect(laterInner).not.toBe(earlierInner);
    expect(view.values()).toEqual([
      "plan:plan",
      "second:second",
      "separator:separator",
      "first:first",
    ]);
  });

  it("lets a group inherit a key also used by a standalone leaf", () => {
    const tool = { ...task("t1", false), argsText: "tool" };
    const second = { ...task("t2", false), argsText: "second" };
    const reasoning = { type: "reasoning" as const, text: "plan" };
    const view = renderIdentityGroups(
      [tool, second],
      groupPartByType({
        reasoning: ["group-parts"],
        "tool-call": ["group-parts"],
        "tool-call:standalone": [],
      }),
    );
    const mounts = view.groupMounts();
    view.setContent([reasoning, tool, second]);
    expect(view.groupMounts()).toEqual(mounts);
    view.setContent([{ ...tool, toolName: "standalone" }, reasoning, second]);
    expect(view.groupMounts()).toEqual(mounts);
    expect(view.values()).toEqual(["tool:tool", "plan:plan", "second:second"]);
  });

  it("drops nested inheritance when its ancestor changes identity", () => {
    const first = { ...task("t1", false), argsText: "first" };
    const second = { ...task("t2", false), argsText: "second" };
    const separator = {
      type: "image" as const,
      image: "https://example.com/separator.png",
    };
    const view = renderIdentityGroups(
      [first, second],
      groupPartByType({
        reasoning: ["group-parts", "group-leaves"],
        "tool-call": ["group-parts", "group-leaves"],
        image: ["group-parts"],
      }),
    );
    const [initialOuter] = view.groupMounts();
    view.setContent([
      second,
      separator,
      { type: "reasoning", text: "plan" },
      first,
    ]);
    const [outer, inner, laterInner] = view.groupMounts();
    expect(outer).not.toBe(initialOuter);
    view.setContent([second, separator, { ...first, argsText: "updated" }]);
    expect(view.groupMounts().slice(0, 2)).toEqual([outer, inner]);
    expect(view.groupMounts()[2]).not.toBe(laterInner);
    expect(view.values()).toEqual([
      "second:second",
      "separator:separator",
      "updated:updated",
    ]);
  });

  it("renders once on an unrelated parent update with inline groupBy", () => {
    let groupRenders = 0;
    const Message = () => {
      const [count, setCount] = useState(0);
      return (
        <>
          <button onClick={() => setCount(count + 1)}>update {count}</button>
          <MessagePrimitiveGroupedParts
            groupBy={(part) =>
              part.type === "tool-call" ? ["group-parts"] : []
            }
          >
            {({ part, children }) => {
              if (part.type === "group-parts") {
                groupRenders++;
                return <section data-count={count}>{children}</section>;
              }
              return null;
            }}
          </MessagePrimitiveGroupedParts>
        </>
      );
    };
    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [{ id: "message", content: [task("t1", false)] }],
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message }} />
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<App />);
    const before = groupRenders;
    fireEvent.click(view.getByRole("button", { name: "update 0" }));
    expect(groupRenders - before).toBe(1);
    expect(view.container.querySelector("section")?.dataset.count).toBe("1");
    fireEvent.click(view.getByRole("button", { name: "update 1" }));
    expect(groupRenders - before).toBe(2);
    expect(view.container.querySelector("section")?.dataset.count).toBe("2");
  });

  it("drops nested inheritance when a structural ancestor moves", () => {
    const first = { ...task("t1", false), argsText: "first" };
    const second = { ...task("t2", false), argsText: "second" };
    const separator = {
      type: "image" as const,
      image: "https://example.com/separator.png",
    };
    const prefix = { type: "text" as const, text: "prefix" };
    const view = renderIdentityGroups(
      [separator, first, second],
      groupPartByType({
        reasoning: ["group-parts", "group-leaves"],
        "tool-call": ["group-parts", "group-leaves"],
        image: ["group-parts"],
      }),
    );
    const [initialOuter] = view.groupMounts();
    view.setContent([
      prefix,
      separator,
      { type: "reasoning", text: "plan" },
      first,
      second,
    ]);
    const [outer, inner] = view.groupMounts();
    expect(outer).not.toBe(initialOuter);
    view.setContent([
      prefix,
      separator,
      { ...first, argsText: "updated" },
      second,
    ]);
    expect(view.groupMounts()[0]).toBe(outer);
    expect(view.groupMounts()[1]).not.toBe(inner);
    expect(view.values()).toEqual([
      "prefix:prefix",
      "separator:separator",
      "updated:updated",
      "second:second",
    ]);
  });

  it("reuses the grouping tree when a recreated groupBy has the same fingerprint", () => {
    let groupingCalls = 0;
    const Message = () => {
      const [count, setCount] = useState(0);
      const groupBy = Object.assign(
        () => {
          groupingCalls++;
          return ["group-parts"] as const;
        },
        { [GROUPBY_MEMO_KEY]: "group-parts" },
      );
      return (
        <>
          <button onClick={() => setCount(count + 1)}>update {count}</button>
          <MessagePrimitiveGroupedParts groupBy={groupBy}>
            {({ part, children }) =>
              part.type === "group-parts" ? (
                <section data-count={count}>{children}</section>
              ) : null
            }
          </MessagePrimitiveGroupedParts>
        </>
      );
    };
    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [{ id: "message", content: [task("t1", false)] }],
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message }} />
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<App />);
    const before = groupingCalls;
    fireEvent.click(view.getByRole("button", { name: "update 0" }));
    expect(groupingCalls).toBe(before);
    expect(view.container.querySelector("section")?.dataset.count).toBe("1");
  });

  it("drops an inherited key when the first member gains an identity", () => {
    const tool = { ...task("t1", false), argsText: "tool" };
    const reasoning = { type: "reasoning" as const, text: "plan" };
    const view = renderIdentityGroups([tool], "thought");
    const mounts = view.groupMounts();
    view.setContent([reasoning, tool]);
    expect(view.groupMounts()).toEqual(mounts);
    view.setContent([{ ...reasoning, id: "r1", text: "identified" }, tool]);
    expect(view.groupMounts()[0]).not.toBe(mounts[0]);
    expect(view.values()).toEqual(["identified:identified", "tool:tool"]);
  });

  it("gives a shared inherited key to the earlier eligible sibling", () => {
    const first = { ...task("t1", false), argsText: "first" };
    const second = { ...task("t2", false), argsText: "second" };
    const reasoning = { type: "reasoning" as const, text: "earlier" };
    const view = renderIdentityGroups([first, second], "thought");
    const [mount] = view.groupMounts();
    const content = [
      reasoning,
      first,
      { type: "text" as const, text: "separator" },
      { ...reasoning, text: "later" },
      second,
    ];
    view.setContent(content);
    const mounts = view.groupMounts();
    expect(mounts[0]).toBe(mount);
    expect(mounts[1]).not.toBe(mount);
    expect(view.values()).toEqual([
      "earlier:earlier",
      "first:first",
      "separator:separator",
      "later:later",
      "second:second",
    ]);
    view.setContent([...content]);
    expect(view.groupMounts()).toEqual(mounts);
  });

  it("keeps an earlier first-member owner ahead of a later inheriting sibling", () => {
    const first = { ...task("t1", false), argsText: "first" };
    const second = { ...task("t2", false), argsText: "second" };
    const view = renderIdentityGroups([first, second], "thought");
    const [mount] = view.groupMounts();
    view.setContent([
      first,
      { type: "text", text: "separator" },
      { type: "reasoning", text: "plan" },
      second,
    ]);
    const mounts = view.groupMounts();
    expect(mounts[0]).toBe(mount);
    expect(mounts[1]).not.toBe(mount);
    expect(view.values()).toEqual([
      "first:first",
      "separator:separator",
      "plan:plan",
      "second:second",
    ]);
  });

  it("keeps group names and part ids with key delimiters separate", () => {
    const first = {
      type: "tool-call" as const,
      toolCallId: "x-id:tool-call:y",
      toolName: "group-a",
      args: {},
      argsText: "first",
    };
    const second = {
      type: "tool-call" as const,
      toolCallId: "y",
      toolName: "group-a-id:tool-call:x",
      args: {},
      argsText: "second",
    };
    const view = renderIdentityGroups([first, second], "named-tools");
    view.setContent([
      { ...second, argsText: "second updated" },
      { ...first, argsText: "first updated" },
    ]);
    expect(view.groupMounts()).toEqual(["2", "1"]);
    expect(view.values()).toEqual([
      "second:second updated",
      "first:first updated",
    ]);
  });

  describe.each(["thought", "nested-thought"] as const)(
    "streaming %s groups",
    (grouped) => {
      it.each(["tool-call", "reasoning"] as const)(
        "keeps every wrapper and mounted state when a tool call is appended after %s",
        (firstType) => {
          const first =
            firstType === "tool-call"
              ? {
                  type: "tool-call" as const,
                  toolCallId: "t2",
                  toolName: "task",
                  args: {},
                  argsText: "draft",
                }
              : { type: "reasoning" as const, text: "draft" };
          const view = renderIdentityGroups([first], grouped);
          const mounts = view.groupMounts();
          const appended = {
            type: "tool-call" as const,
            toolCallId: "t1",
            toolName: "task",
            args: {},
            argsText: "appended",
          };
          const streamed =
            first.type === "tool-call"
              ? { ...first, argsText: "streamed" }
              : { ...first, text: "streamed" };
          view.setContent([streamed, appended]);
          expect(view.groupMounts()).toEqual(mounts);
          expect(view.values()).toEqual([
            "draft:streamed",
            "appended:appended",
          ]);
          view.setContent([
            streamed,
            { ...appended, argsText: "updated" },
            { ...appended, toolCallId: "t0", argsText: "last" },
          ]);
          expect(view.groupMounts()).toEqual(mounts);
          expect(view.values()).toEqual([
            "draft:streamed",
            "appended:updated",
            "last:last",
          ]);
        },
      );
    },
  );

  it.each(["thought", "nested-thought"] as const)(
    "keeps the %s wrappers and tool UI state when reasoning appears before text on settle",
    (grouped) => {
      const text = { type: "text" as const, text: "prefix" };
      const tool = {
        type: "tool-call" as const,
        toolCallId: "t1",
        toolName: "task",
        args: {},
        argsText: "draft",
      };
      const view = renderIdentityGroups([text, tool], grouped);
      const mounts = view.groupMounts();
      view.setContent(
        [
          { type: "reasoning", text: "earlier" },
          text,
          { ...tool, argsText: "settled" },
        ],
        false,
      );
      expect(view.groupMounts().slice(-mounts.length)).toEqual(mounts);
      expect(view.values()).toEqual([
        "earlier:earlier",
        "prefix:prefix",
        "draft:settled",
      ]);
    },
  );

  it.each(["thought", "nested-thought"] as const)(
    "keeps the %s wrappers and tool UI state when reasoning lands ahead of the tool calls",
    (grouped) => {
      const tool = (toolCallId: string, argsText: string) => ({
        type: "tool-call" as const,
        toolCallId,
        toolName: "task",
        args: {},
        argsText,
      });
      const view = renderIdentityGroups(
        [tool("t3", "first"), tool("t4", "second")],
        grouped,
      );
      const mounts = view.groupMounts();
      const reasoning = { type: "reasoning" as const, text: "plan" };
      view.setContent([
        reasoning,
        tool("t3", "first updated"),
        tool("t4", "second updated"),
      ]);
      expect(view.groupMounts()).toEqual(mounts);
      expect(view.values()).toEqual([
        "plan:plan",
        "first:first updated",
        "second:second updated",
      ]);
      view.setContent([reasoning, tool("t4", "second done")]);
      expect(view.groupMounts()).toEqual(mounts);
      expect(view.values()).toEqual(["plan:plan", "second:second done"]);
    },
  );

  it.each(["thought", "nested-thought"] as const)(
    "keeps the later %s group's first-member identity when an earlier sibling could inherit it",
    (grouped) => {
      const tool = (toolCallId: string, argsText: string) => ({
        type: "tool-call" as const,
        toolCallId,
        toolName: "task",
        args: {},
        argsText,
      });
      const view = renderIdentityGroups(
        [tool("t1", "first"), tool("t2", "second")],
        grouped,
      );
      const mounts = view.groupMounts();
      view.setContent([
        { type: "reasoning", text: "plan" },
        tool("t2", "second updated"),
        { type: "text", text: "separator" },
        tool("t1", "first updated"),
      ]);
      expect(view.groupMounts().slice(-mounts.length)).toEqual(mounts);
      expect(view.values()).toEqual([
        "plan:plan",
        "second updated:second updated",
        "separator:separator",
        "first:first updated",
      ]);
    },
  );

  it("keeps the earlier wrapper when two thought groups merge", () => {
    const tool = (toolCallId: string, argsText: string) => ({
      type: "tool-call" as const,
      toolCallId,
      toolName: "task",
      args: {},
      argsText,
    });
    const reasoning = { type: "reasoning" as const, text: "plan" };
    const view = renderIdentityGroups(
      [
        reasoning,
        tool("t1", "first"),
        { type: "text", text: "separator" },
        tool("t2", "second"),
      ],
      "thought",
    );
    const [earlier] = view.groupMounts();
    view.setContent([
      reasoning,
      tool("t1", "first updated"),
      tool("t2", "second updated"),
    ]);
    expect(view.groupMounts()).toEqual([earlier]);
    expect(view.values()).toEqual([
      "plan:plan",
      "first:first updated",
      "second updated:second updated",
    ]);
  });

  it.each([true, "nested"] as const)(
    "keys groups without identified members by sibling path with grouped=%s",
    (grouped) => {
      const parts = [
        { type: "text" as const, text: "first" },
        { type: "reasoning" as const, text: "separator" },
        { type: "text" as const, text: "second" },
      ];
      const view = renderIdentityGroups(parts, grouped);
      const mounts = view.groupMounts();
      view.setContent([{ type: "reasoning", text: "prefix" }, ...parts]);
      expect(view.groupMounts()).toEqual(
        mounts.map((mount) => String(Number(mount) + mounts.length)),
      );
    },
  );

  describe.each([false, true, "nested"] as const)(
    "grouped=%s identity",
    (grouped) => {
      it("keeps the seed while streaming and resets it for a replacement id", () => {
        const view = renderIdentityGroups(
          [{ type: "text", id: "p1", text: "old" }],
          grouped,
        );
        view.setContent([{ type: "text", id: "p1", text: "old streamed" }]);
        expect(view.values()).toEqual(["old:old streamed"]);
        view.setContent([{ type: "text", id: "p2", text: "new" }]);
        expect(view.values()).toEqual(["new:new"]);
      });

      it("keeps each seed with its id when parts swap within a stable group", () => {
        const view = renderIdentityGroups(
          [
            { type: "text", id: "anchor", text: "anchor" },
            { type: "text", id: "p1", text: "first" },
            { type: "text", id: "p2", text: "second" },
          ],
          grouped,
        );
        view.setContent([
          { type: "text", id: "anchor", text: "anchor" },
          { type: "text", id: "p2", text: "second updated" },
          { type: "text", id: "p1", text: "first updated" },
        ]);
        expect(view.values()).toEqual([
          "anchor:anchor",
          "second:second updated",
          "first:first updated",
        ]);
      });

      it("keeps every wrapper and leaf seed when later identified children swap", () => {
        const view = renderIdentityGroups(
          [
            { type: "text", id: "p1", text: "first" },
            { type: "text", id: "p2", text: "second" },
            { type: "text", id: "p3", text: "third" },
          ],
          grouped,
        );
        const groupMounts = view.groupMounts();
        view.setContent([
          { type: "text", id: "p1", text: "first updated" },
          { type: "text", id: "p3", text: "third updated" },
          { type: "text", id: "p2", text: "second updated" },
        ]);
        expect(view.groupMounts()).toEqual(groupMounts);
        expect(view.values()).toEqual([
          "first:first updated",
          "third:third updated",
          "second:second updated",
        ]);
      });

      it("mounts fresh state when anonymous text becomes an image", () => {
        const view = renderIdentityGroups(
          [{ type: "text", text: "old" }],
          grouped,
        );
        view.setContent([
          { type: "image", image: "https://example.com/new.png" },
        ]);
        expect(view.values()).toEqual(["new:new"]);
      });

      it("keys duplicate ids positionally and remounts newly unique leaves", () => {
        const view = renderIdentityGroups(
          [
            { type: "text", id: "anchor", text: "anchor" },
            { type: "text", id: "p1", text: "first" },
            { type: "text", id: "p1", text: "second" },
          ],
          grouped,
        );
        view.setContent([
          { type: "text", id: "anchor", text: "anchor" },
          { type: "text", id: "p1", text: "second moved" },
          { type: "text", id: "p1", text: "first moved" },
        ]);
        expect(view.values()).toEqual([
          "anchor:anchor",
          "first:second moved",
          "second:first moved",
        ]);
        view.setContent([
          { type: "text", id: "anchor", text: "anchor" },
          { type: "text", id: "p2", text: "new" },
          { type: "text", id: "p1", text: "second" },
        ]);
        expect(view.values()).toEqual([
          "anchor:anchor",
          "new:new",
          "second:second",
        ]);
      });
    },
  );

  it("rekeys the wrapper when its first member changes, as the first member rule documents", () => {
    const view = renderIdentityGroups(
      [
        { type: "text", id: "p1", text: "first" },
        { type: "text", id: "p2", text: "second" },
        { type: "text", id: "p3", text: "third" },
      ],
      true,
    );
    const groupMounts = view.groupMounts();
    view.setContent([
      { type: "text", id: "p2", text: "second updated" },
      { type: "text", id: "p1", text: "first updated" },
      { type: "text", id: "p3", text: "third updated" },
    ]);
    expect(view.groupMounts()).not.toEqual(groupMounts);
    expect(view.values()).toEqual([
      "second updated:second updated",
      "first updated:first updated",
      "third updated:third updated",
    ]);
  });

  it("passes status counts to a tool-name group", () => {
    let group:
      | {
          counts: MessagePrimitiveGroupedParts.GroupCounts;
          indices: readonly number[];
        }
      | undefined;

    const GroupedParts = () => (
      <MessagePrimitiveGroupedParts
        groupBy={groupPartByType({
          "tool-call:task": ["group-subagents"],
        })}
      >
        {({ part, children }) => {
          if (part.type === "group-subagents") {
            group = { counts: part.counts, indices: part.indices };
            return children;
          }
          return null;
        }}
      </MessagePrimitiveGroupedParts>
    );

    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [
          {
            id: "assistant-1",
            content: [
              task("task-1", true),
              task("task-2", true),
              task("task-3", false),
            ],
          },
        ],
        isRunning: true,
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message: GroupedParts }} />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    expect(group?.counts).toEqual({
      running: 1,
      complete: 2,
      incomplete: 0,
      requiresAction: 0,
    });
    expect(group?.indices).toHaveLength(3);
  });

  it("renders registered tool UIs when the render function returns null", () => {
    const GroupedParts = () => (
      <>
        <RegisterNamedTool />
        <MessagePrimitiveGroupedParts groupBy={groupPartByType({})}>
          {() => null}
        </MessagePrimitiveGroupedParts>
      </>
    );

    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [{ id: "assistant-1", content: [task("task-1", true)] }],
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message: GroupedParts }} />
        </AssistantRuntimeProvider>
      );
    };

    expect(render(<App />).container.innerHTML).toContain("named");
  });

  it("renders a registered data UI when the render function returns null", () => {
    const GroupedParts = () => (
      <>
        <RegisterNamedData />
        <MessagePrimitiveGroupedParts groupBy={groupPartByType({})}>
          {() => null}
        </MessagePrimitiveGroupedParts>
      </>
    );

    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [
          {
            id: "assistant-1",
            content: [
              { type: "data", name: "status", data: { value: "named" } },
            ],
          },
        ],
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message: GroupedParts }} />
        </AssistantRuntimeProvider>
      );
    };

    expect(render(<App />).container.innerHTML).toContain("named");
  });

  it("does not render registered UIs when a leaf returns an empty fragment", () => {
    const GroupedParts = () => (
      <>
        <RegisterNamedTool />
        <MessagePrimitiveGroupedParts groupBy={groupPartByType({})}>
          {() => <></>}
        </MessagePrimitiveGroupedParts>
      </>
    );

    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [{ id: "assistant-1", content: [task("task-1", true)] }],
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message: GroupedParts }} />
        </AssistantRuntimeProvider>
      );
    };

    expect(render(<App />).container.innerHTML).not.toContain("named");
  });

  it("renders the fallback data UI for an unregistered data part", () => {
    const GroupedParts = () => (
      <>
        <RegisterFallbackData />
        <MessagePrimitiveGroupedParts groupBy={groupPartByType({})}>
          {() => null}
        </MessagePrimitiveGroupedParts>
      </>
    );

    const App = () => {
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [
          {
            id: "assistant-1",
            content: [
              { type: "data", name: "unknown", data: { value: "fallback" } },
            ],
          },
        ],
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={{ Message: GroupedParts }} />
        </AssistantRuntimeProvider>
      );
    };

    expect(render(<App />).container.innerHTML).toContain("fallback");
  });
});
