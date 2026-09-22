// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { groupPartByType } from "../../utils/groupParts";
import { useAssistantToolUI } from "../../model-context/useAssistantToolUI";
import { MessagePrimitiveGroupedParts } from "./MessageGroupedParts";

const NamedTool = () => <b>named</b>;
const RegisterNamedTool = () => {
  useAssistantToolUI({ toolName: "task", render: NamedTool });
  return null;
};

type Msg = {
  id: string;
  content: readonly {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args: {};
    result?: { ok: true };
  }[];
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

afterEach(cleanup);

describe("MessagePrimitive.GroupedParts", () => {
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
});
