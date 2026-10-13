// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createActionDispatcher } from "./actions";
import { defineCatalog, type PropsSchema } from "./catalog";
import { createSpecTools } from "./render-spec";
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

describe("built-in actions", () => {
  it("reserves sendMessage, updateModelContext, and copyText", () => {
    for (const name of ["sendMessage", "updateModelContext", "copyText"]) {
      expect(() =>
        defineCatalog({
          components: {},
          actions: { [name]: { description: "Host action." } },
        }),
      ).toThrow(
        `The action name "${name}" is reserved for the built-in action.`,
      );
    }
  });

  it("validates their params like any action", () => {
    const spec = validSpec();
    spec.elements["b"]!.on = {
      press: [
        { action: "sendMessage", params: { text: "Book it" } },
        { action: "updateModelContext", params: { data: { id: 1 } } },
        { action: "sendMessage", params: {} },
      ],
    };
    expect(
      validateSpec(spec, catalog).issues.map((issue) => [
        issue.code,
        issue.path,
      ]),
    ).toEqual([["invalid-params", "/elements/b/on/press/2/params/text"]]);
  });

  it("documents them only for a host that handles them", () => {
    expect(catalog.prompt()).not.toContain("`sendMessage`");
    expect(catalog.prompt()).not.toContain("`updateModelContext`");
    const both = catalog.prompt({
      hostApi: { prompt: true, modelContext: true },
    });
    expect(both).toContain("- `sendMessage` — params `{ text: string }`.");
    expect(both).toContain(
      "- `updateModelContext` — params `{ text?: string; data?: unknown }`.",
    );
    const prompt = catalog.prompt({ hostApi: { prompt: true } });
    expect(prompt).toContain("`sendMessage`");
    expect(prompt).not.toContain("`updateModelContext`");
    const context = catalog.prompt({ hostApi: { modelContext: true } });
    expect(context).toContain("`updateModelContext`");
    expect(context).not.toContain("`sendMessage`");
    expect(context).not.toContain("`copyText`");
    const clipboard = catalog.prompt({ hostApi: { clipboard: true } });
    expect(clipboard).toContain("- `copyText` — params `{ text: string }`.");
    expect(clipboard).not.toContain("`sendMessage`");
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
    expect(prompt).toContain(
      "fills `${…}` placeholders with state values; outside `$template` and `$calc`, a placeholder shows as written.",
    );
    expect(prompt).toContain(
      '`{ "$calc": "round(${/guests} * 0.5, 1) + \' lb\'" }`',
    );
    expect(prompt).toContain('"value":{"$calc":"${/count} + 1"}');
    expect(prompt).toContain("- Prefer cards.");
    expect(prompt).toContain(
      "- Open with a heading that names the answer and its one-line takeaway, then give each part of the answer its own section.\n- Make each module a `Card`: a summary, a checklist, a form, or one option, with running prose outside cards.\n- For a number the user adjusts, such as guests or servings, put it between a `-` and a `+` `Button`, each stepping it with a `setState` whose `$calc` value stays in a sensible range, and compute every amount that depends on it with `$calc`.\n- Keep lists in `/state` and render them with `repeat`, except a list a component takes as a prop, such as table rows or chart series, which you bind to that prop.\n- Keep the tree shallow and give every element a job: no filler, and no decoration that adds nothing.\n- Prefer cards.",
    );
    expect(prompt).not.toContain("`Map`");
    expect(prompt).not.toContain("`Image`");
    expect(prompt).not.toContain("about 30 elements");
    expect(prompt).toContain("Output only patch lines");
  });

  it("names the composition components the catalog has", () => {
    const names = [
      "Header",
      "Text",
      "Card",
      "Row",
      "Fact",
      "Badge",
      "Map",
      "Timeline",
      "Steps",
      "Table",
      "Image",
      "Button",
    ];
    const full = defineCatalog({
      components: {
        ...Object.fromEntries(
          names.map((name) => [name, { description: name }]),
        ),
        Card: { description: "Card", slots: ["default"] },
        Row: { description: "Row", slots: ["default"] },
        Button: { description: "Button", events: ["press"] },
      },
    });
    const prompt = full.prompt();
    expect(prompt).toContain(
      "- Open with a `Header` that names the answer and a `Text` with the one-line takeaway",
    );
    expect(prompt).toContain(
      "Put the answer's key figures side by side in a `Row` of `Fact`s. Show short tags, such as a duration or a price tier, as `Badge`s.",
    );
    expect(prompt).toContain(
      "- Put places with coordinates on a `Map`, lay out a schedule or itinerary as a `Timeline`, write instructions as `Steps`, and compare options attribute by attribute in a `Table`.",
    );
    expect(prompt).toContain(
      "never one you write yourself: lead with two or three photos in a `Row`, open each option's `Card` with its photo, or put a small photo beside each item's text.",
    );
    expect(prompt).toContain(
      "put it between a `-` and a `+` `Button` in a `Row`, each stepping it",
    );
  });

  it("leaves out uses a component's slots and events do not allow", () => {
    const flat = defineCatalog({
      components: {
        ...Object.fromEntries(
          ["Card", "Row", "Fact", "Image"].map((name) => [
            name,
            { description: name },
          ]),
        ),
        Button: { description: "Button", events: ["press"] },
      },
    });
    const prompt = flat.prompt();
    expect(prompt).toContain(
      "- Show what can be seen with `Image`, but only from an image URL a tool returned, never one you write yourself.\n",
    );
    expect(prompt).not.toContain("Make each module a `Card`");
    expect(prompt).not.toContain("a `Row` of `Fact`s");
    expect(prompt).not.toContain("`Button`, each stepping it");
    expect(prompt).not.toContain("render them with `repeat`");

    const stacked = defineCatalog({
      components: {
        Stack: { description: "Stack", slots: ["default"] },
        Image: { description: "Image" },
      },
    });
    expect(stacked.prompt()).toContain(
      "never one you write yourself: lead with two or three photos.\n",
    );

    const rowed = defineCatalog({
      components: {
        Row: { description: "Row", slots: ["default"] },
        Image: { description: "Image" },
      },
    });
    expect(rowed.prompt()).toContain(
      "never one you write yourself: lead with two or three photos in a `Row` or put a small photo beside each item's text.\n",
    );
  });

  it("carries the rules in render_spec's description, the app's last", () => {
    const { description } = createSpecTools(catalog, {
      customRules: ["Prefer cards."],
    }).render_spec;
    expect(description).toContain(
      "Every spec follows these rules:\n- Open with a heading that names the answer",
    );
    expect(description.endsWith("- Prefer cards.")).toBe(true);
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

  it("reports placeholders a plain string shows as written", () => {
    const spec = validSpec();
    spec.elements["card"]!.props = { title: "Serves ${/guests}" };
    spec.elements["m"]!.props = {
      label: { $template: "Total for ${/guests}" },
      value: { $calc: "${/total} * 2" },
    };
    spec.elements["b"]!.on = {
      press: { action: "refresh", params: { range: "${$item/range}" } },
    };
    spec.elements["b"]!.watch = {
      "/range": { action: "refresh", params: { range: "Row ${$index}" } },
    };
    spec.elements["main"]!.visible = {
      $cond: { $state: "/total" },
      $then: true,
      $else: "${ /total }",
    };
    const issues = validateSpec(spec, catalog).issues.filter(
      (issue) => issue.code === "unfilled-placeholder",
    );
    expect(issues.map((issue) => issue.path)).toEqual([
      "/elements/main/visible/$else",
      "/elements/card/props/title",
      "/elements/b/on/press/params/range",
      "/elements/b/watch/~1range/params/range",
    ]);
    expect(issues.find((issue) => issue.elementId === "card")!.message).toBe(
      '"card" shows `${/guests}` as written, since only `$template` and `$calc` fill placeholders. Write the string as `{ "$template": "…" }`, or compute the value with `$calc`.',
    );
  });

  it("reports formulas that cannot run in props, visibility, and action params", () => {
    const spec = validSpec();
    spec.elements["card"]!.props = {
      title: { $calc: "'Total: ' + number(${/total}, 2)" },
    };
    spec.elements["m"]!.props = {
      label: "Total",
      value: { $calc: "sum(${/rows}, '/price'" },
    };
    spec.elements["m"]!.visible = { $calc: "sqrt(${/total}) > 1" };
    spec.elements["b"]!.on = {
      press: [{ action: "refresh", params: { range: { $calc: 7 } } }],
    };
    const { ok, issues } = validateSpec(spec, catalog);
    expect(ok).toBe(false);
    expect(
      issues.map((issue) => [issue.code, issue.path, issue.message]),
    ).toEqual([
      [
        "invalid-formula",
        "/elements/m/props/value/$calc",
        'Formula in "m": Expected ")".',
      ],
      [
        "invalid-formula",
        "/elements/m/visible/$calc",
        'Formula in "m": Unknown function "sqrt"; known: round, floor, ceil, abs, clamp, min, max, count, sum, avg, number, currency, percent, time, plural.',
      ],
      [
        "invalid-formula",
        "/elements/b/on/press/0/params/range/$calc",
        'Formula in "b": `$calc` needs a formula string.',
      ],
    ]);
  });

  it("finds formulas at any depth and stops at repeated objects", () => {
    const spec = validSpec();
    let deep: Record<string, unknown> = { $calc: "1 +" };
    for (let i = 0; i < 100; i++) deep = { inner: deep };
    const looped: Record<string, unknown> = {};
    looped["self"] = looped;
    spec.elements["m"]!.props = { label: "Total", value: 1, deep, looped };
    const paths = validateSpec(spec, catalog)
      .issues.filter((issue) => issue.code === "invalid-formula")
      .map((issue) => issue.path);
    expect(paths).toEqual([
      `/elements/m/props/deep${"/inner".repeat(100)}/$calc`,
    ]);
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

  it("computes setState values with formulas, so a button can step a count", async () => {
    const store = createStateStore({ guests: 19 });
    const dispatch = createActionDispatcher({ store, catalog });
    const step = [
      {
        action: "setState",
        params: {
          path: "/guests",
          value: { $calc: "min(${/guests} + 1, 20)" },
        },
      },
    ];
    await dispatch(step, { elementId: "b", trigger: "press" });
    expect(store.get("/guests")).toBe(20);
    await dispatch(step, { elementId: "b", trigger: "press" });
    expect(store.get("/guests")).toBe(20);
  });

  it("stops a list at the first action that fails", async () => {
    const store = createStateStore();
    const onError = vi.fn();
    const dispatch = createActionDispatcher({
      store,
      catalog,
      handlers: {
        refresh: async () => {
          throw new Error("offline");
        },
      },
      onError,
    });
    const results = await dispatch(
      [
        { action: "refresh" },
        { action: "setState", params: { path: "/done", value: true } },
      ],
      {},
    );
    expect(store.get("/done")).toBeUndefined();
    expect(results).toEqual([undefined]);
    expect(
      onError.mock.calls.map(([error]) => (error as Error).message),
    ).toEqual(["offline"]);
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
