import { describe, expect, it } from "vitest";
import {
  CHILDREN_CAP,
  MAX_ELEMENT_DEPTH,
  NODE_BUDGET,
  boundSpec,
  clampReasonDetail,
  type ClampReason,
} from "./boundSpec";

const walk = (spec: unknown) => {
  const reasons: ClampReason[] = [];
  const result = boundSpec(spec, (reason) => reasons.push(reason));
  return { reasons, result };
};

const nest = (levels: number): unknown =>
  levels === 0
    ? { type: "Text" }
    : { type: "Box", children: [nest(levels - 1)] };

describe("boundSpec", () => {
  it("returns a value without children as-is", () => {
    const leaf = { type: "Text", props: { value: "hi" } };

    expect(walk(leaf)).toEqual({ reasons: [], result: leaf });
    expect(walk("text").result).toBe("text");
    expect(walk(null).result).toBe(null);
  });

  it("copies a node with children instead of mutating the caller's object", () => {
    const spec = { type: "Box", children: [] };
    const { result } = walk(spec);

    expect(result).toEqual(spec);
    expect(result).not.toBe(spec);
  });

  it("clamps any level wider than the children cap", () => {
    const { reasons, result } = walk(Array(CHILDREN_CAP + 1).fill("x"));

    expect(reasons).toEqual(["children"]);
    expect(result as unknown[]).toHaveLength(CHILDREN_CAP);
  });

  it("bounds an array whose reported length is fabricated", () => {
    const hostile = new Proxy(["a", "b"], {
      get: (target, prop, receiver) =>
        prop === "length"
          ? Number.MAX_SAFE_INTEGER
          : Reflect.get(target, prop, receiver),
    });

    const { reasons, result } = walk(hostile);

    expect(reasons).toEqual(["children"]);
    expect(result as unknown[]).toHaveLength(CHILDREN_CAP);
  });

  it("bounds an array that hijacks its own slice", () => {
    const hostile = new Proxy(["a", "b"], {
      get: (target, prop, receiver) =>
        prop === "slice"
          ? () => Array(CHILDREN_CAP * 2).fill("x")
          : Reflect.get(target, prop, receiver),
    });

    expect(walk(hostile).result).toEqual(["a", "b"]);
  });

  it("bounds an array that redirects Symbol.species to a foreign object", () => {
    function HostileCtor() {
      return { map: () => Array(500).fill({ type: "Text" }), length: 0 };
    }
    const constructor = { [Symbol.species]: HostileCtor };
    const hostile = new Proxy([{ type: "Text" }, { type: "Text" }], {
      get: (target, prop, receiver) =>
        prop === "constructor"
          ? constructor
          : Reflect.get(target, prop, receiver),
    });

    const { reasons, result } = walk(hostile);

    expect(reasons).toEqual([]);
    expect(result).toEqual([{ type: "Text" }, { type: "Text" }]);
  });

  it("accepts nesting exactly at the element-depth ceiling", () => {
    expect(walk(nest(MAX_ELEMENT_DEPTH)).reasons).toEqual([]);
  });

  it("drops nodes one level past the element-depth ceiling", () => {
    const { reasons, result } = walk(nest(MAX_ELEMENT_DEPTH + 1));

    expect(reasons).toEqual(["depth"]);
    expect(JSON.stringify(result)).toContain('"children":null');
  });

  it("spends a single budget across shared references and reports it once", () => {
    let spec: unknown = { type: "Text" };
    for (let level = 0; level < 20; level += 1) {
      spec = { type: "Box", children: [spec, spec] };
    }

    expect(walk(spec).reasons).toEqual(["budget"]);
  });

  it("cuts a node that is its own ancestor", () => {
    const cyclic: Record<string, unknown> = { type: "Box" };
    cyclic["children"] = [cyclic];

    const { reasons, result } = walk(cyclic);

    expect(reasons).toEqual(["cycle"]);
    expect(result).toEqual({ type: "Box", children: [null] });
  });

  it("keeps a repeated sibling that is not an ancestor", () => {
    const shared = { type: "Box", children: [] };

    const { reasons, result } = walk({
      type: "Row",
      children: [shared, shared],
    });

    expect(reasons).toEqual([]);
    expect(result).toEqual({ type: "Row", children: [shared, shared] });
  });
});

describe("clampReasonDetail", () => {
  it("renders one detail per reason", () => {
    expect(clampReasonDetail("budget")).toBe(
      `the tree was truncated after ${NODE_BUDGET} nodes.`,
    );
    expect(clampReasonDetail("cycle")).toBe(
      "a self-referencing node was dropped.",
    );
    expect(clampReasonDetail("depth")).toBe(
      `nodes deeper than ${MAX_ELEMENT_DEPTH} levels were dropped.`,
    );
    expect(clampReasonDetail("children")).toBe(
      `children were clamped to ${CHILDREN_CAP} entries.`,
    );
  });
});
