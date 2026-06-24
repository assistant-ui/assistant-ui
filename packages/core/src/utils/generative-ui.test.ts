import { describe, expect, it } from "vitest";
import {
  normalizeSpec,
  normalizeUINode,
  type NormalizedUINode,
} from "./generative-ui";

describe("normalizeUINode", () => {
  describe("text leaf", () => {
    it("passes a string through", () => {
      expect(normalizeUINode("hello")).toBe("hello");
    });
  });

  describe("legacy component shape", () => {
    it("maps component + nested props to the canonical element", () => {
      const node = normalizeUINode({
        component: "Card",
        props: { padding: 4 },
        children: ["inside"],
        key: "c1",
      }) as Exclude<NormalizedUINode, string | null>;

      expect(node).toEqual({
        type: "Card",
        props: { padding: 4 },
        children: ["inside"],
        key: "c1",
        action: undefined,
      });
    });

    it("defaults missing props to an empty bag and carries no action", () => {
      const node = normalizeUINode({ component: "Divider" }) as Exclude<
        NormalizedUINode,
        string | null
      >;
      expect(node.props).toEqual({});
      expect(node.children).toBeUndefined();
      expect(node.action).toBeUndefined();
    });
  });

  describe("flat $type shape", () => {
    it("keeps inline props and strips reserved keys", () => {
      const node = normalizeUINode({
        $type: "Text",
        value: "hi",
        size: "md",
        weight: "semibold",
      }) as Exclude<NormalizedUINode, string | null>;

      expect(node.type).toBe("Text");
      expect(node.props).toEqual({
        value: "hi",
        size: "md",
        weight: "semibold",
      });
      expect(node.children).toBeUndefined();
    });

    it("lets a component use `type` as an ordinary prop (no collision)", () => {
      const node = normalizeUINode({
        $type: "Button",
        type: "submit",
        label: "Go",
      }) as Exclude<NormalizedUINode, string | null>;

      expect(node.type).toBe("Button");
      expect(node.props).toEqual({ type: "submit", label: "Go" });
    });

    it("threads $action and $key through as action/key", () => {
      const node = normalizeUINode({
        $type: "Button",
        $key: "buy",
        label: "Purchase",
        $action: { type: "purchase", itemId: "sku-1" },
      }) as Exclude<NormalizedUINode, string | null>;

      expect(node.key).toBe("buy");
      expect(node.action).toEqual({ type: "purchase", itemId: "sku-1" });
      expect(node.props).toEqual({ label: "Purchase" });
    });
  });

  describe("nesting", () => {
    it("recurses through children of both shapes", () => {
      const node = normalizeUINode({
        $type: "Col",
        children: [
          { component: "Text", props: { value: "a" } },
          { $type: "Text", value: "b" },
          "leaf",
        ],
      }) as Exclude<NormalizedUINode, string | null>;

      expect(node.children).toEqual([
        {
          type: "Text",
          props: { value: "a" },
          children: undefined,
          key: undefined,
          action: undefined,
        },
        {
          type: "Text",
          props: { value: "b" },
          children: undefined,
          key: undefined,
          action: undefined,
        },
        "leaf",
      ]);
    });
  });

  describe("malformed input", () => {
    it("resolves a node without $type or component to null", () => {
      expect(normalizeUINode({ foo: "bar" } as unknown as never)).toBeNull();
    });
  });
});

describe("normalizeSpec", () => {
  it("normalizes a single root", () => {
    expect(normalizeSpec({ root: { $type: "Text", value: "x" } }).root).toEqual(
      {
        type: "Text",
        props: { value: "x" },
        children: undefined,
        key: undefined,
        action: undefined,
      },
    );
  });

  it("normalizes a list root", () => {
    const { root } = normalizeSpec({
      root: [{ $type: "Text", value: "a" }, "b"],
    });
    expect(Array.isArray(root)).toBe(true);
    expect(root).toEqual([
      {
        type: "Text",
        props: { value: "a" },
        children: undefined,
        key: undefined,
        action: undefined,
      },
      "b",
    ]);
  });
});
