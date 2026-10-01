// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { useEffect, useState } from "react";
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
  grouped: boolean,
) => {
  const Message = () => (
    <MessagePrimitiveGroupedParts
      groupBy={groupPartByType(
        grouped
          ? {
              text: ["group-parts"],
              image: ["group-parts"],
            }
          : {},
      )}
    >
      {({ part, children }) => {
        if (part.type === "group-parts") return <section>{children}</section>;
        if (part.type === "text") return <StateProbe text={part.text} />;
        if (part.type === "image")
          return (
            <StateProbe text={part.image.split("/").pop()!.split(".")[0]!} />
          );
        return null;
      }}
    </MessagePrimitiveGroupedParts>
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

describe("MessagePrimitive.GroupedParts", () => {
  describe.each([false, true])("grouped=%s identity", (grouped) => {
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

    it("renders duplicate ids and resets a replaced leaf in a stable group", () => {
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
        { type: "text", id: "p2", text: "new" },
        { type: "text", id: "p1", text: "second" },
      ]);
      expect(view.values()).toEqual([
        "anchor:anchor",
        "new:new",
        "first:second",
      ]);
    });
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
