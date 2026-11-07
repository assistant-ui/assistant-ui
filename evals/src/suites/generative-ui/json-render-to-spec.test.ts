import assert from "node:assert/strict";
import test from "node:test";
import type { Spec as JsonSpec } from "@json-render/core";
import { jsonRenderToSpec } from "./json-render-to-spec.ts";

test("converts repeat and state actions while keeping the shared spec fields", () => {
  const input: JsonSpec = {
    root: "list",
    state: { items: [{ name: "Tea" }] },
    elements: {
      list: {
        type: "Col",
        props: {},
        children: ["row"],
        repeat: { statePath: "/items", key: "name" },
        visible: { $state: "/show", eq: true },
        on: {
          press: {
            action: "setState",
            params: { statePath: "/show", value: false },
          },
        },
        watch: {
          "/items": [
            {
              action: "setState",
              params: { statePath: "/changed", value: true },
            },
          ],
        },
      },
      row: {
        type: "Text",
        props: { value: { $item: "name" } },
        children: [],
        slots: { footer: [] },
      },
    },
  };
  const output = jsonRenderToSpec(input);
  assert.deepEqual(output, {
    root: "list",
    state: input.state,
    elements: {
      list: {
        type: "Col",
        props: {},
        children: ["row"],
        repeat: { path: "/items", key: "name" },
        visible: { $state: "/show", eq: true },
        on: {
          press: {
            action: "setState",
            params: { path: "/show", value: false },
          },
        },
        watch: {
          "/items": [
            { action: "setState", params: { path: "/changed", value: true } },
          ],
        },
      },
      row: input.elements.row,
    },
  });
  assert.deepEqual(input.elements.list?.repeat, {
    statePath: "/items",
    key: "name",
  });
});

test("moves repeat item visibility onto isolated child templates", () => {
  const spec: JsonSpec = {
    root: "list",
    elements: {
      list: {
        type: "Col",
        props: {},
        children: ["row"],
        repeat: { statePath: "/items" },
        visible: {
          $and: [
            { $state: "/show", eq: true },
            { $item: "status", eq: "open" },
          ],
        },
      },
      row: {
        type: "Text",
        props: { value: { $item: "name" } },
        children: [],
        visible: { $item: "name" },
      },
    },
  };
  const converted = jsonRenderToSpec(spec);
  assert.deepEqual(converted.elements.list, {
    type: "Col",
    props: {},
    children: ["list/0"],
    repeat: { path: "/items" },
    visible: { $and: [{ $state: "/show", eq: true }] },
  });
  assert.deepEqual(converted.elements["list/0"], {
    ...spec.elements.row,
    visible: {
      $and: [{ $and: [{ $item: "status", eq: "open" }] }, { $item: "name" }],
    },
  });
  assert.deepEqual(converted.elements.row, spec.elements.row);
});

test("rejects json-render behavior the kit renderer cannot preserve", () => {
  const spec: JsonSpec = {
    root: "row",
    elements: { row: { type: "Text", props: {}, children: [] } },
  };
  spec.elements.row!.repeat = { statePath: { $item: "children" } };
  assert.throws(() => jsonRenderToSpec(spec), /item-relative repeat/);
  delete spec.elements.row!.repeat;
  spec.elements.row!.on = {
    press: { action: "pushState", params: { statePath: "/items" } },
  };
  assert.throws(() => jsonRenderToSpec(spec), /pushState cannot render/);
  spec.elements.row!.on = {
    press: {
      action: "setState",
      params: { statePath: "/show", value: true },
      confirm: { title: "Sure?", message: "Confirm" },
    },
  };
  assert.throws(() => jsonRenderToSpec(spec), /unsupported options/);
  delete spec.elements.row!.on;
  spec.elements.row!.visible = { $state: "/x", eq: 1, neq: 2 };
  assert.throws(() => jsonRenderToSpec(spec), /multiple comparison operators/);
});
