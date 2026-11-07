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
};

type ActionCall = {
  name: string;
  params: Record<string, unknown>;
  elementId: string;
  trigger: string;
};
type Result = { text: string[]; actions: ActionCall[]; placeholders: string[] };
type Step =
  | { kind: "update"; spec?: Spec; streaming?: boolean; expected: Result }
  | { kind: "click"; selector: string; expected: Result }
  | { kind: "setState"; path: string; value: unknown; expected: Result };
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
): Result => ({
  text,
  actions,
  placeholders,
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
    expected: result(["A"], ["pending"]),
    steps: [
      {
        kind: "update",
        spec: tree({
          main: { type: "Stack", children: ["a", "b"] },
          a: { type: "Text", props: { text: "A" } },
          b: { type: "Text", props: { text: "B" } },
        }),
        expected: result(["A", "B"], ["pending"]),
      },
      { kind: "update", streaming: false, expected: result(["A", "B"]) },
    ],
  },
  {
    name: "invalid props retain the last valid render only while streaming",
    spec: tree({ main: { type: "Text", props: { text: "Valid" } } }),
    streaming: true,
    expected: result(["Valid"], ["pending"]),
    steps: [
      {
        kind: "update",
        spec: tree({ main: { type: "Text", props: { text: 5 } } }),
        expected: result(["Valid"], ["pending"]),
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
    name: "repeat resolves item and index with a stable key",
    spec: tree(
      {
        main: {
          type: "Stack",
          repeat: { path: "/items", key: "id" },
          children: ["row"],
        },
        row: {
          type: "Text",
          props: { text: { $template: "${$index}: ${$item/title}" } },
        },
      },
      {
        items: [
          { id: "a", title: "Alpha" },
          { id: "b", title: "Beta" },
        ],
      },
    ),
    expected: result(["0: Alpha", "1: Beta"]),
  },
  {
    name: "named slots follow default children",
    spec: tree({
      main: { type: "Stack", children: ["body"], slots: { footer: ["foot"] } },
      body: { type: "Text", props: { text: "Body" } },
      foot: { type: "Text", props: { text: "Footer" } },
    }),
    expected: result(["Body", "Footer"]),
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
    expected: result(["Compare", "And", "Or", "Not"]),
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
    expected: result(["Count: 3", "6 total"]),
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
    expected: result(["Waiting"]),
    steps: [
      {
        kind: "setState",
        path: "/ready",
        value: true,
        expected: result(["Ready"]),
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
    expected: result(["Run"]),
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
    expected: result(["Enabled: false"]),
    steps: [
      { kind: "click", selector: "input", expected: result(["Enabled: true"]) },
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
    expected: result(["Range: 7d"]),
    steps: [
      {
        kind: "setState",
        path: "/range",
        value: "30d",
        expected: result(
          ["Range: 30d"],
          [],
          [call("refresh", { range: "30d" }, "main", "/range")],
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

function normalize(container: HTMLElement, actions: ActionCall[]): Result {
  return {
    text: [...container.querySelectorAll("p, button")].map(
      (node) => node.textContent ?? "",
    ),
    actions: [...actions],
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
      onError: () => {},
    });
    const vueProps = (): VueSpecRendererProps => ({
      catalog,
      components: vueComponents,
      spec,
      state: vueStore,
      streaming,
      onAction: onAction(vueActions),
      onError: () => {},
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

    const check = (expected: Result) => {
      expect(normalize(reactView.container, reactActions)).toEqual(expected);
      expect(normalize(vueContainer, vueActions)).toEqual(expected);
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
    }
  });
});
