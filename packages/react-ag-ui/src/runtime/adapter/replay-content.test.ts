import { describe, expect, it } from "vitest";
import type {
  ThreadAssistantMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  createReplayContentMerger,
  preserveToolResult,
} from "./replay-content";

const call = (
  id: string,
  extra: Partial<ToolCallMessagePart> = {},
): ToolCallMessagePart => ({
  type: "tool-call",
  toolCallId: id,
  toolName: "lookup",
  args: {},
  argsText: "{}",
  ...extra,
});

const assistant = (
  id: string,
  content: ThreadAssistantMessage["content"],
): ThreadAssistantMessage => ({
  id,
  role: "assistant",
  createdAt: new Date(0),
  status: { type: "requires-action", reason: "tool-calls" },
  content,
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

describe("live replay content", () => {
  it("keeps a locally supplied falsy result and its details until a fresh result arrives", () => {
    const prior = call("tool", {
      result: 0,
      artifact: null,
      isError: false,
      modelContent: [],
    });
    expect(preserveToolResult(prior, call("tool"))).toMatchObject({
      result: 0,
      artifact: null,
      isError: false,
      modelContent: [],
    });
    expect(
      preserveToolResult(prior, call("tool", { result: "fresh" })),
    ).toMatchObject({
      result: "fresh",
    });
  });

  it("updates a flattened child in its nested owner while retaining unreplayed children", () => {
    const mergeReplayContent = createReplayContentMerger();
    const previous = [
      call("root", {
        messages: [
          assistant("sub", [
            call("child", { args: { old: true }, argsText: '{"old":true}' }),
            call("pending"),
          ]),
        ],
      }),
    ];
    const next = [
      call("root", {
        messages: [
          {
            ...assistant("sub", [{ type: "text", text: "fresh output" }]),
            status: { type: "complete", reason: "stop" } as const,
          },
        ],
      }),
      call("child", {
        args: { fresh: true },
        argsText: '{"fresh":true}',
        result: "ok",
      }),
    ];

    const merged = mergeReplayContent(previous, next);
    expect(merged).toHaveLength(1);
    const root = merged[0] as ToolCallMessagePart;
    const sub = root.messages?.[0] as ThreadAssistantMessage;
    expect(sub.status).toEqual({ type: "complete", reason: "stop" });
    expect(sub.content).toEqual([
      expect.objectContaining({
        toolCallId: "child",
        args: { fresh: true },
        result: "ok",
      }),
      expect.objectContaining({ toolCallId: "pending" }),
      { type: "text", text: "fresh output" },
    ]);
  });

  it("uses incoming part and nested message order while retaining an unreplayed child", () => {
    const mergeReplayContent = createReplayContentMerger();
    const previous = [
      call("root", {
        messages: [
          assistant("first", [call("pending")]),
          assistant("second", [{ type: "text", text: "old" }]),
        ],
      }),
    ];
    const next = [
      { type: "text" as const, text: "fresh introduction" },
      call("root", {
        messages: [
          assistant("second", [{ type: "text", text: "fresh second" }]),
          assistant("first", [{ type: "text", text: "fresh first" }]),
        ],
      }),
    ];

    const merged = mergeReplayContent(previous, next);
    expect(merged[0]).toEqual({ type: "text", text: "fresh introduction" });
    const root = merged[1] as ToolCallMessagePart;
    expect(root.messages?.map((message) => message.id)).toEqual([
      "second",
      "first",
    ]);
    expect((root.messages?.[1] as ThreadAssistantMessage).content).toEqual([
      expect.objectContaining({ toolCallId: "pending" }),
      { type: "text", text: "fresh first" },
    ]);
  });
  it("transfers a completed flat call into its incoming nested owner without retaining a duplicate", () => {
    const mergeReplayContent = createReplayContentMerger();
    const interactions = {
      entries: [
        { type: "action" as const, occurredAt: 1, payload: { approved: true } },
      ],
    };
    const merged = mergeReplayContent(
      [call("child", { result: 0, unstable_interactions: interactions })],
      [
        call("parent", {
          messages: [
            assistant("sub", [
              call("child", {
                args: { fresh: true },
                argsText: '{"fresh":true}',
              }),
            ]),
          ],
        }),
      ],
    );
    expect(merged).toHaveLength(1);
    const parent = merged[0] as ToolCallMessagePart;
    expect(parent.toolCallId).toBe("parent");
    expect((parent.messages?.[0] as ThreadAssistantMessage).content).toEqual([
      expect.objectContaining({
        toolCallId: "child",
        result: 0,
        args: { fresh: true },
        unstable_interactions: interactions,
      }),
    ]);
  });

  it("removes a replay-owned tool after an unrelated content update", () => {
    const merge = createReplayContentMerger();
    const historical = call("historical", { result: "saved" });
    const surface = call("a2ui:surface");
    const first = merge([historical], [surface]);
    expect(
      first.map((part) => part.type === "tool-call" && part.toolCallId),
    ).toEqual(["historical", "a2ui:surface"]);

    const second = merge(first, [{ type: "text", text: "continued" }]);
    expect(second).toEqual([historical, { type: "text", text: "continued" }]);
  });

  it("retains a local tool result until the replay explicitly removes its call", () => {
    const merge = createReplayContentMerger();
    const updated = merge([call("child", { result: 0 })], [call("child")]);
    expect(updated).toEqual([expect.objectContaining({ result: 0 })]);
    expect(merge(updated, [])).toEqual([]);
  });

  it("keeps a removed parent only while its incoming flattened child needs it", () => {
    const merge = createReplayContentMerger();
    const parent = call("parent", {
      messages: [assistant("sub", [call("child")])],
    });
    const first = merge([], [parent]);
    const second = merge(first, [call("child", { result: "done" })]);
    expect(second).toHaveLength(1);
    expect((second[0] as ToolCallMessagePart).messages?.[0]).toMatchObject({
      content: [
        expect.objectContaining({ toolCallId: "child", result: "done" }),
      ],
    });
    expect(merge(second, [])).toEqual([]);
  });

  it("scopes matching nested message identities to their tool container", () => {
    const merge = createReplayContentMerger();
    const first = merge(
      [],
      [
        call("left", {
          messages: [assistant("same", [{ type: "text", text: "left" }])],
        }),
      ],
    );
    const second = merge(first, [
      call("right", {
        messages: [assistant("same", [{ type: "text", text: "right" }])],
      }),
    ]);
    expect(second).toEqual([
      expect.objectContaining({
        toolCallId: "right",
        messages: [
          expect.objectContaining({
            content: [{ type: "text", text: "right" }],
          }),
        ],
      }),
    ]);
  });
});
