// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { applyWidgetEdits } from "./edits";
import { createWidgetRegistry } from "./registry";
import { defineCatalog } from "../spec/catalog";
import { createSpecTools, specGuidanceModule } from "../spec/render-spec";
import { getToolDeclarations, toAISDKTools } from "./define";
import { buildWidgetInstructions, createWidgetTools } from "./tools";

const CODE = `<h3>Revenue</h3><p class="note">Q1</p><p class="note">Q2</p>`;

describe("applyWidgetEdits", () => {
  it("applies exact replacements in order", () => {
    const result = applyWidgetEdits(CODE, [
      { old_string: "<h3>Revenue</h3>", new_string: "<h3>Revenue (USD)</h3>" },
      { old_string: "(USD)", new_string: "($M)" },
    ]);
    expect(result).toEqual({
      ok: true,
      code: CODE.replace("Revenue", "Revenue ($M)"),
    });
  });

  it("fails when old_string is missing, without applying earlier edits", () => {
    const result = applyWidgetEdits(CODE, [
      { old_string: "Revenue", new_string: "Sales" },
      { old_string: "<h2>", new_string: "<h1>" },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.index).toBe(1);
    expect(result.error).toMatch(
      /edits\[1\]\.old_string was not found: "<h2>"/,
    );
  });

  it("fails when old_string is ambiguous", () => {
    const result = applyWidgetEdits(CODE, [
      { old_string: '<p class="note">', new_string: "<p>" },
    ]);
    expect(result).toMatchObject({ ok: false, index: 0 });
    if (!result.ok) expect(result.error).toMatch(/more than once/);
  });

  it("rejects empty and no-op edits", () => {
    expect(applyWidgetEdits(CODE, [])).toMatchObject({ ok: false });
    expect(
      applyWidgetEdits(CODE, [{ old_string: "", new_string: "x" }]),
    ).toMatchObject({ ok: false });
    expect(
      applyWidgetEdits(CODE, [{ old_string: "Q1", new_string: "Q1" }]),
    ).toMatchObject({ ok: false });
  });
});

describe("createWidgetRegistry", () => {
  it("versions records by title and notifies subscribers", () => {
    const registry = createWidgetRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    expect(registry.set("a", "1").version).toBe(1);
    expect(registry.set("a", "2").version).toBe(2);
    expect(registry.get("a")).toEqual({ title: "a", code: "2", version: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    registry.set("b", "x");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.list().map((r) => r.title)).toEqual(["a", "b"]);
  });
});

describe("createWidgetTools", () => {
  it("records shown widgets and edits them by title", async () => {
    const registry = createWidgetRegistry();
    const tools = createWidgetTools({ registry });
    await expect(
      tools.show_widget.execute({
        title: "rev",
        widget_code: '<svg viewBox="0 0 1 1"/>',
      }),
    ).resolves.toEqual({ ok: true, title: "rev", kind: "svg", version: 1 });
    await tools.show_widget.execute({ title: "rev", widget_code: CODE });

    const edited = await tools.edit_widget.execute({
      title: "rev",
      edits: [{ old_string: "<h3>Revenue</h3>", new_string: "<h3>Sales</h3>" }],
    });
    expect(edited).toEqual({ ok: true, title: "rev", version: 3, applied: 1 });
    expect(registry.get("rev")!.code).toContain("<h3>Sales</h3>");
  });

  it("reports missing, ambiguous, and unknown-title edits without changing code", async () => {
    const registry = createWidgetRegistry([{ title: "rev", code: CODE }]);
    const tools = createWidgetTools({ registry });

    const missing = await tools.edit_widget.execute({
      title: "rev",
      edits: [{ old_string: "nope", new_string: "x" }],
    });
    expect(missing).toMatchObject({ ok: false, title: "rev" });
    const ambiguous = await tools.edit_widget.execute({
      title: "rev",
      edits: [{ old_string: "note", new_string: "x" }],
    });
    expect(ambiguous).toMatchObject({ ok: false });
    if (!ambiguous.ok) expect(ambiguous.error).toMatch(/more than once/);
    const unknown = await tools.edit_widget.execute({
      title: "other",
      edits: [{ old_string: "a", new_string: "b" }],
    });
    expect(unknown).toMatchObject({ ok: false });
    if (!unknown.ok)
      expect(unknown.error).toBe(
        'No widget titled "other". Known widgets: rev. Use show_widget to create it.',
      );
    expect(registry.get("rev")).toEqual({
      title: "rev",
      code: CODE,
      version: 1,
    });
  });

  it("rejects empty widget code", async () => {
    const tools = createWidgetTools();
    await expect(
      tools.show_widget.execute({ title: "x", widget_code: "  " }),
    ).resolves.toMatchObject({ ok: false });
  });

  it("read_me returns guidance for the requested modules and platform", async () => {
    const tools = createWidgetTools({
      guidance: { cdnOrigins: ["https://cdn.example.com"] },
    });
    const text = await tools.read_me.execute({
      modules: ["chart", "bogus" as never],
      platform: "mobile",
    });
    expect(text).toContain("## Module: chart");
    expect(text).not.toContain("## Module: diagram");
    expect(text).toContain("## Platform: mobile");
    expect(text).toContain("https://cdn.example.com");
  });

  it("preview_widget delegates to the configured renderer", async () => {
    const preview = vi.fn(async () => ({
      ok: true,
      kind: "html" as const,
      width: 680,
      height: 120,
      blank: false,
      errors: [],
      console: [],
    }));
    const tools = createWidgetTools({ preview });
    await tools.preview_widget.execute({
      widget_code: "<p>x</p>",
      appearance: "dark",
    });
    expect(preview).toHaveBeenCalledWith("<p>x</p>", { appearance: "dark" });

    const without = await createWidgetTools().preview_widget.execute({
      widget_code: "<p>x</p>",
    });
    expect(without.ok).toBe(false);
  });

  it("describes inputs as JSON Schema objects with widget_code last", () => {
    const tools = createWidgetTools();
    for (const tool of Object.values(tools)) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.name).toMatch(/^[a-z_]+$/);
    }
    expect(Object.keys(tools.show_widget.inputSchema.properties!)).toEqual([
      "title",
      "loading_messages",
      "widget_code",
    ]);
  });
});

describe("toAISDKTools", () => {
  it("wraps schemas with the injected jsonSchema helper", async () => {
    const jsonSchema = vi.fn((schema: object) => ({ wrapped: schema }));
    const tools = createWidgetTools();
    const sdkTools = toAISDKTools(tools, { jsonSchema });
    expect(Object.keys(sdkTools)).toEqual([
      "read_me",
      "show_widget",
      "edit_widget",
      "preview_widget",
    ]);
    expect(sdkTools.show_widget.inputSchema).toEqual({
      wrapped: tools.show_widget.inputSchema,
    });
    expect(sdkTools.show_widget.description).toBe(
      tools.show_widget.description,
    );
    await expect(
      sdkTools.show_widget.execute({ title: "t", widget_code: "<p>x</p>" }),
    ).resolves.toMatchObject({ ok: true });
  });
});

const catalog = defineCatalog({
  components: {
    Stack: { description: "Layout", slots: ["default"] },
    Metric: {
      description: "A number",
      props: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "number" } },
        required: ["label", "value"],
      },
    },
  },
});

const PATCHES = [
  '{"op":"add","path":"/root","value":"main"}',
  '{"op":"add","path":"/elements/main","value":{"type":"Stack","children":["m"]}}',
  '{"op":"add","path":"/elements/m","value":{"type":"Metric","props":{"label":"Users","value":"many"}}}',
].join("\n");

const withSpec = () =>
  createWidgetTools({
    extraTools: createSpecTools(catalog),
    modules: [specGuidanceModule(catalog)],
  });

describe("spec tools", () => {
  it("adds render_spec and the spec module only when composed in", async () => {
    expect("render_spec" in createWidgetTools()).toBe(false);
    const tools = withSpec();
    expect(
      tools.read_me.inputSchema.properties?.["modules"]?.items?.enum,
    ).toContain("spec");
    const specOnly = await tools.read_me.execute({ modules: ["spec"] });
    expect(specOnly.startsWith("# Declarative UI")).toBe(true);
    expect(specOnly).toContain("### Metric");
    expect(specOnly).toContain("Output only patch lines");
    const both = await tools.read_me.execute({ modules: ["chart", "spec"] });
    expect(both).toContain("## Module: chart");
    expect(both).toContain("# Declarative UI");
    const withoutCatalog = await createWidgetTools().read_me.execute({
      modules: ["spec" as never],
    });
    expect(withoutCatalog).not.toContain("Declarative UI");
  });

  it("validates streamed patches and returns repair feedback", async () => {
    const specs = new Map();
    const tools = createSpecTools(catalog, { specs });
    const first = await tools.render_spec.execute({
      title: "kpis",
      patches: `${PATCHES}\n{oops`,
    });
    expect(first.ok).toBe(false);
    expect(first.version).toBe(1);
    expect(first.elementCount).toBe(2);
    expect(first.issues.map((issue) => [issue.code, issue.path])).toEqual([
      ["invalid-patch", ""],
      ["invalid-props", "/elements/m/props/value"],
    ]);
    expect(first.feedback).toContain(
      "Patch line 4 was skipped: not valid JSON",
    );
    expect(first.feedback).toContain(
      '/elements/m/props/value: Metric "m" prop value expected number, got string.',
    );

    const fixed = await tools.render_spec.execute({
      title: "kpis",
      patches: '{"op":"replace","path":"/elements/m/props/value","value":42}',
    });
    expect(fixed).toMatchObject({
      ok: true,
      version: 2,
      issues: [],
      feedback: "The spec is valid.",
    });
    expect(specs.get("kpis").spec.elements.m.props.value).toBe(42);

    const replaced = await tools.render_spec.execute({
      title: "kpis",
      spec: { root: "x", elements: { x: { type: "Stack" } } },
    });
    expect(replaced).toMatchObject({ ok: true, version: 3, elementCount: 1 });

    const empty = await tools.render_spec.execute({ title: "other" });
    expect(empty.ok).toBe(false);
    expect(empty.issues[0]?.message).toBe("Pass `patches` or `spec`.");
  });
});

describe("server helpers", () => {
  it("declares tools without execute", () => {
    const declarations = getToolDeclarations(withSpec());
    expect(Object.keys(declarations)).toEqual([
      "read_me",
      "show_widget",
      "edit_widget",
      "preview_widget",
      "render_spec",
    ]);
    expect(declarations.show_widget).toEqual({
      description: expect.stringContaining("Shows a visual widget"),
      inputSchema: expect.objectContaining({
        required: ["title", "widget_code"],
      }),
    });
    expect("execute" in declarations.show_widget).toBe(false);
  });

  it("builds instructions with optional preloaded guidance", async () => {
    const plain = await buildWidgetInstructions(createWidgetTools());
    expect(plain).toContain("## Visual widgets");
    expect(plain).not.toContain("render_spec");
    const preloaded = await buildWidgetInstructions(withSpec(), {
      preload: { modules: ["spec"] },
    });
    expect(preloaded).toContain(
      "`render_spec` after loading the `spec` module",
    );
    expect(preloaded).toContain("# Declarative UI");
    const withoutModule = await buildWidgetInstructions(
      createWidgetTools({ extraTools: createSpecTools(catalog) }),
    );
    expect(withoutModule).toContain("use `render_spec`.");
    expect(withoutModule).not.toContain("`spec` module");
  });
});
