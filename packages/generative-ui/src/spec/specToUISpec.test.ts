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
            size: { $field: "size" },
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
    const blocks = JSON.stringify(toSlackBlocks(tree).blocks);
    expect(blocks).toContain('"action_id":"order"');
    expect(blocks).toContain(
      '"value":"{\\"size\\":{\\"$field\\":\\"size\\"},\\"name\\":\\"Ada\\",\\"qty\\":2}"',
    );
    const card = JSON.stringify(toAdaptiveCard(tree).card);
    expect(card).toContain('"type":"Input.ChoiceSet","id":"size"');
    expect(card).toContain(
      '"data":{"aui":{"type":"order","payload":{"size":{"$field":"size"},"name":"Ada","qty":2}}}',
    );
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
