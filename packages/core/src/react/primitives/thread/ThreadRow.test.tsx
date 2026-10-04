// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useState, type FC } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { groupPartByType } from "../../utils/groupParts";
import {
  createThreadRowsSelector,
  type ThreadRow,
} from "../../utils/threadRows";
import { ThreadPrimitiveRow } from "./ThreadRow";

afterEach(cleanup);

const conversation: ThreadMessageLike[] = [
  {
    id: "u1",
    role: "user",
    createdAt: new Date(1_000),
    content: [{ type: "text", text: "question" }],
  },
  {
    id: "a1",
    role: "assistant",
    createdAt: new Date(2_000),
    status: { type: "complete", reason: "stop" },
    content: [
      {
        type: "reasoning",
        text: "first thought",
        timing: { startedAt: 2_000, completedAt: 3_000 },
      },
      {
        type: "reasoning",
        text: "second thought",
        timing: { startedAt: 3_000, completedAt: 5_000 },
      },
      { type: "text", text: "answer" },
      {
        type: "tool-call",
        toolCallId: "t1",
        toolName: "search",
        args: {},
        result: "ok",
        timing: { startedAt: 6_000, completedAt: 9_000 },
      },
    ],
  },
];

const renderRow: ThreadPrimitiveRow.Props["children"] = (info) => {
  switch (info.type) {
    case "message":
      return <p data-testid="message">{info.message.role}</p>;
    case "turn-end":
      return (
        <footer data-testid="turn-end">
          {`${info.turn?.startedAt}-${info.turn?.completedAt ?? "running"}`}
        </footer>
      );
    case "part": {
      const { part } = info;
      if (part.type === "group-reasoning")
        return <section data-testid="reasoning-group">{info.children}</section>;
      if (part.type === "reasoning")
        return <span data-testid="reasoning">{part.text}</span>;
      if (part.type === "text")
        return <span data-testid="text">{part.text}</span>;
      if (part.type === "tool-call")
        return <span data-testid="tool">{part.toolName}</span>;
      return null;
    }
  }
};

const selectRows = createThreadRowsSelector({
  groupBy: groupPartByType({ reasoning: ["group-reasoning"] }),
});

const Rows: FC<{
  pick?: (rows: readonly ThreadRow[]) => readonly ThreadRow[];
}> = ({ pick = (rows) => rows }) => {
  const rows = useAuiState(selectRows);
  return (
    <>
      {pick(rows).map((row) => (
        <ThreadPrimitiveRow key={row.key} row={row}>
          {renderRow}
        </ThreadPrimitiveRow>
      ))}
    </>
  );
};

const Thread: FC<{
  messages?: readonly ThreadMessageLike[];
  pick?: (rows: readonly ThreadRow[]) => readonly ThreadRow[];
}> = ({ messages = conversation, pick }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Rows {...(pick && { pick })} />
    </AssistantRuntimeProvider>
  );
};

describe("ThreadPrimitive.Row", () => {
  it("renders each row through the grouped parts contract and closes the turn with its span", () => {
    render(<Thread />);

    expect(screen.getByTestId("message").textContent).toBe("user");
    expect(
      screen.getAllByTestId("reasoning").map((element) => element.textContent),
    ).toEqual(["first thought", "second thought"]);
    expect(
      screen.getByTestId("reasoning-group").querySelectorAll("span"),
    ).toHaveLength(2);
    expect(screen.getByTestId("text").textContent).toBe("answer");
    expect(screen.getByTestId("tool").textContent).toBe("search");
    expect(screen.getByTestId("turn-end").textContent).toBe("1000-9000");
  });

  it("mounts only the parts of the row it renders", () => {
    render(
      <Thread
        pick={(rows) => rows.filter((row) => row.key === "part:a1:text@2")}
      />,
    );

    expect(screen.getByTestId("text").textContent).toBe("answer");
    expect(screen.queryByTestId("reasoning")).toBeNull();
    expect(screen.queryByTestId("tool")).toBeNull();
    expect(screen.queryByTestId("message")).toBeNull();
  });

  it("leaves a turn open while its reply runs", () => {
    const running: ThreadMessageLike[] = [
      conversation[0]!,
      {
        ...conversation[1]!,
        status: { type: "running" },
      },
    ];
    render(
      <Thread
        messages={running}
        pick={(rows) => rows.filter((row) => row.type === "turn-end")}
      />,
    );

    expect(screen.getByTestId("turn-end").textContent).toBe("1000-running");
  });

  it("renders nothing for a row whose message left the thread", () => {
    const Stale: FC = () => {
      const [row] = useState<ThreadRow>({
        type: "message",
        key: "message:gone",
        messageId: "gone",
        turnMessageId: "gone",
      });
      return <ThreadPrimitiveRow row={row}>{renderRow}</ThreadPrimitiveRow>;
    };
    const StaleThread: FC = () => {
      const runtime = useExternalStoreRuntime({
        messages: conversation,
        convertMessage: (message: ThreadMessageLike) => message,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Stale />
        </AssistantRuntimeProvider>
      );
    };

    render(<StaleThread />);
    expect(screen.queryByTestId("message")).toBeNull();
  });
});
