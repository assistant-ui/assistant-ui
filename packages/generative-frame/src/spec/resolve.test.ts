// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveSpec } from "./resolve";
import type { Spec } from "./types";

const spec: Spec = {
  root: "card",
  elements: {
    card: {
      type: "Card",
      props: { title: { $template: "Dinner for ${/guests}" } },
      children: ["note", "hidden", "list", "save"],
      slots: { footer: ["total"] },
    },
    note: { type: "Input", props: { value: { $bindState: "/note" } } },
    hidden: { type: "Text", props: { text: "Hidden" }, visible: false },
    list: {
      type: "List",
      repeat: { path: "/dishes", key: "id" },
      children: ["dish"],
    },
    dish: {
      type: "Checkbox",
      props: {
        label: { $calc: "${$index} + 1 + '. ' + ${$item/name}" },
        checked: { $bindItem: "/done" },
      },
      on: {
        change: {
          action: "setState",
          params: { path: "/changed", value: true },
        },
      },
    },
    save: {
      type: "Button",
      props: { label: "Save" },
      on: {
        press: [
          { action: "setState", params: { path: "/saved", value: true } },
          {
            action: "save",
            params: {
              note: { $state: "/note" },
              guests: { $calc: "${/guests} * 2" },
              value: { $event: "" },
            },
          },
        ],
      },
    },
    total: { type: "Text", props: { text: { $state: "/guests" } } },
  },
  state: {
    guests: 4,
    note: "No nuts",
    dishes: [
      { id: "soup", name: "Soup", done: true },
      { id: "lamb", name: "Lamb", done: false },
    ],
  },
};

describe("resolveSpec", () => {
  it.each([
    { children: [], copies: 5000 },
    { children: ["missing"], copies: 100 },
    { children: ["root"], copies: 100 },
    { children: ["missing", "root"], copies: 100 },
    { children: ["invalid"], copies: 100 },
  ])(
    "bounds repeat expansion for $children children",
    ({ children, copies }) => {
      expect(
        resolveSpec({
          root: "root",
          state: { items: Array(copies).fill(null) },
          elements: {
            root: {
              type: "Box",
              repeat: { path: "/items" },
              children: Array.from({ length: 50 }, () => children).flat(),
            },
            invalid: { props: {} } as never,
          },
        }),
      ).toBeNull();
    },
  );

  it("ignores default entries in named slots when applying the budget", () => {
    const resolved = resolveSpec({
      root: "root",
      elements: {
        root: {
          type: "Box",
          children: ["leaf"],
          slots: { default: Array(5000).fill("leaf"), footer: ["leaf"] },
        },
        leaf: { type: "Text" },
      },
    });
    expect(resolved?.children.map((child) => child.id)).toEqual(["leaf"]);
    expect(resolved?.slots["footer"]?.map((child) => child.id)).toEqual([
      "leaf",
    ]);
    expect(resolved?.slots["default"]).toBeUndefined();
  });

  it("returns no tree for nested repeats that would render millions of elements", () => {
    const nested: Spec = {
      root: "outer",
      state: { items: Array(200).fill(null) },
      elements: {
        outer: {
          type: "Box",
          repeat: { path: "/items" },
          children: ["middle"],
        },
        middle: {
          type: "Box",
          repeat: { path: "/items" },
          children: ["inner"],
        },
        inner: { type: "Box", repeat: { path: "/items" }, children: ["leaf"] },
        leaf: { type: "Text" },
      },
    };
    expect(resolveSpec(nested)).toBeNull();
    expect(resolveSpec(nested, { state: { items: [] } })?.id).toBe("outer");
  });

  it("allows 5000 elements and 64 levels, but rejects the next element or level", () => {
    const repeated: Spec = {
      root: "root",
      elements: {
        root: { type: "Box", repeat: { path: "/items" }, children: ["leaf"] },
        leaf: { type: "Text" },
      },
    };
    expect(
      resolveSpec(repeated, { state: { items: Array(4999).fill(null) } })
        ?.children,
    ).toHaveLength(4999);
    expect(
      resolveSpec(repeated, { state: { items: Array(5000).fill(null) } }),
    ).toBeNull();

    const elements: Spec["elements"] = {};
    for (let i = 1; i <= 65; i++) {
      elements[`n${i}`] = {
        type: "Box",
        ...(i < 65 ? { children: [`n${i + 1}`] } : {}),
      };
    }
    const deep: Spec = { root: "n1", elements };
    expect(resolveSpec(deep)).toBeNull();
    delete elements["n65"];
    delete elements["n64"]!.children;
    expect(resolveSpec(deep)).not.toBeNull();
  });

  it("resolves props, visibility, repeat, slots, and action params", () => {
    expect(resolveSpec(spec)).toEqual({
      id: "card",
      type: "Card",
      props: { title: "Dinner for 4" },
      bindings: {},
      on: {},
      children: [
        {
          id: "note",
          type: "Input",
          props: { value: "No nuts" },
          bindings: { value: "/note" },
          on: {},
          children: [],
          slots: {},
        },
        {
          id: "list",
          type: "List",
          props: {},
          bindings: {},
          on: {},
          children: [
            {
              id: "dish",
              type: "Checkbox",
              props: { label: "1. Soup", checked: true },
              bindings: { checked: "/dishes/0/done" },
              on: {
                change: [
                  {
                    action: "setState",
                    params: { path: "/changed", value: true },
                  },
                ],
              },
              children: [],
              slots: {},
              key: "soup",
              itemPath: "/dishes/0",
            },
            {
              id: "dish",
              type: "Checkbox",
              props: { label: "2. Lamb", checked: false },
              bindings: { checked: "/dishes/1/done" },
              on: {
                change: [
                  {
                    action: "setState",
                    params: { path: "/changed", value: true },
                  },
                ],
              },
              children: [],
              slots: {},
              key: "lamb",
              itemPath: "/dishes/1",
            },
          ],
          slots: {},
        },
        {
          id: "save",
          type: "Button",
          props: { label: "Save" },
          bindings: {},
          on: {
            press: [
              { action: "setState", params: { path: "/saved", value: true } },
              {
                action: "save",
                params: { note: "No nuts", guests: 8, value: undefined },
              },
            ],
          },
          children: [],
          slots: {},
        },
      ],
      slots: {
        footer: [
          {
            id: "total",
            type: "Text",
            props: { text: 4 },
            bindings: {},
            on: {},
            children: [],
            slots: {},
          },
        ],
      },
    });
  });

  it("resolves against the given state", () => {
    const resolved = resolveSpec(spec, {
      state: { ...spec.state, guests: 6, dishes: [] },
    });
    expect(resolved?.props).toEqual({ title: "Dinner for 6" });
    expect(resolved?.children.map((child) => child.id)).toEqual([
      "note",
      "list",
      "save",
    ]);
    expect(resolved?.children[1]?.children).toEqual([]);
    expect(resolveSpec(spec, { state: null })?.props).toEqual({
      title: "Dinner for ",
    });
  });

  it("leaves out missing elements, malformed ones, and cycles", () => {
    expect(
      resolveSpec({
        root: "a",
        elements: {
          a: { type: "Box", children: ["b", "missing", "a"] },
          b: { type: "Box", children: ["a", "c"] },
          c: { props: {} } as never,
        },
      }),
    ).toEqual({
      id: "a",
      type: "Box",
      props: {},
      bindings: {},
      on: {},
      children: [
        {
          id: "b",
          type: "Box",
          props: {},
          bindings: {},
          on: {},
          children: [],
          slots: {},
        },
      ],
      slots: {},
    });
    expect(resolveSpec({ root: "x", elements: {} })).toBeNull();
  });
});
