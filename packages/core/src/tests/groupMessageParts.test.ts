import { describe, expect, it } from "vitest";
import { groupMessageParts } from "../react/primitives/message/MessageParts";

describe("groupMessageParts idKey", () => {
  it("ignores positional keys when selecting the smallest identity in a mixed group", () => {
    const ranges = groupMessageParts(
      ["reasoning", "tool-call", "reasoning"],
      true,
      ["reasoning@0", "tool-call:a", "reasoning:z"],
    );
    expect(ranges).toEqual([
      {
        type: "chainOfThoughtGroup",
        startIndex: 0,
        endIndex: 2,
        idKey: "id:reasoning:z",
      },
    ]);
  });

  it("leaves groups with only positional keys without an idKey", () => {
    expect(
      groupMessageParts(["reasoning", "tool-call"], true, [
        "reasoning@0",
        "tool-call@1",
      ]),
    ).toEqual([{ type: "chainOfThoughtGroup", startIndex: 0, endIndex: 1 }]);
  });

  it("leaves idKey undefined when partIds is not provided", () => {
    const ranges = groupMessageParts(["tool-call", "tool-call"], false);
    expect(ranges).toEqual([{ type: "toolGroup", startIndex: 0, endIndex: 1 }]);
  });

  it("derives a tool group's idKey from its smallest member identity", () => {
    const ranges = groupMessageParts(
      ["text", "tool-call", "tool-call"],
      false,
      [undefined, "tool-call:t2", "tool-call:t1"],
    );
    expect(ranges).toEqual([
      { type: "single", index: 0 },
      {
        type: "toolGroup",
        startIndex: 1,
        endIndex: 2,
        idKey: "id:tool-call:t1",
      },
    ]);
  });

  it("keeps a group's idKey stable when the group shifts to a new index", () => {
    const live = groupMessageParts(["text", "tool-call", "tool-call"], false, [
      undefined,
      "tool-call:t1",
      "tool-call:t2",
    ]);
    const settled = groupMessageParts(
      ["reasoning", "text", "tool-call", "tool-call"],
      false,
      [undefined, undefined, "tool-call:t1", "tool-call:t2"],
    );
    const liveGroup = live.find((r) => r.type === "toolGroup")!;
    const settledGroup = settled.find((r) => r.type === "toolGroup")!;
    expect(liveGroup.idKey).toBe("id:tool-call:t1");
    expect(settledGroup.idKey).toBe("id:tool-call:t1");
    expect(settledGroup).toMatchObject({ startIndex: 2, endIndex: 3 });
  });

  it("demotes a duplicate id in a later range to undefined", () => {
    const ranges = groupMessageParts(
      ["tool-call", "text", "tool-call"],
      false,
      ["tool-call:t1", undefined, "tool-call:t1"],
    );
    const groups = ranges.filter((r) => r.type === "toolGroup");
    expect(groups.map((r) => r.idKey)).toEqual(["id:tool-call:t1", undefined]);
  });

  it("does not assign an idKey to reasoning groups without identities", () => {
    const ranges = groupMessageParts(["reasoning", "reasoning"], false, [
      undefined,
      undefined,
    ]);
    expect(ranges).toEqual([
      { type: "reasoningGroup", startIndex: 0, endIndex: 1 },
    ]);
  });

  it("derives a chain-of-thought group identity when it opens with anonymous reasoning", () => {
    const ranges = groupMessageParts(["reasoning", "tool-call"], true, [
      undefined,
      "tool-call:t1",
    ]);
    expect(ranges).toEqual([
      {
        type: "chainOfThoughtGroup",
        startIndex: 0,
        endIndex: 1,
        idKey: "id:tool-call:t1",
      },
    ]);
  });

  it("derives a chain-of-thought group's idKey when it opens with a tool call", () => {
    const ranges = groupMessageParts(["tool-call", "reasoning"], true, [
      "tool-call:t1",
      undefined,
    ]);
    expect(ranges).toEqual([
      {
        type: "chainOfThoughtGroup",
        startIndex: 0,
        endIndex: 1,
        idKey: "id:tool-call:t1",
      },
    ]);
  });
});
