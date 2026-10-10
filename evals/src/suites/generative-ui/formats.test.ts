import assert from "node:assert/strict";
import test from "node:test";
import { checkTree, startFormat } from "./formats.ts";

test("a tree of known components with valid props renders", () => {
  assert.deepEqual(
    checkTree({
      $type: "Card",
      children: [
        { $type: "Text", value: "Brisket for 12" },
        { $type: "Text", value: "Start at 6 am" },
      ],
    }),
    [],
  );
});

test("a tree reports unknown components and invalid props", () => {
  assert.deepEqual(checkTree({ $type: "Chart3D" }), [
    'Unknown component "Chart3D".',
  ]);
  const [error] = checkTree({ $type: "Text", value: 42 });
  assert.match(error ?? "", /^Text has invalid props \(value: /);
});

test("a field reference in display props is invalid, since only actions resolve them", () => {
  const [error] = checkTree({ $type: "Text", value: { $field: "name" } });
  assert.match(error ?? "", /^Text has invalid props \(value: /);
});

test("children that normalize to nothing count as dropped content", () => {
  assert.deepEqual(
    checkTree({
      $type: "Card",
      children: [{ $type: "Text", value: "Kept" }, { $type: 7 }, true],
    }),
    ["2 node(s) are malformed or nest too deeply and render nothing."],
  );
});

test("each format exposes only the tools it answers with", async () => {
  const tools = async (format: Parameters<typeof startFormat>[0]) =>
    Object.keys((await startFormat(format)).tools ?? {});
  assert.deepEqual(await tools("text"), []);
  assert.deepEqual(await tools("present"), ["present"]);
  assert.deepEqual(await tools("spec"), ["render_spec"]);
  assert.deepEqual(await tools("frame"), [
    "read_me",
    "show_widget",
    "edit_widget",
  ]);
});
