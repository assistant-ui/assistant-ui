// @vitest-environment jsdom
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  shallowRef,
  ref,
  type App,
  type Component,
} from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import { createStateStore } from "../state";
import { createSpecStream } from "../stream";
import type { Spec } from "../types";
import {
  SpecRenderer,
  useSpecElement,
  type SpecComponents,
  type SpecRendererProps,
} from "./SpecRenderer";

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
        properties: { checked: { type: "boolean" }, label: { type: "string" } },
      },
    },
    Boom: { description: "Throws" },
    Photo: {
      description: "Image",
      props: { type: "object", properties: { src: {} } },
    },
    Picture: {
      description: "Image",
      props: { type: "object", properties: { src: { type: "string" } } },
    },
  },
  actions: { refresh: { description: "Reload" } },
});
const components: SpecComponents = {
  Stack: defineComponent({
    setup(_, { slots }) {
      const { id } = useSpecElement();
      return () =>
        h("section", { "data-id": id }, [
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
    props: { checked: Boolean, label: String },
    emits: ["update:checked"],
    setup(props, { emit }) {
      return () =>
        h("label", [
          h("input", {
            type: "checkbox",
            checked: props.checked,
            onChange: (event: Event) =>
              emit(
                "update:checked",
                (event.target as HTMLInputElement).checked,
              ),
          }),
          props.label,
        ]);
    },
  }),
  Boom: defineComponent({
    setup() {
      return () => {
        throw new Error("kaboom");
      };
    },
  }),
  Photo: defineComponent({
    props: ["src"],
    setup(props) {
      return () => {
        if (typeof props["src"] !== "string") {
          throw new Error("src is not text");
        }
        return h("img", { alt: "", src: props["src"] });
      };
    },
  }),
  Picture: defineComponent({
    props: ["src"],
    setup(props) {
      return () => h("img", { alt: "", src: props["src"] });
    },
  }),
};
const spec = (elements: Spec["elements"], state: Spec["state"] = {}): Spec => ({
  root: "main",
  elements,
  state,
});
const mounted: App[] = [];
function mount(props: SpecRendererProps) {
  const container = document.createElement("div");
  document.body.append(container);
  const input = shallowRef(props);
  const app = createApp(
    defineComponent({ setup: () => () => h(SpecRenderer, input.value) }),
  );
  app.mount(container);
  mounted.push(app);
  return {
    container,
    update: async (next: SpecRendererProps) => {
      input.value = next;
      await nextTick();
    },
  };
}
const click = async (element: Element) => {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await nextTick();
};
afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("SpecRenderer", () => {
  it.each(["default", "footer"])(
    "preserves repeated child identities when %s siblings move",
    async (slot) => {
      const Editor = defineComponent({
        setup() {
          const value = ref("");
          return () =>
            h("input", {
              value: value.value,
              onInput: (event: Event) => {
                value.value = (event.target as HTMLInputElement).value;
              },
            });
        },
      });
      const registry = { ...components, Editor };
      const draw = (ids: string[]): SpecRendererProps => ({
        components: registry,
        spec: spec({
          main: {
            type: "Stack",
            ...(slot === "default"
              ? { children: ids }
              : { slots: { footer: ids } }),
          },
          editor: { type: "Editor" },
          other: { type: "Editor" },
          label: { type: "Text", props: { text: "new label" } },
        }),
      });
      const view = mount(draw(["editor", "editor", "other"]));
      const [first, second, other] = [
        ...view.container.querySelectorAll("input"),
      ];
      for (const [input, value] of [
        [first!, "first draft"],
        [second!, "second draft"],
        [other!, "other draft"],
      ] as const) {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await nextTick();
      second!.focus();
      await view.update(draw(["label", "other", "editor", "editor"]));
      expect([...view.container.querySelectorAll("input")]).toEqual([
        other,
        first,
        second,
      ]);
      expect(
        [...view.container.querySelectorAll("input")].map(
          (input) => input.value,
        ),
      ).toEqual(["other draft", "first draft", "second draft"]);
      expect(document.activeElement).toBe(second);
      await view.update(draw(["editor", "editor"]));
      expect([...view.container.querySelectorAll("input")]).toEqual([
        first,
        second,
      ]);
      expect(document.activeElement).toBe(second);
    },
  );

  it("renders expressions, default and named slots, visibility, and event setState", async () => {
    const view = mount({
      catalog,
      components,
      spec: spec(
        {
          main: {
            type: "Stack",
            children: ["label", "inc"],
            slots: { footer: ["more"] },
          },
          label: {
            type: "Text",
            props: { text: { $template: "Count: ${/count}" } },
          },
          inc: {
            type: "Button",
            props: { label: "Add" },
            on: {
              press: {
                action: "setState",
                params: { path: "/count", value: 5 },
              },
            },
          },
          more: {
            type: "Text",
            visible: { $state: "/count", gt: 0 },
            props: { text: "Positive" },
          },
        },
        { count: 0 },
      ),
    });
    expect(view.container.textContent).toBe("Count: 0Add");
    await click(view.container.querySelector("button")!);
    expect(view.container.textContent).toBe("Count: 5AddPositive");
    expect(view.container.querySelector("footer")?.textContent).toBe(
      "Positive",
    );
  });

  it("writes bound props, repeats item scoped children, and keeps the same input node", async () => {
    const store = createStateStore({
      todos: [
        { id: "a", title: "Write", done: false },
        { id: "b", title: "Ship", done: true },
      ],
    });
    const view = mount({
      catalog,
      components,
      state: store,
      spec: spec({
        main: {
          type: "Stack",
          repeat: { path: "/todos", key: "id" },
          children: ["todo"],
        },
        todo: {
          type: "Toggle",
          props: {
            checked: { $bindItem: "/done" },
            label: { $item: "/title" },
          },
        },
      }),
    });
    const boxes = [
      ...view.container.querySelectorAll("input"),
    ] as HTMLInputElement[];
    expect(boxes.map((box) => box.checked)).toEqual([false, true]);
    expect(view.container.textContent).toBe("WriteShip");
    await click(boxes[0]!);
    expect(store.get("/todos/0/done")).toBe(true);
    expect(view.container.querySelector("input")).toBe(boxes[0]);
    expect(boxes[0]!.checked).toBe(true);
  });

  it("writes a root binding and preserves it through reseeding and restoration", async () => {
    const store = createStateStore({ name: "model" });
    const view = mount({
      state: store,
      spec: spec({
        main: { type: "Form", props: { value: { $bindState: "" } } },
      }),
      components: {
        Form: defineComponent({
          props: { value: Object },
          emits: ["update:value"],
          setup(props, { emit }) {
            return () =>
              h(
                "button",
                {
                  onClick: () => emit("update:value", { name: "edited" }),
                },
                JSON.stringify(props.value),
              );
          },
        }),
      },
    });
    expect(view.container.textContent).toBe('{"name":"model"}');
    await click(view.container.querySelector("button")!);
    expect(store.getState()).toEqual({ name: "edited" });
    expect(view.container.textContent).toBe('{"name":"edited"}');
    store.seed({ name: "replacement", extra: true });
    await nextTick();
    expect(store.getState()).toEqual({ name: "edited" });
    expect(view.container.textContent).toBe('{"name":"edited"}');
    const restored = createStateStore(
      { name: "restored" },
      {
        writes: JSON.parse(JSON.stringify(store.writes())),
      },
    );
    expect(restored.getState()).toEqual({ name: "edited" });
  });

  it("writes repeated bindings under the empty-string state key", async () => {
    const store = createStateStore({ "": [{ value: false }] });
    const view = mount({
      catalog,
      components,
      state: store,
      spec: spec({
        main: {
          type: "Stack",
          repeat: { path: "/" },
          children: ["item"],
        },
        item: {
          type: "Toggle",
          props: { checked: { $bindItem: "/value" } },
        },
      }),
    });

    await click(view.container.querySelector("input")!);

    expect(store.get("//0/value")).toBe(true);
    expect(store.get("/0")).toBeUndefined();
  });

  it("sends emitted payloads to handlers and onAction", async () => {
    const refresh = vi.fn();
    const onAction = vi.fn();
    const tree = spec({
      main: { type: "Stack", children: ["a"] },
      a: {
        type: "Button",
        props: { label: "Go" },
        on: {
          press: { action: "refresh", params: { from: { $event: "/at" } } },
        },
      },
    });
    const view = mount({
      catalog,
      components,
      handlers: { refresh },
      spec: tree,
    });
    await click(view.container.querySelector("button")!);
    expect(refresh).toHaveBeenCalledWith(
      { from: 1 },
      expect.objectContaining({ elementId: "a", trigger: "press" }),
    );
    await view.update({ catalog, components, onAction, spec: tree });
    await click(view.container.querySelector("button")!);
    expect(onAction).toHaveBeenCalledWith(
      "refresh",
      { from: 1 },
      expect.objectContaining({ elementId: "a" }),
    );
  });

  it("renders an element again once it changes after its component threw", async () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const photo = (path: string) =>
      spec(
        { main: { type: "Photo", props: { src: { $state: path } } } },
        { tools },
      );
    const failing = photo("/tools");
    const view = mount({
      catalog,
      components,
      spec: failing,
      streaming: true,
    });
    await nextTick();
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="error"]'),
    ).toBeNull();

    await view.update({ catalog, components, spec: failing });
    expect(view.container.textContent).toContain("Photo failed");

    await view.update({ catalog, components, spec: photo("/tools/photos/0") });
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/bridge.jpg",
    );
  });

  it("keeps an element's last valid render while the spec streams", async () => {
    const mounted = vi.fn();
    const Text = defineComponent({
      props: { text: String },
      setup(props) {
        onMounted(mounted);
        return () => h("p", props.text);
      },
    });
    const probe = { ...components, Text };
    const text = (value: unknown) =>
      spec({ main: { type: "Text", props: { text: value } } });
    const view = mount({
      catalog,
      components: probe,
      spec: text("Hi"),
      streaming: true,
    });
    await view.update({
      catalog,
      components: probe,
      spec: text(5),
      streaming: true,
    });
    expect(view.container.querySelector("p")?.textContent).toBe("Hi");
    expect(
      view.container.querySelector(
        '[data-gf-spec-placeholder="invalid-props"]',
      ),
    ).toBeNull();

    await view.update({
      catalog,
      components: probe,
      spec: text("Hello"),
      streaming: true,
    });
    expect(view.container.querySelector("p")?.textContent).toBe("Hello");
    expect(mounted).toHaveBeenCalledTimes(1);

    await view.update({ catalog, components: probe, spec: text(5) });
    expect(view.container.querySelector("p")).toBeNull();
    expect(
      view.container.querySelector(
        '[data-gf-spec-placeholder="invalid-props"]',
      ),
    ).not.toBeNull();
  });

  it("does not stand an element of another type in for one that is still invalid", async () => {
    const view = mount({
      catalog,
      components,
      spec: spec({ main: { type: "Text", props: { text: "Hi" } } }),
      streaming: true,
    });
    await view.update({
      catalog,
      components,
      spec: spec({ main: { type: "Picture", props: { src: 5 } } }),
      streaming: true,
    });
    expect(view.container.querySelector("p")).toBeNull();
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("does not carry accepted props over to an element's new type", async () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const view = mount({
      catalog,
      components,
      spec: spec({ main: { type: "Text", props: { text: "Hi" } } }, { tools }),
      streaming: true,
    });
    await view.update({
      catalog,
      components,
      spec: spec(
        { main: { type: "Picture", props: { src: { $state: "/tools" } } } },
        { tools },
      ),
      streaming: true,
    });
    expect(view.container.querySelector("p")).toBeNull();
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("keeps an element's last accepted props while a bound value streams", async () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const picture = (src: unknown) =>
      spec({ main: { type: "Picture", props: { src } } }, { tools });
    const view = mount({
      catalog,
      components,
      spec: picture("https://example.com/first.jpg"),
      streaming: true,
    });
    await view.update({
      catalog,
      components,
      spec: picture({ $state: "/tools" }),
      streaming: true,
    });
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/first.jpg",
    );

    await view.update({
      catalog,
      components,
      spec: picture({ $state: "/tools" }),
    });
    expect(view.container.querySelector("img")).toBeNull();
    expect(
      view.container.querySelector(
        '[data-gf-spec-placeholder="invalid-props"]',
      ),
    ).not.toBeNull();
  });

  it("writes a held element's binding to the path it shows", async () => {
    const store = createStateStore({ form: { agree: false } });
    const Toggle = defineComponent({
      props: { checked: Boolean },
      emits: ["update:checked"],
      setup(props, { emit }) {
        const element = useSpecElement();
        return () =>
          h("label", [
            h("input", {
              type: "checkbox",
              checked: props.checked,
              onChange: (event: Event) =>
                emit(
                  "update:checked",
                  (event.target as HTMLInputElement).checked,
                ),
            }),
            h("span", element.bindings["checked"]),
          ]);
      },
    });
    const probe = { ...components, Toggle };
    const toggle = (path: string) =>
      spec({
        main: { type: "Toggle", props: { checked: { $bindState: path } } },
      });
    const view = mount({
      catalog,
      components: probe,
      state: store,
      spec: toggle("/f"),
      streaming: true,
    });
    await view.update({
      catalog,
      components: probe,
      state: store,
      spec: toggle("/form"),
      streaming: true,
    });
    expect(view.container.querySelector("span")?.textContent).toBe("/f");
    await click(view.container.querySelector("input")!);
    expect(store.getState()).toEqual({ form: { agree: false }, f: true });
  });

  it("shows an element's problem only once the spec stops streaming", async () => {
    const broken = spec({
      main: { type: "Stack", children: ["a", "b"] },
      a: { type: "Text", props: { text: 5 } },
      b: { type: "Nope" },
    });
    const view = mount({
      catalog,
      components,
      spec: broken,
      streaming: true,
    });
    const reasons = () =>
      [...view.container.querySelectorAll("[data-gf-spec-placeholder]")].map(
        (node) => node.getAttribute("data-gf-spec-placeholder"),
      );
    expect(reasons()).toEqual(["pending"]);

    await view.update({ catalog, components, spec: broken });
    expect(reasons()).toEqual(["invalid-props", "unknown-type"]);
  });

  it("waits for a primitive prop to resolve while streaming", async () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const picture = (path: string) =>
      spec(
        { main: { type: "Picture", props: { src: { $state: path } } } },
        { tools },
      );
    const view = mount({
      catalog,
      components,
      spec: picture("/tools"),
      streaming: true,
    });
    expect(
      [...view.container.querySelectorAll("[data-gf-spec-placeholder]")].map(
        (node) => node.getAttribute("data-gf-spec-placeholder"),
      ),
    ).toEqual(["pending"]);
    expect(view.container.querySelector("img")).toBeNull();

    await view.update({
      catalog,
      components,
      spec: picture("/tools/photos/0"),
    });
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/bridge.jpg",
    );
  });

  it("shows invalid props when a primitive prop resolves to an object", () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const view = mount({
      catalog,
      components,
      spec: spec(
        { main: { type: "Picture", props: { src: { $state: "/tools" } } } },
        { tools },
      ),
    });
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="invalid-props"]')
        ?.textContent,
    ).toBe("Picture: src expected string, got object");
  });

  it.each(["plain", "not", "$cond"] as const)(
    "hides an unfinished visibility condition until streamed state enables it (form: %s)",
    async (form) => {
      const negated = form !== "plain";
      const stream = createSpecStream({
        initial: spec(
          {
            main: {
              type: "Button",
              props: { label: "Continue" },
              visible:
                form === "$cond"
                  ? { $cond: {}, $then: false, $else: true }
                  : negated
                    ? { not: {} }
                    : {},
            },
          },
          { open: negated },
        ),
      });
      const view = mount({ components, spec: stream.spec, streaming: true });
      expect(view.container.querySelector("button")).toBeNull();
      stream.push(
        JSON.stringify({
          op: "add",
          path: `/elements/main/visible${form === "plain" ? "" : `/${form}`}/$state`,
          value: "/open",
        }) + "\n",
      );
      await view.update({ components, spec: stream.spec, streaming: true });
      expect(view.container.querySelector("button")).toBeNull();
      stream.push(
        JSON.stringify({
          op: "replace",
          path: "/state/open",
          value: !negated,
        }) + "\n",
      );
      await view.update({ components, spec: stream.spec, streaming: true });
      expect(view.container.querySelector("button")?.textContent).toBe(
        "Continue",
      );
      stream.push(
        JSON.stringify({ op: "replace", path: "/state/open", value: negated }) +
          "\n",
      );
      await view.update({ components, spec: stream.spec });
      expect(view.container.querySelector("button")).toBeNull();
    },
  );

  it("renders placeholders and captures each element error", async () => {
    const onError = vi.fn();
    const view = mount({
      catalog,
      components,
      onError,
      spec: spec({
        main: {
          type: "Stack",
          children: ["unknown", "bad", "missing", "boom", "main"],
        },
        unknown: { type: "Chart" },
        bad: { type: "Text", props: { text: 4 } },
        boom: { type: "Boom" },
      }),
    });
    await nextTick();
    expect(
      [...view.container.querySelectorAll("[data-gf-spec-placeholder]")].map(
        (el) => [el.getAttribute("data-gf-spec-placeholder"), el.textContent],
      ),
    ).toEqual([
      ["unknown-type", 'Unknown component "Chart"'],
      ["invalid-props", "Text: text expected string, got integer"],
      ["missing", 'Missing element "missing"'],
      ["error", "Boom failed: kaboom"],
      ["cycle", '"main" contains itself'],
    ]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "kaboom" }),
      { elementId: "boom" },
    );
  });

  it("shows pending children and re-seeds while preserving user writes", async () => {
    const first = spec(
      {
        main: { type: "Stack", children: ["t", "toggle"] },
        toggle: { type: "Toggle", props: { checked: { $bindState: "/on" } } },
      },
      { on: false },
    );
    const view = mount({ catalog, components, spec: first, streaming: true });
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="pending"]'),
    ).not.toBeNull();
    await click(view.container.querySelector("input")!);
    expect(
      (view.container.querySelector("input") as HTMLInputElement).checked,
    ).toBe(true);
    const second: Spec = {
      ...first,
      state: { on: false, label: "Streamed" },
      elements: {
        ...first.elements,
        t: { type: "Text", props: { text: { $state: "/label" } } },
      },
    };
    await view.update({ catalog, components, spec: second });
    expect(view.container.textContent).toBe("Streamed");
    expect(
      (view.container.querySelector("input") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("shows one pending placeholder after the spec while it streams", async () => {
    const streamed = (elements: Spec["elements"]) =>
      spec({
        main: {
          type: "Stack",
          children: ["a", "b", "c"],
          slots: { footer: ["f"] },
        },
        a: { type: "Text", props: { text: "A" } },
        ...elements,
      });
    const complete = streamed({
      b: { type: "Text", props: { text: "B" } },
      c: { type: "Text", props: { text: "C" } },
      f: { type: "Text", props: { text: "F" } },
    });
    const view = mount({
      catalog,
      components,
      spec: streamed({}),
      streaming: true,
    });
    const pending = () =>
      view.container.querySelectorAll('[data-gf-spec-placeholder="pending"]');
    expect(pending()).toHaveLength(1);
    expect(pending()[0]?.previousElementSibling?.tagName).toBe("SECTION");
    expect(view.container.querySelector("section")?.textContent).toBe("A");

    await view.update({ catalog, components, spec: complete, streaming: true });
    expect(pending()).toHaveLength(1);

    await view.update({ catalog, components, spec: streamed({}) });
    expect(pending()).toHaveLength(0);
    expect(
      view.container.querySelectorAll('[data-gf-spec-placeholder="missing"]'),
    ).toHaveLength(3);
  });

  it("keeps elements mounted when the spec stops streaming", async () => {
    const mounted = vi.fn();
    const Text = defineComponent({
      props: { text: String },
      setup(props) {
        onMounted(mounted);
        return () => h("p", props.text);
      },
    });
    const probe = { ...components, Text };
    const done = spec({ main: { type: "Text", props: { text: "Hi" } } });
    const view = mount({
      catalog,
      components: probe,
      spec: done,
      streaming: true,
    });
    await view.update({ catalog, components: probe, spec: done });
    expect(view.container.textContent).toBe("Hi");
    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it("shows a pending placeholder until the root arrives", async () => {
    const empty: Spec = { root: "", elements: {} };
    const view = mount({ catalog, components, spec: empty, streaming: true });
    expect(
      view.container.querySelectorAll('[data-gf-spec-placeholder="pending"]'),
    ).toHaveLength(1);

    await view.update({ catalog, components, spec: empty });
    expect(
      view.container.querySelector("[data-gf-spec-placeholder]"),
    ).toBeNull();
  });

  it("tracks replacement watches from their first subsequent change", async () => {
    const store = createStateStore({ a: 0, b: 0 });
    const refresh = vi.fn();
    const draw = (paths: string[]): SpecRendererProps => ({
      components,
      state: store,
      handlers: { refresh },
      spec: spec({
        main: {
          type: "Stack",
          watch: Object.fromEntries(
            paths.map((path) => [path, { action: "refresh" }]),
          ),
        },
      }),
    });
    const view = mount(draw(["/a"]));
    await view.update(draw(["/b"]));
    expect(refresh).not.toHaveBeenCalled();
    store.set("/b", 1);
    await nextTick();
    expect(refresh).toHaveBeenCalledExactlyOnceWith(
      {},
      expect.objectContaining({ trigger: "/b" }),
    );
    store.set("/a", 1);
    await nextTick();
    expect(refresh).toHaveBeenCalledTimes(1);
    await view.update(draw(["/b", "/a"]));
    expect(refresh).toHaveBeenCalledTimes(1);
    store.set("/a", 2);
    await nextTick();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it.each(["state", "item"])(
    "replaces a %s-bound array item without growing the list",
    async (binding) => {
      const store = createStateStore({ items: [false, true] });
      const view = mount({
        catalog,
        components,
        state: store,
        spec: spec({
          main: {
            type: "Stack",
            children: ["toggle"],
            ...(binding === "item" ? { repeat: { path: "/items" } } : {}),
          },
          toggle: {
            type: "Toggle",
            props: {
              checked:
                binding === "item"
                  ? { $bindItem: "" }
                  : { $bindState: "/items/0" },
            },
          },
        }),
      });
      const toggle = view.container.querySelector("input")!;
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      await nextTick();
      expect(store.get("/items")).toEqual([true, true]);
      expect(view.container.querySelectorAll("input")).toHaveLength(
        binding === "item" ? 2 : 1,
      );
      store.seed({ items: [false, false], extra: "streamed" });
      await nextTick();
      expect(store.getState()).toEqual({
        items: [true, false],
        extra: "streamed",
      });
    },
  );

  it("runs watch actions after watched state changes", async () => {
    const refresh = vi.fn();
    const store = createStateStore({ range: "7d" });
    mount({
      catalog,
      components,
      state: store,
      handlers: { refresh },
      spec: spec({
        main: {
          type: "Stack",
          watch: {
            "/range": {
              action: "refresh",
              params: { range: { $state: "/range" } },
            },
          },
        },
      }),
    });
    expect(refresh).not.toHaveBeenCalled();
    store.set("/range", "30d");
    await nextTick();
    expect(refresh).toHaveBeenCalledWith(
      { range: "30d" },
      expect.objectContaining({ trigger: "/range" }),
    );
  });

  it("provides element context to the host component", () => {
    let context: ReturnType<typeof useSpecElement> | undefined;
    const Probe: Component = defineComponent({
      setup() {
        const current = useSpecElement();
        context = current;
        return () => h("div", current.id);
      },
    });
    const store = createStateStore({ value: "ready" });
    mount({
      components: { Probe },
      state: store,
      streaming: true,
      spec: spec({
        main: { type: "Probe", props: { value: { $bindState: "/value" } } },
      }),
    });
    expect(context?.id).toBe("main");
    expect(context?.element.type).toBe("Probe");
    expect(context?.bindings).toEqual({ value: "/value" });
    expect(context?.state).toBe(store);
    expect(context?.streaming).toBe(true);
  });

  it("passes only declared array and object props without DOM fallthrough", () => {
    const hosts = {
      Stack: components.Stack!,
      ArrayHost: defineComponent({
        props: ["safeValue"],
        setup(props) {
          return () => h("div", props.safeValue);
        },
      }),
      ObjectHost: defineComponent({
        props: { safeValue: String },
        setup(props) {
          return () => h("div", props.safeValue);
        },
      }),
      BareHost: defineComponent({
        setup() {
          return () => h("div", "bare");
        },
      }),
    };
    const hostile = {
      "safe-value": "accepted",
      innerHTML: "<img src=x>",
      style: "color: red",
      class: "injected",
      href: "https://example.com",
      key: "injected",
      ref: "injected",
    };
    const view = mount({
      components: hosts,
      spec: spec({
        main: { type: "Stack", children: ["array", "object", "bare"] },
        array: { type: "ArrayHost", props: hostile },
        object: { type: "ObjectHost", props: hostile },
        bare: { type: "BareHost", props: hostile },
      }),
    });
    const roots = [...view.container.querySelectorAll("section > div")];
    expect(roots.map((root) => root.textContent)).toEqual([
      "accepted",
      "accepted",
      "bare",
    ]);
    for (const root of roots) {
      expect(root.getAttribute("style")).toBeNull();
      expect(root.getAttribute("class")).toBeNull();
      expect(root.getAttribute("href")).toBeNull();
      expect(root.querySelector("img")).toBeNull();
    }
  });

  it("listens only for events a component declares in emits", async () => {
    const refresh = vi.fn();
    const Bare = defineComponent({
      setup(_, { emit }) {
        return () =>
          h("button", { type: "button", onClick: () => emit("click") }, "bare");
      },
    });
    const Declared = defineComponent({
      emits: ["click"],
      setup(_, { emit }) {
        return () =>
          h(
            "button",
            { type: "button", onClick: () => emit("click") },
            "declared",
          );
      },
    });
    const view = mount({
      components: { Stack: components.Stack!, Bare, Declared },
      handlers: { refresh },
      spec: spec({
        main: { type: "Stack", children: ["bare", "declared"] },
        bare: {
          type: "Bare",
          on: {
            click: { action: "refresh" },
            mouseover: { action: "refresh" },
          },
        },
        declared: { type: "Declared", on: { click: { action: "refresh" } } },
      }),
    });
    const [bare, declared] = view.container.querySelectorAll("button");
    bare!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await click(bare!);
    expect(refresh).not.toHaveBeenCalled();
    await click(declared!);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("dispatches update actions for a declared prop without emits", async () => {
    const store = createStateStore({ on: false });
    const refresh = vi.fn();
    const Check = defineComponent({
      props: { checked: Boolean },
      setup(_, { emit }) {
        return () =>
          h(
            "button",
            { type: "button", onClick: () => emit("update:checked", true) },
            "check",
          );
      },
    });
    const view = mount({
      components: { Check },
      state: store,
      handlers: { refresh },
      spec: spec({
        main: {
          type: "Check",
          props: { checked: { $bindState: "/on" } },
          on: { "update:checked": { action: "refresh" } },
        },
      }),
    });
    await click(view.container.querySelector("button")!);
    expect(store.get("/on")).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("matches a kebab-case spec event to its camelCase emit", async () => {
    const refresh = vi.fn();
    const Item = defineComponent({
      emits: ["itemClick"],
      setup(_, { emit }) {
        return () =>
          h(
            "button",
            { type: "button", onClick: () => emit("itemClick") },
            "item",
          );
      },
    });
    const view = mount({
      components: { Item },
      handlers: { refresh },
      spec: spec({
        main: { type: "Item", on: { "item-click": { action: "refresh" } } },
      }),
    });
    await click(view.container.querySelector("button")!);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("runs every action a spec binds to one event in either spelling", async () => {
    const refresh = vi.fn();
    const reload = vi.fn();
    const Item = defineComponent({
      emits: ["itemClick"],
      setup(_, { emit }) {
        return () =>
          h(
            "button",
            { type: "button", onClick: () => emit("itemClick") },
            "item",
          );
      },
    });
    const view = mount({
      components: { Item },
      handlers: { refresh, reload },
      spec: spec({
        main: {
          type: "Item",
          on: {
            "item-click": { action: "refresh" },
            itemClick: { action: "reload" },
          },
        },
      }),
    });
    await click(view.container.querySelector("button")!);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("accepts props and events declared through extends and mixins", async () => {
    const refresh = vi.fn();
    const Inherited = defineComponent({
      extends: defineComponent({ props: { label: String }, emits: ["press"] }),
      mixins: [defineComponent({ props: { hint: String } })],
      render() {
        return h(
          "button",
          {
            type: "button",
            title: this.hint,
            onClick: () => this.$emit("press"),
          },
          this.label,
        );
      },
    });
    const view = mount({
      components: { Inherited },
      handlers: { refresh },
      spec: spec({
        main: {
          type: "Inherited",
          props: { label: "go", hint: "tip" },
          on: { press: { action: "refresh" } },
        },
      }),
    });
    const button = view.container.querySelector("button")!;
    expect(button.textContent).toBe("go");
    expect(button.getAttribute("title")).toBe("tip");
    await click(button);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("writes a bound update before dispatching its action", async () => {
    const store = createStateStore({ on: false });
    const refresh = vi.fn();
    const view = mount({
      components,
      state: store,
      handlers: { refresh },
      spec: spec({
        main: {
          type: "Toggle",
          props: { checked: { $bindState: "/on" } },
          on: {
            "update:checked": {
              action: "refresh",
              params: { current: { $state: "/on" } },
            },
          },
        },
      }),
    });
    await click(view.container.querySelector("input")!);
    expect(store.get("/on")).toBe(true);
    expect(refresh).toHaveBeenCalledWith(
      { current: true },
      expect.objectContaining({ trigger: "update:checked" }),
    );
  });

  it("uses children as the repeated default slot despite slots.default", () => {
    const view = mount({
      components,
      state: createStateStore({ items: ["a", "b"] }),
      spec: spec({
        main: {
          type: "Stack",
          repeat: { path: "/items" },
          children: ["item"],
          slots: { default: ["wrong"], footer: ["footer"] },
        },
        item: { type: "Text", props: { text: { $item: "" } } },
        wrong: { type: "Text", props: { text: "wrong" } },
        footer: { type: "Text", props: { text: "footer" } },
      }),
    });
    expect(view.container.querySelector("section")?.textContent).toBe(
      "abfooter",
    );
  });

  it("keeps a caught error until the element changes", async () => {
    const onError = vi.fn();
    const hosts = {
      MaybeBoom: defineComponent({
        props: { fail: Boolean },
        setup(props) {
          return () => {
            if (props.fail) throw new Error("kaboom");
            return h("div", "recovered");
          };
        },
      }),
    };
    const failing = spec({
      main: { type: "MaybeBoom", props: { fail: true } },
    });
    const recovered = spec({
      main: { type: "MaybeBoom", props: { fail: false } },
    });
    const view = mount({ components: hosts, onError, spec: failing });
    await nextTick();
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="error"]'),
    ).not.toBeNull();
    await view.update({ components: hosts, onError, spec: { ...failing } });
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="error"]'),
    ).not.toBeNull();
    await view.update({ components: hosts, onError, spec: recovered });
    expect(view.container.textContent).toBe("recovered");
  });
});

describe("SpecRenderer model state", () => {
  it.each([false, true])(
    "clears a removed model base while preserving user writes (external: %s)",
    async (external) => {
      const refresh = vi.fn();
      const initial = spec(
        {
          main: {
            type: "Stack",
            children: ["label", "toggle"],
            watch: { "": { action: "refresh" } },
          },
          label: { type: "Text", props: { text: { $state: "/label" } } },
          toggle: { type: "Toggle", props: { checked: { $bindState: "/on" } } },
        },
        { label: "model", on: false },
      );
      const state = external
        ? createStateStore({ label: "external", on: false })
        : undefined;
      const optionalState = state ? { state } : {};
      const next: Spec = { root: initial.root, elements: initial.elements };
      const view = mount({
        components,
        handlers: { refresh },
        spec: initial,
        ...optionalState,
      });
      await click(view.container.querySelector("input")!);
      expect(view.container.textContent).toBe(external ? "external" : "model");
      await view.update({
        components,
        handlers: { refresh },
        spec: next,
        ...optionalState,
      });
      expect(view.container.textContent).toBe(external ? "external" : "");
      expect(view.container.querySelector("input")!.checked).toBe(true);
      await view.update({
        components,
        handlers: { refresh },
        spec: { ...next },
        ...optionalState,
      });
      expect(view.container.textContent).toBe(external ? "external" : "");
      expect(view.container.querySelector("input")!.checked).toBe(true);
      expect(refresh).toHaveBeenCalledTimes(external ? 1 : 2);
    },
  );
});
