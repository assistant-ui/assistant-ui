import { describe, expect, it } from "vitest";
import {
  normalizeSpec,
  normalizeUINode,
  type NormalizedUIElement,
  type NormalizedUINode,
} from "./ir";

/** Narrows a normalized node to its element form for property assertions. */
const asElement = (node: NormalizedUINode): NormalizedUIElement => {
  if (node === null || typeof node === "string" || typeof node === "number") {
    throw new Error(`expected an element, got ${node as unknown as string}`);
  }
  if (Array.isArray(node)) {
    throw new Error("expected an element, got an array");
  }
  return node as NormalizedUIElement;
};

describe("normalizeUINode", () => {
  describe("text leaf", () => {
    it("passes a string through", () => {
      expect(normalizeUINode("hello")).toBe("hello");
    });
  });

  describe("legacy component shape", () => {
    it("maps component + nested props to the canonical element", () => {
      const node = asElement(
        normalizeUINode({
          component: "Card",
          props: { padding: 4 },
          children: ["inside"],
          key: "c1",
        }),
      );

      expect(node).toEqual({
        type: "Card",
        props: { padding: 4 },
        children: ["inside"],
        key: "c1",
        action: undefined,
      });
    });

    it("defaults missing props to an empty bag and carries no action", () => {
      const node = asElement(normalizeUINode({ component: "Divider" }));
      expect(node.props).toEqual({});
      expect(node.children).toBeUndefined();
      expect(node.action).toBeUndefined();
    });
  });

  describe("flat $type shape", () => {
    it("keeps inline props and strips reserved keys", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Text",
          value: "hi",
          size: "md",
          weight: "semibold",
        }),
      );

      expect(node.type).toBe("Text");
      expect(node.props).toEqual({
        value: "hi",
        size: "md",
        weight: "semibold",
      });
      expect(node.children).toBeUndefined();
    });

    it("lets a component use `type` as an ordinary prop (no collision)", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Button",
          type: "submit",
          label: "Go",
        }),
      );

      expect(node.type).toBe("Button");
      expect(node.props).toEqual({ type: "submit", label: "Go" });
    });

    it("routes a flat `$type` node with a `component` prop to the flat branch, not the legacy one", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Schema",
          component: "display-name",
          label: "Go",
        }),
      );

      expect(node.type).toBe("Schema");
      expect(node.props).toEqual({ component: "display-name", label: "Go" });
    });

    it("threads $action and $key through as action/key", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Button",
          $key: "buy",
          label: "Purchase",
          $action: { type: "purchase", itemId: "sku-1" },
        }),
      );

      expect(node.key).toBe("buy");
      expect(node.action).toEqual({ type: "purchase", itemId: "sku-1" });
      expect(node.props).toEqual({ label: "Purchase" });
    });

    it("strips the whole $-prefixed namespace from props (not just the named keys)", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Card",
          $status: "done",
          $custom: 1,
          title: "hi",
        }),
      );

      expect(node.props).toEqual({ title: "hi" });
      expect("$status" in node.props).toBe(false);
      expect("$custom" in node.props).toBe(false);
    });
  });

  describe("nesting", () => {
    it("recurses through children of both shapes", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Col",
          children: [
            { component: "Text", props: { value: "a" } },
            { $type: "Text", value: "b" },
            "leaf",
          ],
        }),
      );

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

    it("resolves non-record input: null and boolean to null, number to a text leaf", () => {
      expect(normalizeUINode(null as unknown as never)).toBeNull();
      expect(normalizeUINode(true as unknown as never)).toBeNull();
      expect(normalizeUINode(42 as unknown as never)).toBe(42);
    });
  });
});

describe("normalizeSpec", () => {
  it("normalizes a single root", () => {
    expect(normalizeSpec({ $type: "Text", value: "x" }).root).toEqual({
      type: "Text",
      props: { value: "x" },
      children: undefined,
      key: undefined,
      action: undefined,
    });
  });

  it("normalizes a list root", () => {
    const { root } = normalizeSpec([{ $type: "Text", value: "a" }, "b"]);
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
