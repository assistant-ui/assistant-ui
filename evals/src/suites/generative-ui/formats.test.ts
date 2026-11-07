import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import { checkTree, kitLibrary, startFormat } from "./formats.ts";

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
  const [error] = checkTree({ $type: "Text", value: true });
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
  assert.deepEqual(await tools("json-render"), ["render_json"]);
  assert.deepEqual(await tools("frame"), [
    "read_me",
    "show_widget",
    "edit_widget",
  ]);
  assert.deepEqual(await tools("auto"), [
    "render_spec",
    "read_me",
    "show_widget",
    "edit_widget",
  ]);
});

test("auto gets the rules for choosing a format and the spec catalog", async () => {
  const auto = await startFormat("auto");
  const spec = await startFormat("spec");
  assert.ok(auto.system.includes("## Choosing how to answer"));
  assert.ok(auto.system.includes("Call `read_me` once"));
  assert.ok(
    auto.system.endsWith(
      spec.system.slice(spec.system.indexOf("# Declarative UI")),
    ),
  );
  assert.equal(auto.prose, true);
  assert.equal(spec.prose, false);
});

test("json-render prompts with the kit's component catalog", async () => {
  const format = await startFormat("json-render");
  for (const name of Object.keys(kitLibrary)) {
    assert.ok(format.system.includes(name), name);
  }
  assert.match(format.system, /Output ONLY JSONL patches/);
  assert.equal(format.prose, false);
});

test("json-render lists events and checks a spec against the kit's catalog", async () => {
  const format = await startFormat("json-render");
  assert.match(format.system, /Button[^\n]*\[events: press\]/);
  const patch = (path: string, value: unknown) =>
    JSON.stringify({ op: "add", path, value });
  const execute = format.tools!.render_json!.execute as (
    input: { patches: string },
    options: never,
  ) => Promise<{ ok: boolean; errors?: string[] }>;
  const run = (event: string) =>
    execute(
      {
        patches: [
          patch("/root", "main"),
          patch("/elements/main", {
            type: "Button",
            props: { label: "Go" },
            children: [],
            on: {
              [event]: {
                action: "setState",
                params: { statePath: "/a", value: 1 },
              },
            },
          }),
        ].join("\n"),
      },
      undefined as never,
    );
  const result = await run("click");
  assert.equal(result.ok, false);
  assert.match(result.errors!.join("\n"), /click/);
  assert.equal((await run("press")).ok, true);
});

test("the vocabulary tells the model what the kit's element renders", () => {
  const element = readFileSync(
    fileURLToPath(
      new URL(
        "../../../../packages/ui/src/components/react/assistant-ui/elements/generative-ui.tsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  assert.ok(element.includes(JSON.stringify(kitLibrary.Markdown!.description)));
});
