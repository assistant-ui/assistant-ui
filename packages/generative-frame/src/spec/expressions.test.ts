import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  isExpression,
  renderTemplate,
  resolveProps,
  resolveValue,
} from "./expressions";

const state = {
  user: { name: "Ada", "a/b": "slash" },
  count: 3,
  tags: ["x", "y"],
  open: false,
};

describe("resolveValue", () => {
  it("reads state, items, indexes, and event payloads", () => {
    const ctx = { state, item: { title: "T" }, index: 2, event: { value: 9 } };
    expect(resolveValue({ $state: "/user/name" }, ctx)).toBe("Ada");
    expect(resolveValue({ $state: "/user/a~1b" }, ctx)).toBe("slash");
    expect(resolveValue({ $bindState: "/count" }, ctx)).toBe(3);
    expect(resolveValue({ $item: "/title" }, ctx)).toBe("T");
    expect(resolveValue({ $item: "" }, ctx)).toEqual({ title: "T" });
    expect(resolveValue({ $index: true }, ctx)).toBe(2);
    expect(resolveValue({ $event: "/value" }, ctx)).toBe(9);
    expect(resolveValue({ $state: "/missing/deep" }, ctx)).toBeUndefined();
  });

  it("resolves nested values and conditionals", () => {
    expect(
      resolveValue(
        {
          label: {
            $cond: { $state: "/count", gt: 2 },
            $then: "many",
            $else: "few",
          },
          list: [{ $state: "/tags/0" }, 1],
        },
        { state },
      ),
    ).toEqual({ label: "many", list: ["x", 1] });
  });

  it("fills templates", () => {
    expect(
      renderTemplate(
        "${/user/name} has ${/count} (${$item/k} #${$index}) ${/nope}",
        {
          state,
          item: { k: "v" },
          index: 0,
        },
      ),
    ).toBe("Ada has 3 (v #0) ");
    expect(resolveValue({ $template: "Tags: ${/tags}" }, { state })).toBe(
      'Tags: ["x","y"]',
    );
  });

  it("detects expressions", () => {
    expect(isExpression({ $state: "/a" })).toBe(true);
    expect(isExpression({ $template: "" })).toBe(true);
    expect(isExpression({ state: "/a" })).toBe(false);
    expect(isExpression(["$state"])).toBe(false);
  });
});

describe("evaluateCondition", () => {
  const ctx = { state };
  it.each([
    [undefined, true],
    [false, false],
    [{ $state: "/open" }, false],
    [{ $state: "/count", eq: 3 }, true],
    [{ $state: "/count", neq: 3 }, false],
    [{ $state: "/count", gt: 2, lt: 4 }, true],
    [{ $state: "/count", gte: 4 }, false],
    [{ $state: "/count", lte: { $state: "/count" } }, true],
    [{ $state: "/user/name", gt: 3 }, false],
    [{ $state: "/open", not: true }, true],
    [{ not: { $state: "/open" } }, true],
    [[{ $state: "/count" }, { $state: "/open" }], false],
    [{ $or: [{ $state: "/open" }, { $state: "/count", eq: 3 }] }, true],
    [{ $and: [true, { $state: "/tags/1", eq: "y" }] }, true],
    [{ $state: "/tags", eq: ["x", "y"] }, true],
  ])("%j → %s", (condition, expected) => {
    expect(evaluateCondition(condition as never, ctx)).toBe(expected);
  });
});

describe("resolveProps", () => {
  it("reports two-way bindings for state and repeat items", () => {
    expect(
      resolveProps(
        {
          value: { $bindState: "filter" },
          done: { $bindItem: "/done" },
          label: { $item: "/label" },
        },
        {
          state: { filter: "all" },
          item: { done: true, label: "L" },
          itemPath: "/todos/1",
        },
      ),
    ).toEqual({
      props: { value: "all", done: true, label: "L" },
      bindings: { value: "/filter", done: "/todos/1/done" },
    });
  });
});
