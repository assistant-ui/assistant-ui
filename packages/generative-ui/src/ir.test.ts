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
  it("stops normalizing wide sibling lists at the node budget", () => {
    const children = Array.from({ length: 10_000 }, (_, index) => ({
      $type: "Text",
      value: index,
    }));
    const root = asElement(normalizeUINode({ $type: "Column", children }));
    const normalizedChildren = root.children;

    if (!Array.isArray(normalizedChildren)) {
      throw new Error("expected normalized children to be an array");
    }
    expect(normalizedChildren).toHaveLength(4_999);
    expect(normalizedChildren[0]).toMatchObject({
      type: "Text",
      props: { value: 0 },
    });
    expect(normalizedChildren[4_998]).toMatchObject({
      type: "Text",
      props: { value: 4_998 },
    });
  });

  it("keeps a tree within the element budget whole however many arrays and leaves it has", () => {
    const branches = Array.from({ length: 2_000 }, (_, index) => ({
      $type: "Column",
      children: [{ $type: "Divider" }, `leaf ${index}`],
    }));
    const root = asElement(
      normalizeUINode({ $type: "Column", children: branches }),
    );

    if (!Array.isArray(root.children)) {
      throw new Error("expected normalized children to be an array");
    }
    expect(root.children).toHaveLength(2_000);
    expect(asElement(root.children[1_999]).children).toEqual([
      expect.objectContaining({ type: "Divider" }),
      "leaf 1999",
    ]);
  });

  it("shares the node budget across a root list and resets it for each call", () => {
    const spec = Array.from({ length: 6_000 }, (_, index) => ({
      $type: "Text",
      value: index,
    }));

    expect(normalizeSpec(spec).root).toHaveLength(5_000);
    expect(normalizeUINode({ $type: "Text", value: "next" })).toMatchObject({
      type: "Text",
      props: { value: "next" },
    });
  });

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

    it("strips the _ spellings from a legacy node's props", () => {
      const node = asElement(
        normalizeUINode({
          component: "Card",
          props: {
            _type: "Text",
            _key: "k",
            _action: { type: "x" },
            title: "hi",
          },
        }),
      );

      expect(node.type).toBe("Card");
      expect(node.props).toEqual({ title: "hi" });
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

    it("normalizes the _type/_key/_action spelling models emit to the same element", () => {
      const node = asElement(
        normalizeUINode({
          _type: "Button",
          _key: "buy",
          label: "Purchase",
          _action: { type: "purchase", itemId: "sku-1" },
          children: [{ $type: "Text", value: "now" }],
        }),
      );

      expect(node).toEqual({
        type: "Button",
        props: { label: "Purchase" },
        children: [
          {
            type: "Text",
            props: { value: "now" },
            children: undefined,
            key: undefined,
            action: undefined,
          },
        ],
        key: "buy",
        action: { type: "purchase", itemId: "sku-1" },
      });
    });

    it("prefers the $ spelling when a node carries both, stripping both from props", () => {
      const node = asElement(
        normalizeUINode({
          $type: "Card",
          _type: "Text",
          $key: "a",
          _key: "b",
          $action: { type: "kept" },
          _action: { type: "dropped" },
          title: "hi",
        }),
      );

      expect(node.type).toBe("Card");
      expect(node.key).toBe("a");
      expect(node.action).toEqual({ type: "kept" });
      expect(node.props).toEqual({ title: "hi" });
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

    it("unwraps a complete typeless root to the children it wraps", () => {
      const tree = {
        _type: "Col",
        children: [{ _type: "Text", value: "a" }],
      };
      expect(normalizeUINode({ children: tree })).toEqual(
        normalizeUINode(tree),
      );
    });

    it("leaves typeless items of a root list unwrapped, as the renderer does", () => {
      const item = { children: { _type: "Text", value: "a" } };
      expect(normalizeSpec([item] as unknown as never).root).toEqual([null]);
      expect(normalizeUINode([item])).toEqual([null]);
    });

    it("keeps a streaming typeless root and a nested typeless node unrendered", () => {
      expect(
        normalizeUINode({ children: { _type: "Text", value: "a" } }, [
          "children",
          "value",
        ]),
      ).toBeNull();
      expect(
        asElement(
          normalizeUINode({ _type: "Card", children: { children: "x" } }),
        ).children,
      ).toBeNull();
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
