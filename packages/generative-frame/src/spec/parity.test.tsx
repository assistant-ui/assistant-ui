// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { defineCatalog } from "./catalog";
import { SpecRenderer as ReactSpecRenderer } from "./react/SpecRenderer";
import { createStateStore } from "./state";
import type { Spec } from "./types";
import {
  SpecRenderer as VueSpecRenderer,
  type SpecRendererProps as VueSpecRendererProps,
} from "./vue/SpecRenderer";

const catalog = defineCatalog({
  components: {
    Stack: { description: "Layout", slots: ["default", "footer"] },
    Text: {
      description: "Text",
      props: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
    Button: {
      description: "Button",
      props: {
        type: "object",
        properties: { label: { type: "string" } },
        required: ["label"],
      },
      events: ["press"],
    },
    Toggle: {
      description: "Checkbox",
      props: {
        type: "object",
        properties: { checked: { type: "boolean" } },
      },
    },
    Boom: { description: "Throws" },
  },
  actions: {
    first: { description: "First" },
    fail: { description: "Failure" },
    last: { description: "Last" },
    refresh: { description: "Refresh" },
  },
});

const reactComponents = {
  Stack: ({
    children,
    slots,
  }: {
    children: React.ReactNode;
    slots: Record<string, React.ReactNode>;
  }) => (
    <section>
      {children}
      {slots["footer"] && <footer>{slots["footer"]}</footer>}
    </section>
  ),
  Text: ({ props }: { props: { text: string } }) => <p>{props.text}</p>,
  Button: ({
    props,
    emit,
  }: {
    props: { label: string };
    emit: (event: string, payload: unknown) => void;
  }) => (
    <button type="button" onClick={() => emit("press", { at: 1 })}>
      {props.label}
    </button>
  ),
  Toggle: ({
    props,
    setProp,
  }: {
    props: { checked?: boolean };
    setProp: (name: string, value: unknown) => void;
  }) => (
    <input
      type="checkbox"
      checked={props.checked ?? false}
      onChange={(event) => setProp("checked", event.target.checked)}
    />
  ),
  Boom: () => {
    throw new Error("kaboom");
  },
};

const vueComponents = {
  Stack: defineComponent({
    setup(_, { slots }) {
      return () =>
        h("section", [
          slots.default?.(),
          slots.footer ? h("footer", slots.footer()) : null,
        ]);
    },
  }),
  Text: defineComponent({
    props: { text: String },
    setup(props) {
      return () => h("p", props.text);
    },
  }),
  Button: defineComponent({
    props: { label: String },
    emits: ["press"],
    setup(props, { emit }) {
      return () =>
        h(
          "button",
          { type: "button", onClick: () => emit("press", { at: 1 }) },
          props.label,
        );
    },
  }),
  Toggle: defineComponent({
    props: { checked: Boolean },
    emits: ["update:checked"],
    setup(props, { emit }) {
      return () =>
        h("input", {
          type: "checkbox",
          checked: props.checked,
          onChange: (event: Event) =>
            emit("update:checked", (event.target as HTMLInputElement).checked),
        });
    },
  }),
  Boom: defineComponent({
    setup() {
      return () => {
        throw new Error("kaboom");
      };
    },
  }),
};

type ActionCall = {
  name: string;
  params: Record<string, unknown>;
  elementId: string;
  trigger: string;
};
type ReportedError = { message: string; elementId: string | null };
type Result = {
  text: string[];
  actions: ActionCall[];
  placeholders: string[];
  inputs: boolean[];
  containers: string[];
  errors: ReportedError[];
};
type Step =
  | { kind: "update"; spec?: Spec; streaming?: boolean; expected: Result }
  | { kind: "click"; selector: string; expected: Result }
  | {
      kind: "setState";
      path: string;
      value: unknown;
      expected: Result;
      retainedInputOrder?: number[];
    };
type Fixture = {
  name: string;
  spec: Spec;
  streaming?: boolean;
  expected: Result;
  steps?: Step[];
};

const tree = (elements: Spec["elements"], state: Spec["state"] = {}): Spec => ({
  root: "main",
  elements,
  state,
});
const result = (
  text: string[],
  placeholders: string[] = [],
  actions: ActionCall[] = [],
  containers: string[] = [],
  inputs: boolean[] = [],
  errors: ReportedError[] = [],
): Result => ({
  text,
  actions,
  placeholders,
  containers,
  inputs,
  errors,
});
const call = (
  name: string,
  params: Record<string, unknown>,
  elementId: string,
  trigger: string,
): ActionCall => ({
  name,
  params,
  elementId,
  trigger,
});

const fixtures: Fixture[] = [
  {
    name: "streaming children arrive and leave one pending placeholder",
    spec: tree({
      main: { type: "Stack", children: ["a", "b"] },
      a: { type: "Text", props: { text: "A" } },
    }),
    streaming: true,
    expected: result(["A"], ["pending"], [], ["section"]),
    steps: [
      {
        kind: "update",
        spec: tree({
          main: { type: "Stack", children: ["a", "b"] },
          a: { type: "Text", props: { text: "A" } },
          b: { type: "Text", props: { text: "B" } },
        }),
        expected: result(["A", "B"], ["pending"], [], ["section", "section"]),
      },
      {
        kind: "update",
        streaming: false,
        expected: result(["A", "B"], [], [], ["section", "section"]),
      },
    ],
  },
  {
    name: "invalid props retain the last valid render only while streaming",
    spec: tree({ main: { type: "Text", props: { text: "Valid" } } }),
    streaming: true,
    expected: result(["Valid"], ["pending"], [], ["root"]),
    steps: [
      {
        kind: "update",
        spec: tree({ main: { type: "Text", props: { text: 5 } } }),
        expected: result(["Valid"], ["pending"], [], ["root"]),
      },
      {
        kind: "update",
        streaming: false,
        expected: result([], ["invalid-props"]),
      },
    ],
  },
  {
    name: "unknown component type",
    spec: tree({ main: { type: "Chart" } }),
    expected: result([], ["unknown-type"]),
  },
  {
    name: "cycle through a child",
    spec: tree({ main: { type: "Stack", children: ["main"] } }),
    expected: result([], ["cycle"]),
  },
  {
    name: "throwing component reports its error and renders a placeholder",
    spec: tree({ main: { type: "Boom" } }),
    expected: result(
      [],
      ["error"],
      [],
      [],
      [],
      [{ message: "kaboom", elementId: "main" }],
    ),
  },
  {
    name: "repeat resolves item and index with a stable key",
    spec: tree(
      {
        main: {
          type: "Stack",
          repeat: { path: "/items", key: "id" },
          children: ["row", "toggle"],
        },
        row: {
          type: "Text",
          props: { text: { $template: "${$index}: ${$item/title}" } },
        },
        toggle: { type: "Toggle", props: { checked: { $bindItem: "/done" } } },
      },
      {
        items: [
          { id: "a", title: "Alpha", done: false },
          { id: "b", title: "Beta", done: true },
        ],
      },
    ),
    expected: result(
      ["0: Alpha", "1: Beta"],
      [],
      [],
      ["section", "section", "section", "section"],
      [false, true],
    ),
    steps: [
      {
        kind: "setState",
        path: "/items",
        value: [
          { id: "b", title: "Beta", done: true },
          { id: "a", title: "Alpha", done: false },
        ],
        expected: result(
          ["0: Beta", "1: Alpha"],
          [],
          [],
          ["section", "section", "section", "section"],
          [true, false],
        ),
        retainedInputOrder: [1, 0],
      },
    ],
  },
  {
    name: "named slots follow default children",
    spec: tree({
      main: { type: "Stack", children: ["body"], slots: { footer: ["foot"] } },
      body: { type: "Text", props: { text: "Body" } },
      foot: { type: "Text", props: { text: "Footer" } },
    }),
    expected: result(["Body", "Footer"], [], [], ["section", "footer"]),
  },
  {
    name: "visibility comparisons, conjunction, disjunction, negation, and unknown shapes",
    spec: tree(
      {
        main: {
          type: "Stack",
          children: ["comparison", "and", "or", "not", "unknown"],
        },
        comparison: {
          type: "Text",
          visible: { $state: "/count", gt: 2 },
          props: { text: "Compare" },
        },
        and: {
          type: "Text",
          visible: { $and: [{ $state: "/count", eq: 3 }, true] },
          props: { text: "And" },
        },
        or: {
          type: "Text",
          visible: { $or: [false, { $state: "/count", lt: 4 }] },
          props: { text: "Or" },
        },
        not: {
          type: "Text",
          visible: { not: { $state: "/open" } },
          props: { text: "Not" },
        },
        unknown: {
          type: "Text",
          visible: { mystery: true },
          props: { text: "Hidden" },
        },
      },
      { count: 3, open: false },
    ),
    expected: result(
      ["Compare", "And", "Or", "Not"],
      [],
      [],
      ["section", "section", "section", "section"],
    ),
  },
  {
    name: "template and calculation resolve state",
    spec: tree(
      {
        main: { type: "Stack", children: ["template", "calculation"] },
        template: {
          type: "Text",
          props: { text: { $template: "Count: ${/count}" } },
        },
        calculation: {
          type: "Text",
          props: { text: { $calc: "${/count} * 2 + ' total'" } },
        },
      },
      { count: 3 },
    ),
    expected: result(["Count: 3", "6 total"], [], [], ["section", "section"]),
  },
  {
    name: "conditional expression chooses a branch",
    spec: tree(
      {
        main: {
          type: "Text",
          props: {
            text: {
              $cond: { $state: "/ready" },
              $then: "Ready",
              $else: "Waiting",
            },
          },
        },
      },
      { ready: false },
    ),
    expected: result(["Waiting"], [], [], ["root"]),
    steps: [
      {
        kind: "setState",
        path: "/ready",
        value: true,
        expected: result(["Ready"], [], [], ["root"]),
      },
    ],
  },
  {
    name: "action lists run in order and stop at failure",
    spec: tree({
      main: {
        type: "Button",
        props: { label: "Run" },
        on: {
          press: [
            { action: "first", params: { from: { $event: "/at" } } },
            { action: "fail", params: { step: 2 } },
            { action: "last", params: { step: 3 } },
          ],
        },
      },
    }),
    expected: result(["Run"], [], [], ["root"]),
    steps: [
      {
        kind: "click",
        selector: "button",
        expected: result(
          ["Run"],
          [],
          [
            call("first", { from: 1 }, "main", "press"),
            call("fail", { step: 2 }, "main", "press"),
          ],
          ["root"],
          [],
          [{ message: "action failed", elementId: null }],
        ),
      },
    ],
  },
  {
    name: "bound state writes back from an input",
    spec: tree(
      {
        main: { type: "Stack", children: ["toggle", "status"] },
        toggle: { type: "Toggle", props: { checked: { $bindState: "/on" } } },
        status: {
          type: "Text",
          props: { text: { $template: "Enabled: ${/on}" } },
        },
      },
      { on: false },
    ),
    expected: result(
      ["Enabled: false"],
      [],
      [],
      ["section", "section"],
      [false],
    ),
    steps: [
      {
        kind: "click",
        selector: "input",
        expected: result(
          ["Enabled: true"],
          [],
          [],
          ["section", "section"],
          [true],
        ),
      },
      {
        kind: "setState",
        path: "/on",
        value: false,
        expected: result(
          ["Enabled: false"],
          [],
          [],
          ["section", "section"],
          [false],
        ),
      },
    ],
  },
  {
    name: "watch ignores mount and fires after a state change",
    spec: tree(
      {
        main: {
          type: "Stack",
          children: ["status"],
          watch: {
            "/range": {
              action: "refresh",
              params: { range: { $state: "/range" } },
            },
          },
        },
        status: {
          type: "Text",
          props: { text: { $template: "Range: ${/range}" } },
        },
      },
      { range: "7d" },
    ),
    expected: result(["Range: 7d"], [], [], ["section"]),
    steps: [
      {
        kind: "setState",
        path: "/range",
        value: "30d",
        expected: result(
          ["Range: 30d"],
          [],
          [call("refresh", { range: "30d" }, "main", "/range")],
          ["section"],
        ),
      },
    ],
  },
];

const mounted: ReturnType<typeof createApp>[] = [];
afterEach(() => {
  cleanup();
  for (const app of mounted.splice(0)) app.unmount();
  document.body.replaceChildren();
});

function normalize(
  container: HTMLElement,
  actions: ActionCall[],
  errors: ReportedError[],
): Result {
  return {
    text: [...container.querySelectorAll("p, button")].map(
      (node) => node.textContent ?? "",
    ),
    actions: [...actions],
    inputs: [...container.querySelectorAll("input")].map(
      (node) => node.checked,
    ),
    containers: [...container.querySelectorAll("p, button, input")].map(
      (node) =>
        node.closest("footer")
          ? "footer"
          : node.closest("section")
            ? "section"
            : "root",
    ),
    errors: [...errors],
    placeholders: [
      ...container.querySelectorAll("[data-gf-spec-placeholder]"),
    ].map((node) => node.getAttribute("data-gf-spec-placeholder") ?? ""),
  };
}

describe("React and Vue spec renderer parity", () => {
  it.each(fixtures)("$name", async (fixture) => {
    const reactStore = createStateStore(fixture.spec.state ?? {});
    const vueStore = createStateStore(fixture.spec.state ?? {});
    const reactActions: ActionCall[] = [];
    const vueActions: ActionCall[] = [];
    const reactErrors: ReportedError[] = [];
    const vueErrors: ReportedError[] = [];
    const onError =
      (reports: ReportedError[]) =>
      (error: Error, context: { elementId?: string }) => {
        reports.push({
          message: error.message,
          elementId: context.elementId ?? null,
        });
      };
    const onAction =
      (calls: ActionCall[]) =>
      (
        name: string,
        params: Record<string, unknown>,
        context: { elementId?: string; trigger?: string },
      ) => {
        calls.push(
          call(name, params, context.elementId ?? "", context.trigger ?? ""),
        );
        if (name === "fail") throw new Error("action failed");
      };
    let spec = fixture.spec;
    let streaming = fixture.streaming ?? false;
    const reactProps = () => ({
      catalog,
      components: reactComponents,
      spec,
      state: reactStore,
      streaming,
      onAction: onAction(reactActions),
      onError: onError(reactErrors),
    });
    const vueProps = (): VueSpecRendererProps => ({
      catalog,
      components: vueComponents,
      spec,
      state: vueStore,
      streaming,
      onAction: onAction(vueActions),
      onError: onError(vueErrors),
    });
    const reactView = render(<ReactSpecRenderer {...reactProps()} />);
    const vueContainer = document.createElement("div");
    document.body.append(vueContainer);
    const input = shallowRef(vueProps());
    const app = createApp(
      defineComponent({ setup: () => () => h(VueSpecRenderer, input.value) }),
    );
    app.mount(vueContainer);
    mounted.push(app);
    await nextTick();
    const initialReactInputs = [
      ...reactView.container.querySelectorAll("input"),
    ];
    const initialVueInputs = [...vueContainer.querySelectorAll("input")];

    const check = (expected: Result) => {
      expect(normalize(reactView.container, reactActions, reactErrors)).toEqual(
        expected,
      );
      expect(normalize(vueContainer, vueActions, vueErrors)).toEqual(expected);
      expect(reactErrors).toEqual(vueErrors);
    };
    check(fixture.expected);

    for (const step of fixture.steps ?? []) {
      if (step.kind === "update") {
        spec = step.spec ?? spec;
        streaming = step.streaming ?? streaming;
        reactView.rerender(<ReactSpecRenderer {...reactProps()} />);
        input.value = vueProps();
        await nextTick();
      } else if (step.kind === "click") {
        const reactTarget = reactView.container.querySelector(step.selector);
        const vueTarget = vueContainer.querySelector(step.selector);
        expect(reactTarget).not.toBeNull();
        expect(vueTarget).not.toBeNull();
        await act(async () => {
          fireEvent.click(reactTarget!);
        });
        fireEvent.click(vueTarget!);
        await nextTick();
      } else {
        act(() => reactStore.set(step.path, step.value));
        vueStore.set(step.path, step.value);
        await nextTick();
      }
      check(step.expected);
      if (step.kind === "setState" && step.retainedInputOrder) {
        const reactInputs = [...reactView.container.querySelectorAll("input")];
        const vueInputs = [...vueContainer.querySelectorAll("input")];
        expect(reactInputs).toHaveLength(step.retainedInputOrder.length);
        expect(vueInputs).toHaveLength(step.retainedInputOrder.length);
        step.retainedInputOrder.forEach((index, position) => {
          expect(reactInputs[position]).toBe(initialReactInputs[index]);
          expect(vueInputs[position]).toBe(initialVueInputs[index]);
        });
      }
    }
  });
});
