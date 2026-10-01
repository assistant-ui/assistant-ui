// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { groupPartByType } from "../../utils/groupParts";
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
): Msg["content"][number] => ({
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
  grouped: boolean | "nested" | "thought" | "nested-thought" | "named-tools",
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
        grouped === "named-tools"
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
