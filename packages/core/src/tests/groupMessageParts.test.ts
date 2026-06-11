import { describe, expect, it } from "vitest";
import { groupMessageParts } from "../react/primitives/message/MessageParts";

describe("groupMessageParts idKey", () => {
  it("leaves idKey undefined when partIds is not provided", () => {
    const ranges = groupMessageParts(["tool-call", "tool-call"], false);
    expect(ranges).toEqual([{ type: "toolGroup", startIndex: 0, endIndex: 1 }]);
  });

  it("derives a tool group's idKey from its first part", () => {
    const ranges = groupMessageParts(
      ["text", "tool-call", "tool-call"],
      false,
      [undefined, "t1", "t2"],
    );
    expect(ranges).toEqual([
      { type: "single", index: 0 },
      { type: "toolGroup", startIndex: 1, endIndex: 2, idKey: "id:t1" },
    ]);
  });

  it("keeps a group's idKey stable when the group shifts to a new index", () => {
    const live = groupMessageParts(["text", "tool-call", "tool-call"], false, [
      undefined,
      "t1",
      "t2",
    ]);
    const settled = groupMessageParts(
      ["reasoning", "text", "tool-call", "tool-call"],
      false,
      [undefined, undefined, "t1", "t2"],
    );
    const liveGroup = live.find((r) => r.type === "toolGroup")!;
    const settledGroup = settled.find((r) => r.type === "toolGroup")!;
    expect(liveGroup.idKey).toBe("id:t1");
    expect(settledGroup.idKey).toBe("id:t1");
    expect(settledGroup).toMatchObject({ startIndex: 2, endIndex: 3 });
  });

  it("demotes a duplicate id in a later range to undefined", () => {
    const ranges = groupMessageParts(
      ["tool-call", "text", "tool-call"],
      false,
      ["t1", undefined, "t1"],
    );
    const groups = ranges.filter((r) => r.type === "toolGroup");
    expect(groups.map((r) => r.idKey)).toEqual(["id:t1", undefined]);
  });

  it("does not assign an idKey to reasoning groups", () => {
    const ranges = groupMessageParts(["reasoning", "reasoning"], false, [
      undefined,
      undefined,
    ]);
    expect(ranges).toEqual([
      { type: "reasoningGroup", startIndex: 0, endIndex: 1 },
    ]);
  });

  it("keeps a chain-of-thought group structural when it opens with reasoning", () => {
    const ranges = groupMessageParts(["reasoning", "tool-call"], true, [
      undefined,
      "t1",
    ]);
    expect(ranges).toEqual([
      { type: "chainOfThoughtGroup", startIndex: 0, endIndex: 1 },
    ]);
  });

  it("derives a chain-of-thought group's idKey when it opens with a tool call", () => {
    const ranges = groupMessageParts(["tool-call", "reasoning"], true, [
      "t1",
      undefined,
    ]);
    expect(ranges).toEqual([
      {
        type: "chainOfThoughtGroup",
        startIndex: 0,
        endIndex: 1,
        idKey: "id:t1",
      },
    ]);
  });
});
