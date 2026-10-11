import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import { createStateStore } from "../state";
import type { Spec } from "../types";
import {
  SpecRenderer,
  type SpecComponentProps,
  type SpecComponents,
} from "./SpecRenderer";
import { useSpecStream } from "./useSpecStream";

afterEach(cleanup);

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
  },
  actions: { refresh: { description: "Reload" } },
});

const components: SpecComponents = {
  Stack: ({ id, children, slots }: SpecComponentProps) => (
    <section data-id={id}>
      {children}
      {slots["footer"] && <footer>{slots["footer"]}</footer>}
    </section>
  ),
  Text: ({ props }: SpecComponentProps<{ text: string }>) => (
    <p>{props.text}</p>
  ),
  Button: ({ props, emit }: SpecComponentProps<{ label: string }>) => (
    <button type="button" onClick={() => emit("press", { at: 1 })}>
      {props.label}
    </button>
  ),
  Toggle: ({
    props,
    setProp,
  }: SpecComponentProps<{ checked?: boolean; label?: string }>) => (
    <label>
      <input
        type="checkbox"
        checked={props.checked ?? false}
        onChange={(event) => setProp("checked", event.target.checked)}
      />
      {props.label}
    </label>
  ),
  Boom: () => {
    throw new Error("kaboom");
  },
};

const spec = (elements: Spec["elements"], state: Spec["state"] = {}): Spec => ({
  root: "main",
  elements,
  state,
});

describe("SpecRenderer", () => {
  it("renders the tree, resolves expressions, and runs setState on events", () => {
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec(
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
        )}
      />,
    );
    expect(view.container.textContent).toBe("Count: 0Add");
    fireEvent.click(view.getByText("Add"));
    expect(view.container.textContent).toBe("Count: 5AddPositive");
    expect(view.container.querySelector("footer")?.textContent).toBe(
      "Positive",
    );
  });

  it("writes bound props back to state and repeats children per item", () => {
    const store = createStateStore({
      todos: [
        { id: "a", title: "Write", done: false },
        { id: "b", title: "Ship", done: true },
      ],
    });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        state={store}
        spec={spec({
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
        })}
      />,
    );
    const boxes = view.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => box.checked)).toEqual([false, true]);
    expect(view.container.textContent).toBe("WriteShip");
    fireEvent.click(boxes[0]!);
    expect(store.get("/todos/0/done")).toBe(true);
    expect((view.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("sends catalog actions to handlers and onAction", () => {
    const refresh = vi.fn();
    const onAction = vi.fn();
    const elements = {
      main: { type: "Stack", children: ["a"] },
      a: {
        type: "Button",
        props: { label: "Go" },
        on: {
          press: { action: "refresh", params: { from: { $event: "/at" } } },
        },
      },
    };
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        handlers={{ refresh }}
        spec={spec(elements)}
      />,
    );
    fireEvent.click(view.getByText("Go"));
    expect(refresh).toHaveBeenCalledWith(
      { from: 1 },
      expect.objectContaining({ elementId: "a", trigger: "press" }),
    );
    view.unmount();

    const second = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        onAction={onAction}
        spec={spec(elements)}
      />,
    );
    fireEvent.click(second.getByText("Go"));
    expect(onAction).toHaveBeenCalledWith(
      "refresh",
      { from: 1 },
      expect.objectContaining({ elementId: "a" }),
    );
  });

  it("renders placeholders instead of throwing", () => {
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        onError={onError}
        spec={spec({
          main: {
            type: "Stack",
            children: ["unknown", "bad", "missing", "boom", "main"],
          },
          unknown: { type: "Chart" },
          bad: { type: "Text", props: { text: 4 } },
          boom: { type: "Boom" },
        })}
      />,
    );
    const placeholders = [
      ...view.container.querySelectorAll("[data-gf-spec-placeholder]"),
    ].map((el) => [
      el.getAttribute("data-gf-spec-placeholder"),
      el.textContent,
    ]);
    expect(placeholders).toEqual([
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

  it("shows pending children while streaming and keeps user state when spec state streams in", () => {
    const first = spec(
      {
        main: { type: "Stack", children: ["t", "toggle"] },
        toggle: { type: "Toggle", props: { checked: { $bindState: "/on" } } },
      },
      { on: false },
    );
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={first}
        streaming
      />,
    );
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="pending"]'),
    ).not.toBeNull();
    fireEvent.click(view.getByRole("checkbox"));
    expect((view.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);

    const second = {
      ...first,
      state: { on: false, label: "Streamed" },
      elements: {
        ...first.elements,
        t: { type: "Text", props: { text: { $state: "/label" } } },
      },
    };
    view.rerender(
      <SpecRenderer catalog={catalog} components={components} spec={second} />,
    );
    expect(view.container.textContent).toBe("Streamed");
    expect((view.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("runs watch actions when a watched value changes", () => {
    const refresh = vi.fn();
    const store = createStateStore({ range: "7d" });
    render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        state={store}
        handlers={{ refresh }}
        spec={spec({
          main: {
            type: "Stack",
            watch: {
              "/range": {
                action: "refresh",
                params: { range: { $state: "/range" } },
              },
            },
          },
        })}
      />,
    );
    expect(refresh).not.toHaveBeenCalled();
    act(() => store.set("/range", "30d"));
    expect(refresh).toHaveBeenCalledWith(
      { range: "30d" },
      expect.objectContaining({ trigger: "/range" }),
    );
  });
});

describe("useSpecStream", () => {
  const lines = [
    '{"op":"add","path":"/root","value":"main"}',
    '{"op":"add","path":"/elements/main","value":{"type":"Text","props":{"text":"a"}}}',
  ];

  it("follows a growing source and only changes the spec when a patch lands", () => {
    const { result, rerender } = renderHook(
      (source: string) => useSpecStream({ source }),
      {
        initialProps: `${lines[0]}\n`,
      },
    );
    const afterRoot = result.current.spec;
    expect(afterRoot.root).toBe("main");
    rerender(`${lines[0]}\n{"op":"add","path":"/elem`);
    expect(result.current.spec).toBe(afterRoot);
    rerender(`${lines.join("\n")}\n`);
    expect(result.current.spec.elements["main"]?.props).toEqual({ text: "a" });
    rerender("something else\n");
    expect(result.current.spec.root).toBe("");
    expect(result.current.errors).toHaveLength(1);
  });

  it("applies a final line without a newline once complete", () => {
    const { result, rerender } = renderHook(
      ({ complete }: { complete: boolean }) =>
        useSpecStream({ source: lines.join("\n"), complete }),
      { initialProps: { complete: false } },
    );
    expect(result.current.spec.elements["main"]).toBeUndefined();
    rerender({ complete: true });
    expect(result.current.spec.elements["main"]).toBeDefined();
  });

  it("supports imperative push and end with inline prose", () => {
    const { result } = renderHook(() => useSpecStream({ mode: "inline" }));
    act(() => result.current.push(`Intro\n${lines[0]}\n`));
    act(() => result.current.push(lines[1]!));
    expect(result.current.text).toBe("Intro\n");
    act(() => result.current.end());
    expect(result.current.spec.elements["main"]).toBeDefined();
    act(() => result.current.reset());
    expect(result.current.spec.root).toBe("");
  });
});
