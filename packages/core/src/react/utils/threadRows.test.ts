import { describe, expect, it } from "vitest";
import type { AssistantState } from "@assistant-ui/store";
import type { MessageState } from "../../store/scopes/message";
import { groupPartByType } from "./groupParts";
import { createThreadRowsSelector, type ThreadRow } from "./threadRows";

type Part = { type: string; text?: string; toolCallId?: string; id?: string };

const message = (
  id: string,
  role: "user" | "assistant" | "system",
  parts: readonly Part[] = [{ type: "text", text: id }],
  extra: { isEditing?: boolean } = {},
) =>
  ({
    id,
    role,
    parts: parts.map((part) => ({ status: { type: "complete" }, ...part })),
    content: parts,
    status: { type: "complete", reason: "stop" },
    createdAt: new Date(0),
    metadata: { custom: {} },
    composer: { isEditing: extra.isEditing ?? false },
  }) as unknown as MessageState;

const state = (messages: readonly MessageState[], toolUIs?: object) =>
  ({
    thread: { messages },
    optional: toolUIs ? { tools: { toolUIs } } : {},
  }) as unknown as AssistantState;

const summary = (rows: readonly ThreadRow[]) =>
  rows.map((row) =>
    row.type === "part"
      ? `${row.messageId}:${row.group ?? "part"}[${row.indices.join(",")}]`
      : `${row.messageId}:${row.type}`,
  );

const assistant = message("a1", "assistant", [
  { type: "reasoning", text: "think" },
  { type: "reasoning", text: "more" },
  { type: "text", text: "answer" },
  { type: "tool-call", toolCallId: "t1" },
  { type: "tool-call", toolCallId: "t2" },
]);

describe("createThreadRowsSelector", () => {
  it("flattens messages into message, part and turn-end rows", () => {
    const select = createThreadRowsSelector({
      groupBy: groupPartByType({ reasoning: ["group-reasoning"] }),
    });

    expect(summary(select(state([message("u1", "user"), assistant])))).toEqual([
      "u1:message",
      "a1:group-reasoning[0,1]",
      "a1:part[2]",
      "a1:part[3]",
      "a1:part[4]",
      "a1:turn-end",
    ]);
  });

  it("gives every part its own row without groupBy", () => {
    const select = createThreadRowsSelector();

    expect(summary(select(state([assistant])))).toEqual([
      "a1:part[0]",
      "a1:part[1]",
      "a1:part[2]",
      "a1:part[3]",
      "a1:part[4]",
      "a1:turn-end",
    ]);
  });

  it("closes a turn after its last reply and keys rows by stable ids", () => {
    const select = createThreadRowsSelector();
    const rows = select(
      state([
        message("u1", "user"),
        message("a1", "assistant"),
        message("a2", "assistant"),
        message("u2", "user"),
      ]),
    );

    expect(rows.map((row) => row.key)).toEqual([
      "message:u1",
      "part:a1:text@0",
      "part:a2:text@0",
      "turn-end:u1",
      "message:u2",
    ]);
    expect(rows.find((row) => row.type === "turn-end")).toMatchObject({
      messageId: "a2",
      turnMessageId: "u1",
    });
  });

  it("renders an edited assistant message as one row and an empty one as only its turn end", () => {
    const select = createThreadRowsSelector();

    expect(
      summary(
        select(
          state([
            message("u1", "user"),
            message("a1", "assistant", undefined, { isEditing: true }),
            message("u2", "user"),
            message("a2", "assistant", []),
          ]),
        ),
      ),
    ).toEqual([
      "u1:message",
      "a1:message",
      "a1:turn-end",
      "u2:message",
      "a2:turn-end",
    ]);
  });

  it("keeps the array while a streamed token leaves the structure unchanged", () => {
    const select = createThreadRowsSelector();
    const first = select(
      state([message("u1", "user"), message("a1", "assistant")]),
    );
    const streamed = select(
      state([
        message("u1", "user"),
        message("a1", "assistant", [{ type: "text", text: "a1 more" }]),
      ]),
    );

    expect(streamed).toBe(first);
  });

  it("reuses unchanged rows when parts arrive or earlier messages are prepended", () => {
    const select = createThreadRowsSelector();
    const first = select(
      state([message("u2", "user"), message("a2", "assistant")]),
    );
    const grown = select(
      state([
        message("u2", "user"),
        message("a2", "assistant", [
          { type: "text", text: "a2" },
          { type: "tool-call", toolCallId: "t1" },
        ]),
      ]),
    );
    expect(grown).not.toBe(first);
    expect(grown[0]).toBe(first[0]);
    expect(grown[1]).toBe(first[1]);

    const prepended = select(
      state([
        message("u1", "user"),
        message("a1", "assistant"),
        message("u2", "user"),
        message("a2", "assistant", [
          { type: "text", text: "a2" },
          { type: "tool-call", toolCallId: "t1" },
        ]),
      ]),
    );
    expect(prepended.slice(3)).toEqual(grown);
    expect(prepended[3]).toBe(grown[0]);
    expect(prepended.at(-1)).toBe(grown.at(-1));
  });

  it("returns the same rows for the same state when threads interleave", () => {
    const select = createThreadRowsSelector();
    const threadA = state([message("u1", "user"), message("a1", "assistant")]);
    const threadB = state([message("u9", "user")]);

    const a = select(threadA);
    const b = select(threadB);
    expect(select(threadA)).toBe(a);
    expect(select(threadB)).toBe(b);
  });

  it("groups by the tool UI registry when one is present", () => {
    const select = createThreadRowsSelector({
      groupBy: groupPartByType({
        "tool-call": ["group-tool"],
        "standalone-tool-call": [],
      }),
    });
    const tools = message("a1", "assistant", [
      { type: "tool-call", toolCallId: "t1" },
      { type: "tool-call", toolCallId: "t2" },
    ]);

    expect(summary(select(state([tools])))).toEqual([
      "a1:group-tool[0,1]",
      "a1:turn-end",
    ]);
  });
});
