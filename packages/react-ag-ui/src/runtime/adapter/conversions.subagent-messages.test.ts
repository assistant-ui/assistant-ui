import { describe, expect, it } from "vitest";
import { fromAgUiMessages, fromAgUiSnapshotMessages } from "./conversions";

type Part = {
  type: string;
  toolCallId?: string;
  text?: string;
  result?: unknown;
  messages?: Message[];
};
type Message = { id?: string; role: string; content: string | Part[] };

const call = (id: string, name = "research") => ({
  id,
  type: "function",
  function: { name, arguments: "{}" },
});

const toolCalls = (message: Message | undefined) =>
  Array.isArray(message?.content)
    ? message.content.filter((part) => part.type === "tool-call")
    : [];

const findCall = (messages: readonly Message[], toolCallId: string) =>
  messages
    .flatMap((message) => toolCalls(message))
    .find((part) => part.toolCallId === toolCallId);

const texts = (message: Message | undefined) =>
  Array.isArray(message?.content)
    ? message.content.flatMap((part) =>
        part.type === "text" ? [part.text] : [],
      )
    : [message?.content];

const subagentTurn = [
  { id: "u1", role: "user", content: "weather?" },
  { id: "a1", role: "assistant", content: "", toolCalls: [call("spawn-1")] },
  {
    id: "s1",
    role: "assistant",
    content: "",
    toolCalls: [call("spawn-1::inner-1", "lookup")],
    subagentRunId: "spawn-1",
  },
  {
    id: "s1-result",
    role: "tool",
    toolCallId: "spawn-1::inner-1",
    content: '"sunny"',
    subagentRunId: "spawn-1",
  },
  {
    id: "s2",
    role: "assistant",
    content: "Paris is sunny.",
    subagentRunId: "spawn-1",
  },
  {
    id: "t1",
    role: "tool",
    toolCallId: "spawn-1",
    content: '"Paris is sunny."',
  },
  { id: "a2", role: "assistant", content: "It is sunny." },
];

const announced = (messages: readonly unknown[], parents: [string, string][]) =>
  fromAgUiSnapshotMessages(messages, undefined, new Map(parents)) as Message[];

describe("fromAgUiSnapshotMessages subagent attribution", () => {
  it.each([
    ["snake case", { tool_calls: [call("spawn")] }],
    [
      "inline",
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "spawn",
            toolName: "research",
            args: {},
          },
        ],
      },
    ],
  ])("nests a run spawned by a %s call", (_name, shape) => {
    const converted = announced(
      [
        { id: "a", role: "assistant", content: "", ...shape },
        {
          id: "s",
          role: "assistant",
          content: "Nested.",
          subagentRunId: "run",
        },
      ],
      [["run", "spawn"]],
    );
    expect(converted.map((message) => message.id)).toEqual(["a"]);
    expect(texts(findCall(converted, "spawn")?.messages?.[0])).toEqual([
      "Nested.",
    ]);
  });

  it.each(["user", "system", "developer"])(
    "preserves a tagged %s record",
    (role) => {
      const converted = announced(
        [
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn")],
          },
          { id: "tagged", role, content: "Keep me.", subagentRunId: "run" },
          {
            id: "s",
            role: "assistant",
            content: "Nested.",
            subagentRunId: "run",
          },
        ],
        [["run", "spawn"]],
      );
      expect(converted.find((message) => message.id === "tagged")).toEqual(
        fromAgUiMessages([{ id: "tagged", role, content: "Keep me." }])[0],
      );
    },
  );
  it("nests a subagent's messages under the tool call that spawned it", () => {
    const converted = announced(subagentTurn, [["spawn-1", "spawn-1"]]);

    expect(converted.map((message) => message.id)).toEqual(["u1", "a1", "a2"]);
    const spawn = findCall(converted, "spawn-1");
    expect(spawn?.result).toBe("Paris is sunny.");
    expect(spawn?.messages).toHaveLength(1);

    const [nested] = spawn!.messages!;
    expect(nested).toMatchObject({ id: "spawn-1", role: "assistant" });
    const inner = findCall([nested!], "spawn-1::inner-1");
    expect(inner?.result).toBe("sunny");
    expect(texts(nested)).toContain("Paris is sunny.");
  });

  it("uses the announced spawning call when the run id names no tool call", () => {
    const converted = fromAgUiSnapshotMessages(
      [
        {
          id: "a1",
          role: "assistant",
          content: "",
          toolCalls: [call("call-9")],
        },
        {
          id: "s1",
          role: "assistant",
          content: "Done.",
          subagentRunId: "run-x",
        },
        { id: "t1", role: "tool", toolCallId: "call-9", content: '"ok"' },
      ],
      undefined,
      new Map([["run-x", "call-9"]]),
    ) as Message[];

    expect(converted.map((message) => message.id)).toEqual(["a1"]);
    const [nested] = findCall(converted, "call-9")!.messages!;
    expect(nested?.id).toBe("run-x");
    expect(texts(nested)).toEqual(["Done."]);
  });

  it("nests a subagent of a subagent inside its parent's transcript", () => {
    const converted = announced(
      [
        { id: "a1", role: "assistant", content: "", toolCalls: [call("top")] },
        {
          id: "m1",
          role: "assistant",
          content: "",
          toolCalls: [call("top::mid", "leaf")],
          subagentRunId: "top",
        },
        {
          id: "l1",
          role: "assistant",
          content: "Leaf done.",
          subagentRunId: "top::mid",
        },
        {
          id: "m-r",
          role: "tool",
          toolCallId: "top::mid",
          content: '"leaf"',
          subagentRunId: "top",
        },
        { id: "t1", role: "tool", toolCallId: "top", content: '"mid"' },
      ],
      [
        ["top", "top"],
        ["top::mid", "top::mid"],
      ],
    );

    expect(converted.map((message) => message.id)).toEqual(["a1"]);
    const [middle] = findCall(converted, "top")!.messages!;
    const leafCall = findCall([middle!], "top::mid");
    expect(leafCall?.result).toBe("leaf");
    const [leaf] = leafCall!.messages!;
    expect(leaf?.id).toBe("top::mid");
    expect(texts(leaf)).toEqual(["Leaf done."]);
  });

  it("keeps an untagged result with the nested call it answers", () => {
    const converted = announced(
      [
        {
          id: "a1",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn")],
        },
        {
          id: "s1",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn::frontend", "confirm")],
          subagentRunId: "spawn",
        },
        {
          id: "r1",
          role: "tool",
          toolCallId: "spawn::frontend",
          content: '"yes"',
        },
      ],
      [["spawn", "spawn"]],
    );

    expect(converted.map((message) => message.id)).toEqual(["a1"]);
    const [nested] = findCall(converted, "spawn")!.messages!;
    expect(findCall([nested!], "spawn::frontend")?.result).toBe("yes");
  });

  it("leaves a subagent with no reachable spawning call in the parent thread", () => {
    const converted = announced(
      [
        { id: "u1", role: "user", content: "hi" },
        {
          id: "s1",
          role: "assistant",
          content: "Orphan.",
          subagentRunId: "unknown-run",
        },
        {
          id: "c1",
          role: "assistant",
          content: "",
          toolCalls: [call("a")],
          subagentRunId: "b",
        },
        {
          id: "c2",
          role: "assistant",
          content: "",
          toolCalls: [call("b")],
          subagentRunId: "a",
        },
      ],
      [
        ["unknown-run", "missing"],
        ["a", "a"],
        ["b", "b"],
      ],
    );

    expect(converted.map((message) => message.id)).toEqual([
      "u1",
      "s1",
      "c1",
      "c2",
    ]);
    expect(findCall(converted, "a")?.messages).toBeUndefined();
    expect(findCall(converted, "b")?.messages).toBeUndefined();
  });

  it("leaves a run that was never announced in the parent thread", () => {
    const converted = announced(subagentTurn, []);

    expect(converted.map((message) => message.id)).toEqual(
      fromAgUiMessages(subagentTurn).map((message) => message.id),
    );
    expect(findCall(converted, "spawn-1")?.messages).toBeUndefined();
  });

  it("does not change what fromAgUiMessages returns for attributed history", () => {
    const converted = fromAgUiMessages(subagentTurn) as Message[];

    expect(converted.map((message) => message.id)).toEqual([
      "u1",
      "a1",
      "s1",
      "s2",
      "a2",
    ]);
    expect(findCall(converted, "spawn-1")?.messages).toBeUndefined();
  });

  it("gives a nested run waiting on a call the requires-action status, and its spawning message too", () => {
    const converted = announced(
      [
        {
          id: "a1",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn")],
        },
        { id: "t1", role: "tool", toolCallId: "spawn", content: '"ok"' },
        {
          id: "s1",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn::n1", "search")],
          subagentRunId: "spawn",
        },
      ],
      [["spawn", "spawn"]],
    ) as (Message & { status?: { type: string } })[];

    const [nested] = findCall(converted, "spawn")!.messages! as (Message & {
      status?: { type: string };
    })[];
    expect(nested?.status?.type).toBe("requires-action");
    expect(converted[0]?.status?.type).toBe("requires-action");
  });

  it("admits a nested pending call despite the spawning message's own pending list", () => {
    const converted = announced(
      [
        {
          id: "a",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn")],
          metadata: { custom: { agui: { pendingToolCallIds: ["spawn"] } } },
        },
        { id: "t", role: "tool", toolCallId: "spawn", content: '"ok"' },
        {
          id: "s",
          role: "assistant",
          content: "",
          toolCalls: [call("inner")],
          subagentRunId: "run",
          metadata: { custom: { agui: { pendingToolCallIds: ["inner"] } } },
        },
      ],
      [["run", "spawn"]],
    ) as (Message & {
      metadata?: { custom?: { agui?: { pendingToolCallIds?: string[] } } };
    })[];
    expect(converted[0]?.metadata?.custom?.agui?.pendingToolCallIds).toContain(
      "inner",
    );
  });

  it("retains each nested record's pending-call admission", () => {
    const converted = announced(
      [
        { id: "a", role: "assistant", content: "", toolCalls: [call("spawn")] },
        { id: "t", role: "tool", toolCallId: "spawn", content: '"ok"' },
        {
          id: "s1",
          role: "assistant",
          content: "",
          toolCalls: [call("one"), call("excluded")],
          subagentRunId: "run",
          metadata: {
            custom: { agui: { pendingToolCallIds: ["one", "future"] } },
          },
        },
        {
          id: "s2",
          role: "assistant",
          content: "",
          toolCalls: [call("two")],
          subagentRunId: "run",
          metadata: { custom: { agui: { pendingToolCallIds: ["two"] } } },
        },
      ],
      [["run", "spawn"]],
    ) as (Message & {
      metadata?: { custom?: { agui?: { pendingToolCallIds?: string[] } } };
    })[];
    const nested = findCall(converted, "spawn")?.messages?.[0] as Message & {
      metadata?: { custom?: { agui?: { pendingToolCallIds?: string[] } } };
    };
    expect(nested.metadata?.custom?.agui?.pendingToolCallIds).toEqual([
      "one",
      "future",
      "two",
    ]);
    expect(converted[0]?.metadata?.custom?.agui?.pendingToolCallIds).toEqual([
      "one",
      "future",
      "two",
    ]);
  });

  it("keeps a deeply nested pending call visible through resolved spawning calls", () => {
    const messages = [
      { id: "a1", role: "assistant", content: "", toolCalls: [call("top")] },
      { id: "t1", role: "tool", toolCallId: "top", content: '"ok"' },
      {
        id: "m1",
        role: "assistant",
        content: "",
        toolCalls: [call("top::mid")],
        subagentRunId: "top",
      },
      {
        id: "m-result",
        role: "tool",
        toolCallId: "top::mid",
        content: '"ok"',
        subagentRunId: "top",
      },
      {
        id: "l1",
        role: "assistant",
        content: "",
        toolCalls: [call("top::mid::leaf", "confirm")],
        subagentRunId: "top::mid",
      },
    ];
    const parents: [string, string][] = [
      ["top", "top"],
      ["top::mid", "top::mid"],
    ];
    const converted = announced(messages, parents);

    const [middle] = findCall(converted, "top")!.messages!;
    const [leaf] = findCall([middle!], "top::mid")!.messages!;
    expect(leaf).toMatchObject({ status: { type: "requires-action" } });
    expect(middle).toMatchObject({ status: { type: "requires-action" } });
    expect(converted[0]).toMatchObject({
      status: { type: "requires-action" },
    });

    const resolved = announced(
      [
        ...messages,
        {
          id: "l-result",
          role: "tool",
          toolCallId: "top::mid::leaf",
          content: '"confirmed"',
          subagentRunId: "top::mid",
        },
      ],
      parents,
    );
    const [resolvedMiddle] = findCall(resolved, "top")!.messages!;
    const [resolvedLeaf] = findCall([resolvedMiddle!], "top::mid")!.messages!;
    expect(resolvedLeaf).toMatchObject({ status: { type: "complete" } });
    expect(resolvedMiddle).toMatchObject({ status: { type: "complete" } });
    expect(resolved[0]).not.toHaveProperty("status");
  });

  it("surfaces a nested run's open interrupt on its spawning message", () => {
    const converted = announced(
      [
        {
          id: "a1",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn")],
        },
        { id: "t1", role: "tool", toolCallId: "spawn", content: '"ok"' },
        {
          id: "s1",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn::n1", "delete_file")],
          subagentRunId: "spawn",
          metadata: {
            custom: {
              agui: {
                interrupts: [
                  { id: "int-1", reason: "tool_call", toolCallId: "spawn::n1" },
                ],
              },
            },
          },
        },
      ],
      [["spawn", "spawn"]],
    ) as (Message & {
      status?: { type: string; reason?: string };
      metadata?: { custom?: { agui?: { interrupts?: { id: string }[] } } };
    })[];

    expect(converted[0]?.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(
      converted[0]?.metadata?.custom?.agui?.interrupts?.map(
        (interrupt) => interrupt.id,
      ),
    ).toEqual(["int-1"]);
  });
  it("keeps tagged reasoning and activity with their run", () => {
    const converted = fromAgUiSnapshotMessages(
      [
        { id: "a1", role: "assistant", content: "", toolCalls: [call("top")] },
        { id: "t1", role: "tool", toolCallId: "top", content: '"ok"' },
        {
          id: "r1",
          role: "reasoning",
          content: "sub thought",
          subagentRunId: "top",
        },
        {
          id: "act1",
          role: "activity",
          activityType: "progress",
          content: { step: 1 },
          subagentRunId: "top",
        },
        {
          id: "m1",
          role: "assistant",
          content: "sub answer",
          subagentRunId: "top",
        },
        { id: "a2", role: "assistant", content: "parent answer" },
      ],
      { showThinking: true },
      new Map([["top", "top"]]),
    ) as Message[];

    expect(JSON.stringify(converted.at(-1))).not.toContain("sub thought");
    const [nested] = findCall(converted, "top")!.messages!;
    expect(JSON.stringify(nested)).toContain("sub thought");
    expect(JSON.stringify(nested)).toContain("sub answer");
    expect(JSON.stringify(converted.at(-1))).not.toContain('"step":1');
    expect(JSON.stringify(nested)).toContain('"step":1');
  });
});
