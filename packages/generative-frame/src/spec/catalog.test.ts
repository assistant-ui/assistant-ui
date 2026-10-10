// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createActionDispatcher } from "./actions";
import { defineCatalog, type PropsSchema } from "./catalog";
import { createStateStore } from "./state";
import type { Spec } from "./types";
import { formatSpecIssues, validateSpec } from "./validate";

const catalog = defineCatalog({
  components: {
    Stack: {
      description: "Vertical layout.",
      props: {
        type: "object",
        properties: { gap: { type: "string", enum: ["sm", "md"] } },
      },
      slots: ["default"],
    },
    Card: {
      description: "A titled panel.",
      props: {
        type: "object",
        properties: { title: { type: "string", description: "Heading text" } },
        required: ["title"],
        additionalProperties: false,
      },
      slots: ["default", "footer"],
    },
    Metric: {
      description: "A big number.",
      props: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "number" } },
        required: ["label", "value"],
      },
    },
    Button: {
      description: "A button.",
      props: {
        type: "object",
        properties: { label: { type: "string" } },
        required: ["label"],
      },
      events: ["press"],
    },
  },
  actions: {
    refresh: {
      description: "Reloads data.",
      params: {
        type: "object",
        properties: { range: { type: "string" } },
        required: ["range"],
      },
    },
  },
});

const validSpec = (): Spec => ({
  root: "main",
  state: { range: "7d" },
  elements: {
    main: { type: "Stack", props: { gap: "md" }, children: ["card"] },
    card: {
      type: "Card",
      props: { title: "Revenue" },
      children: ["m"],
      slots: { footer: ["b"] },
    },
    m: {
      type: "Metric",
      props: { label: "Total", value: { $state: "/total" } },
    },
    b: {
      type: "Button",
      props: { label: "Refresh" },
      on: {
        press: [{ action: "refresh", params: { range: { $state: "/range" } } }],
      },
    },
  },
});

describe("defineCatalog", () => {
  it("validates props and treats expressions as placeholders", () => {
    expect(
      catalog.validateProps("Metric", { label: "x", value: { $state: "/n" } }),
    ).toEqual([]);
    expect(catalog.validateProps("Metric", { label: 1 })).toEqual([
      { path: "/value", message: "is required" },
      { path: "/label", message: "expected string, got integer" },
    ]);
    expect(catalog.action("setState")?.description).toMatch(/Writes/);
    expect(catalog.component("toString")).toBeUndefined();
  });

  it("accepts Standard Schema props that expose JSON Schema", () => {
    const standard = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (value: unknown) =>
          typeof (value as { n?: unknown }).n === "number"
            ? { value }
            : {
                issues: [
                  { message: "n must be a number", path: [{ key: "n" }] },
                ],
              },
        jsonSchema: {
          input: () => ({
            type: "object",
            properties: { n: { type: "number" } },
            required: ["n"],
          }),
        },
      },
    };
    const zodLike = defineCatalog({
      components: { N: { description: "n", props: standard } },
    });
    expect(zodLike.validateProps("N", { n: "x" })).toEqual([
      { path: "/n", message: "n must be a number" },
    ]);
    expect(zodLike.validateProps("N", { n: { $state: "/n" } })).toEqual([]);
    expect(zodLike.prompt()).toContain("props: { n: number }");
  });

  it("accepts Standard Schema result optionals with explicit undefined", () => {
    type StandardResult =
      | { readonly value: unknown; readonly issues?: undefined }
      | {
          readonly issues: ReadonlyArray<{
            readonly message: string;
            readonly path?:
              | ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
              | undefined;
          }>;
        };

    const standard: PropsSchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (): StandardResult => ({
          issues: [{ message: "invalid", path: undefined }],
        }),
      },
    };
    const schema = defineCatalog({
      components: { N: { description: "n", props: standard } },
    });

    expect(schema.validateProps("N", {})).toEqual([
      { path: "/", message: "invalid" },
    ]);
  });
});

describe("catalog.prompt", () => {
  it("documents components, slots, events, actions, the protocol, and expressions", () => {
    const prompt = catalog.prompt({ customRules: ["Prefer cards."] });
    expect(prompt).toContain(
      "### Card\nA titled panel.\nprops: { title: string }\n  - title: Heading text\nchildren: `children`, `slots.footer`",
    );
    expect(prompt).toContain(
      "### Metric\nA big number.\nprops: { label: string; value: number }\nchildren: none",
    );
    expect(prompt).toContain("events: `press`");
    expect(prompt).toContain(
      "- `refresh` — params `{ range: string }`. Reloads data.",
    );
    expect(prompt).toContain("- `setState`");
    expect(prompt).toContain('{"op":"add","path":"/root","value":"main"}');
    expect(prompt).toContain("$bindState");
    expect(prompt).toContain("- Prefer cards.");
    expect(prompt).toContain("Output only patch lines");
  });

  it("switches to fenced output in inline mode and is deterministic", () => {
    const inline = catalog.prompt({ mode: "inline", omitExample: true });
    expect(inline).toContain("```spec");
    expect(inline).not.toContain("## Example");
    expect(catalog.prompt({ mode: "inline", omitExample: true })).toBe(inline);
  });
});

describe("validateSpec", () => {
  it("accepts a valid spec", () => {
    expect(validateSpec(validSpec(), catalog)).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("reports structured errors with JSON Pointers", () => {
    const spec = validSpec();
    spec.elements["main"]!.children = ["card", "ghost"];
    spec.elements["m"]!.children = ["b"];
    spec.elements["card"]!.props = { title: 3, extra: true };
    spec.elements["card"]!.slots = { header: ["b"] };
    spec.elements["b"]!.on = {
      click: { action: "launch" },
      press: { action: "refresh", params: {} },
    };
    spec.elements["x"] = { type: "Chart" };
    const { ok, issues } = validateSpec(spec, catalog);
    expect(ok).toBe(false);
    expect(issues.map((issue) => [issue.code, issue.path])).toEqual([
      ["missing-child", "/elements/main/children/1"],
      ["invalid-props", "/elements/card/props/title"],
      ["invalid-props", "/elements/card/props/extra"],
      ["unknown-slot", "/elements/card/slots/header"],
      ["children-not-allowed", "/elements/m/children"],
      ["unknown-event", "/elements/b/on/click"],
      ["unknown-action", "/elements/b/on/click/action"],
      ["invalid-params", "/elements/b/on/press/params/range"],
      ["unknown-type", "/elements/x/type"],
      ["unreachable", "/elements/x"],
    ]);
    const text = formatSpecIssues(issues);
    expect(text).toContain("The spec has 9 errors");
    expect(text).toContain(
      '- /elements/x/type: Element "x" has unknown type "Chart". Known: Stack, Card, Metric, Button.',
    );
    expect(text).toContain(
      'Warnings:\n- /elements/x: "x" is not reachable from the root.',
    );
  });

  it("finds cycles, including self references", () => {
    const spec: Spec = {
      root: "a",
      elements: {
        a: { type: "Stack", children: ["b"] },
        b: { type: "Stack", children: ["a", "b"] },
      },
    };
    const cycles = validateSpec(spec, catalog).issues.filter(
      (i) => i.code === "cycle",
    );
    expect(cycles.map((issue) => issue.message)).toEqual([
      "Children form a cycle: a → b → a.",
      "Children form a cycle: b → b.",
    ]);
  });

  it("tolerates not-yet-streamed children and root in partial mode", () => {
    const spec: Spec = {
      root: "main",
      elements: { main: { type: "Stack", children: ["later"] } },
    };
    expect(validateSpec(spec, catalog, { partial: true }).ok).toBe(true);
    expect(
      validateSpec({ root: "main", elements: {} }, catalog, { partial: true })
        .ok,
    ).toBe(true);
    expect(
      validateSpec({ root: "", elements: {} }, catalog).issues[0]?.code,
    ).toBe("missing-root");
  });
});

describe("state store and actions", () => {
  it("keeps user writes when the spec's state streams in", () => {
    const store = createStateStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set("filter", "open");
    store.seed({ a: 2, filter: "all", rows: [] });
    expect(store.getState()).toEqual({ a: 2, filter: "open", rows: [] });
    expect(store.get("/filter")).toBe("open");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("dispatches setState and catalog actions with resolved params", async () => {
    const store = createStateStore({ range: "7d", items: [{ id: 1 }] });
    const refresh = vi.fn(() => "refreshed");
    const onError = vi.fn();
    const dispatch = createActionDispatcher({
      store,
      catalog,
      handlers: { refresh },
      onError,
    });
    const results = await dispatch(
      [
        {
          action: "setState",
          params: { path: "/range", value: { $event: "/next" } },
        },
        {
          action: "refresh",
          params: { range: { $state: "/range" }, id: { $item: "/id" } },
        },
      ],
      {
        elementId: "b",
        trigger: "press",
        payload: { next: "30d" },
        item: { id: 7 },
      },
    );
    expect(store.get("/range")).toBe("30d");
    expect(refresh).toHaveBeenCalledWith(
      { range: "30d", id: 7 },
      { elementId: "b", trigger: "press", state: store },
    );
    expect(results).toEqual([undefined, "refreshed"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("routes unhandled catalog actions to onAction and reports unknown ones", async () => {
    const store = createStateStore();
    const onAction = vi.fn();
    const onError = vi.fn();
    const dispatch = createActionDispatcher({
      store,
      catalog,
      onAction,
      onError,
    });
    await dispatch({ action: "refresh", params: { range: "1d" } }, {});
    await dispatch({ action: "explode" }, {});
    await dispatch({ action: "setState", params: {} }, {});
    expect(onAction).toHaveBeenCalledWith(
      "refresh",
      { range: "1d" },
      { state: store },
    );
    expect(
      onError.mock.calls.map(([error]) => (error as Error).message),
    ).toEqual(['Unknown action "explode"', "setState needs a string `path`"]);
  });
});
