import { describe, expect, it } from "vitest";
import type { Spec } from "generative-frame/spec";
import { toSlackBlocks } from "../slack/toSlackBlocks";
import { toAdaptiveCard } from "../teams/toAdaptiveCard";
import { specToUISpec } from "./specToUISpec";

const order: Spec = {
  root: "card",
  elements: {
    card: {
      type: "Card",
      props: { title: { $template: "Order for ${/name}" } },
      children: ["size", "extras", "order"],
    },
    size: {
      type: "Select",
      props: {
        label: "Size",
        options: [
          { label: "Small", value: "S" },
          { label: "Medium", value: "M" },
        ],
        defaultValue: { $bindState: "/size" },
      },
    },
    extras: {
      type: "Text",
      props: { value: "Extras" },
      visible: { $state: "/extras", gt: 0 },
    },
    order: {
      type: "Button",
      props: { label: "Order" },
      on: {
        press: [
          { action: "setState", params: { path: "/sent", value: true } },
          {
            action: "order",
            params: {
              size: { $state: "/size" },
              name: { $state: "/name" },
              qty: { $calc: "${/qty} + 1" },
              picked: { $event: "" },
            },
          },
        ],
      },
    },
  },
  state: { name: "Ada", size: "M", qty: 1, extras: 0 },
};

describe("specToUISpec", () => {
  it("maps a spec onto the present tree for one state", () => {
    expect(specToUISpec(order)).toEqual({
      $type: "Card",
      title: "Order for Ada",
      children: [
        {
          $type: "Select",
          label: "Size",
          options: [
            { label: "Small", value: "S" },
            { label: "Medium", value: "M" },
          ],
          defaultValue: "M",
          name: "size",
        },
        {
          $type: "Button",
          label: "Order",
          $action: {
            type: "order",
            size: { $field: "size", fallback: "M" },
            name: "Ada",
            qty: 2,
          },
        },
      ],
    });
    expect(
      specToUISpec(order, { state: { ...order.state, size: "S", extras: 2 } }),
    ).toMatchObject({
      children: [
        { $type: "Select", defaultValue: "S" },
        { $type: "Text", value: "Extras" },
        { $type: "Button" },
      ],
    });
  });

  it("lets Slack and Teams actions read the control the user changed", () => {
    const tree = specToUISpec(order);
    const elements = toSlackBlocks(tree).blocks.flatMap((block) =>
      "elements" in block && Array.isArray(block.elements)
        ? (block.elements as Record<string, unknown>[])
        : [],
    );
    const button = elements.find((element) => element["type"] === "button");
    expect(button?.["action_id"]).toBe("order");
    expect(JSON.parse(String(button?.["value"]))).toEqual({
      size: { $field: "size", fallback: "M" },
      name: "Ada",
      qty: 2,
    });
    const body: unknown = toAdaptiveCard(tree).card.body;
    const items = (body as Record<string, unknown>[]).flatMap(
      (item) => (item["items"] as Record<string, unknown>[] | undefined) ?? [],
    );
    expect(
      items.find((item) => item["type"] === "Input.ChoiceSet"),
    ).toMatchObject({ id: "size" });
    const actions = items.flatMap(
      (item) =>
        (item["actions"] as Record<string, unknown>[] | undefined) ?? [],
    );
    expect(actions).toEqual([
      expect.objectContaining({
        type: "Action.Submit",
        data: {
          aui: {
            type: "order",
            payload: {
              size: { $field: "size", fallback: "M" },
              name: "Ada",
              qty: 2,
            },
          },
        },
      }),
    ]);
  });

  it("reads every bound control under a path a param reads whole", () => {
    const tree = specToUISpec({
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "RSVP" },
          children: ["name", "list", "send"],
        },
        name: {
          type: "Input",
          props: { name: "guest", defaultValue: { $bindState: "/form/name" } },
        },
        list: {
          type: "Box",
          repeat: { path: "/dishes", key: "id" },
          children: ["dish"],
        },
        dish: {
          type: "Checkbox",
          props: {
            label: { $item: "/name" },
            defaultChecked: { $bindItem: "/done" },
          },
        },
        send: {
          type: "Button",
          props: { label: "Send" },
          on: {
            press: {
              action: "rsvp",
              params: {
                form: { $state: "/form" },
                dishes: { $state: "/dishes" },
              },
            },
          },
        },
      },
      state: {
        form: { name: "Ada", note: "No nuts" },
        dishes: [{ id: "soup", name: "Soup", done: true }],
      },
    });
    expect(tree).toMatchObject({
      children: [
        { $type: "Input", name: "guest" },
        { $type: "Box" },
        {
          $type: "Button",
          $action: {
            type: "rsvp",
            form: {
              name: { $field: "guest", fallback: "Ada" },
              note: "No nuts",
            },
            dishes: [
              {
                id: "soup",
                name: "Soup",
                done: { $field: "/dishes/0/done", fallback: true },
              },
            ],
          },
        },
      ],
    });
  });

  it("names a control repeated per item by its state path and keys repeated nodes", () => {
    const tree = specToUISpec({
      root: "list",
      elements: {
        list: {
          type: "Box",
          repeat: { path: "/dishes", key: "id" },
          children: ["dish"],
        },
        dish: {
          type: "Checkbox",
          props: {
            label: { $item: "/name" },
            defaultChecked: { $bindItem: "/done" },
          },
        },
      },
      state: { dishes: [{ id: "soup", name: "Soup", done: true }] },
    });
    expect(tree).toEqual({
      $type: "Box",
      children: [
        {
          $type: "Checkbox",
          $key: "soup:dish",
          label: "Soup",
          defaultChecked: true,
          name: "/dishes/0/done",
        },
      ],
    });
  });

  it("wires Card footer events and leaves out setState, watch, and named slots", () => {
    expect(
      specToUISpec({
        root: "card",
        elements: {
          card: {
            type: "Card",
            props: {
              title: "Trip",
              confirm: { label: "Book" },
              cancel: { label: "Skip" },
            },
            slots: { footer: ["note"] },
            on: {
              confirm: { action: "book", params: { trip: "pnw" } },
              cancel: { action: "setState", params: { path: "/x", value: 1 } },
            },
            watch: { "/x": { action: "sendMessage", params: { text: "x" } } },
          },
          note: { type: "Text", props: { value: "Note" } },
        },
      }),
    ).toEqual({
      $type: "Card",
      title: "Trip",
      confirm: { label: "Book", $action: { type: "book", trip: "pnw" } },
      cancel: { label: "Skip" },
      $action: { type: "book", trip: "pnw" },
    });
  });

  it("returns an empty tree when the root does not resolve", () => {
    expect(specToUISpec({ root: "missing", elements: {} })).toEqual([]);
  });
});
