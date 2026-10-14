// @vitest-environment node
import { expect, it } from "vitest";
import { defineCatalog } from "./catalog";
import { createSpecTools } from "./render-spec";
import type { Spec } from "./types";

it("returns repair feedback for invalid root patches and keeps the previous spec patchable", async () => {
  const specs = new Map<string, { spec: Spec; version: number }>();
  const { render_spec } = createSpecTools(
    defineCatalog({ components: { Text: { description: "Text" } } }),
    { specs },
  );
  const initial: Spec = {
    root: "text",
    elements: { text: { type: "Text", props: { text: "original" } } },
  };
  await render_spec.execute({ title: "panel", spec: initial });
  const saved = specs.get("panel")!.spec;
  const result = await render_spec.execute({
    title: "panel",
    patches: JSON.stringify({ op: "replace", path: "", value: null }),
  });
  expect(result).toMatchObject({
    ok: false,
    elementCount: 1,
    issues: [{ code: "invalid-patch" }],
  });
  expect(result.feedback).toContain("Patch line 1 was skipped");
  expect(specs.get("panel")!.spec).toBe(saved);
  await expect(
    render_spec.execute({
      title: "panel",
      patches:
        '{"op":"replace","path":"/elements/text/props/text","value":"repaired"}',
    }),
  ).resolves.toMatchObject({ ok: true });
  expect(specs.get("panel")!.spec.elements["text"]?.props?.["text"]).toBe(
    "repaired",
  );
});

it("reports a null root on the first call without throwing", async () => {
  const { render_spec } = createSpecTools(defineCatalog({ components: {} }));
  await expect(
    render_spec.execute({
      title: "panel",
      patches: '{"op":"replace","path":"","value":null}',
    }),
  ).resolves.toMatchObject({ ok: false, elementCount: 0 });
});
