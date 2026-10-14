// @vitest-environment node
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

  it("resolves formulas inside conditional branches", () => {
    for (const condition of [true, false]) {
      expect(
        resolveValue(
          {
            $cond: condition,
            $then: { $calc: "${/count} * 2" },
            $else: { $calc: "${/count} + 1" },
          },
          { state },
        ),
      ).toBe(condition ? 6 : 4);
    }
  });

  it("returns null for non-string formulas", () => {
    expect(resolveValue({ $calc: 1 }, { state })).toBeNull();
    expect(resolveValue({ $calc: null }, { state })).toBeNull();
  });

  it("leaves unclosed placeholders as text", () => {
    expect(renderTemplate("a ${/user/name} ${b", { state })).toBe("a Ada ${b");
    expect(renderTemplate("${{".repeat(5000), { state })).toBe(
      "${{".repeat(5000),
    );
  });

  it("detects expressions", () => {
    expect(isExpression({ $state: "/a" })).toBe(true);
    expect(isExpression({ $template: "" })).toBe(true);
    expect(isExpression({ $calc: "1" })).toBe(true);
    expect(isExpression({ state: "/a" })).toBe(false);
    expect(isExpression(["$state"])).toBe(false);
  });
});

describe("evaluateCondition", () => {
  const ctx = { state };
  it.each([
    [[false, { $state: "/unused" }], false],
    [{ $and: [false, { $state: "/unused" }] }, false],
    [{ $or: [true, { $state: "/unused" }] }, true],
    [{ $and: [{}, false, { $state: "/unused" }] }, false],
    [{ $or: [{}, true, { $state: "/unused" }] }, true],
  ])("stops reading after a decisive branch in %j", (condition, expected) => {
    const state = {
      get unused() {
        throw new Error("A decisive branch must skip this read");
      },
    };
    expect(evaluateCondition(condition as never, { state })).toBe(expected);
  });
  it.each([
    [undefined, true],
    [true, true],
    [{}, false],
    [{ $and: {} }, false],
    [{ $or: {} }, false],
    [{ unknown: true }, false],
    [{ not: {} }, false],
    [{ $cond: {}, $then: false, $else: true }, false],
    [{ not: { $cond: {}, $then: false, $else: true } }, false],
    [{ not: { $cond: {}, $then: true, $else: false } }, false],
    [{ $cond: false, $then: false, $else: { $cond: {}, $else: true } }, false],
    [{ $cond: true, $then: { $cond: {}, $else: true }, $else: false }, false],
    [{ $cond: false, $then: false, $else: true }, true],
    [{ $cond: false, $then: true, $else: false }, false],
    [{ not: { $cond: false, $then: true, $else: false } }, true],
    [{ $cond: true, $then: { label: "value" } }, true],
    [{ not: { $and: {} } }, false],
    [{ not: { unknown: true } }, false],
    [{ not: { $or: [{}] } }, false],
    [{ not: [{}] }, false],
    [{ not: { $and: [true, {}] } }, false],
    [{ not: { not: {} } }, false],
    [{ not: { $or: [false, {}] } }, false],
    [{ $or: [true, {}] }, true],
    [{ $and: [false, {}] }, false],
    [{ not: { $and: [false, {}] } }, true],
    [{ not: { $or: [true, {}] } }, false],
    [[], true],
    [{ $and: [] }, true],
    [{ $or: [] }, false],
    [{ $template: "${/user/name}" }, true],
    [{ $template: "${/missing}" }, false],
    [{ $cond: { $state: "/count", gt: 2 }, $then: "visible", $else: "" }, true],
    [{ $cond: { $state: "/open" }, $then: "visible", $else: "" }, false],
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
    [{ $calc: "${/count} > 2" }, true],
    [{ $calc: "${/count} < 2" }, false],
    [{ $state: "/count", gt: { $calc: "1 + 1" } }, true],
  ])("%j → %s", (condition, expected) => {
    expect(evaluateCondition(condition as never, ctx)).toBe(expected);
  });
});

describe("resolveProps", () => {
  it("resolves formulas as prop values", () => {
    expect(
      resolveProps({ total: { $calc: "${/count} * 2" } }, { state }),
    ).toEqual({
      props: { total: 6 },
      bindings: {},
    });
  });

  it("keeps root bindings distinct from empty-key and nested bindings", () => {
    const state = {
      "": "empty key",
      user: { name: "model" },
      "a/b": { "~key": "escaped" },
    };
    expect(
      resolveProps(
        {
          root: { $bindState: "" },
          empty: { $bindState: "/" },
          nested: { $bindState: "user/name" },
          escaped: { $bindState: "/a~1b/~0key" },
        },
        { state },
      ),
    ).toEqual({
      props: {
        root: state,
        empty: "empty key",
        nested: "model",
        escaped: "escaped",
      },
      bindings: {
        root: "",
        empty: "/",
        nested: "/user/name",
        escaped: "/a~1b/~0key",
      },
    });
  });

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
