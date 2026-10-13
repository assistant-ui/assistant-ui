import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import { createStateStore } from "../state";
import { createSpecStream } from "../stream";
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
  Photo: ({ props }: SpecComponentProps<{ src?: string }>) => (
    <img alt="" src={props.src} />
  ),
  Picture: ({ props }: SpecComponentProps<{ src?: string }>) => (
    <img alt="" src={props.src} />
  ),
};

const spec = (elements: Spec["elements"], state: Spec["state"] = {}): Spec => ({
  root: "main",
  elements,
  state,
});

describe("SpecRenderer", () => {
  it.each(["default", "footer"])(
    "preserves repeated child identities when %s siblings move",
    (slot) => {
      function Editor() {
        const [value, setValue] = useState("");
        return (
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        );
      }
      const registry = { ...components, Editor };
      const draw = (ids: string[]) =>
        spec({
          main: {
            type: "Stack",
            ...(slot === "default"
              ? { children: ids }
              : { slots: { footer: ids } }),
          },
          editor: { type: "Editor" },
          other: { type: "Editor" },
          label: { type: "Text", props: { text: "new label" } },
        });
      const view = render(
        <SpecRenderer
          components={registry}
          spec={draw(["editor", "editor", "other"])}
        />,
      );
      const [first, second, other] = [
        ...view.container.querySelectorAll("input"),
      ];
      fireEvent.change(first!, { target: { value: "first draft" } });
      fireEvent.change(second!, { target: { value: "second draft" } });
      fireEvent.change(other!, { target: { value: "other draft" } });
      second!.focus();
      view.rerender(
        <SpecRenderer
          components={registry}
          spec={draw(["label", "other", "editor", "editor"])}
        />,
      );
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
      view.rerender(
        <SpecRenderer
          components={registry}
          spec={draw(["editor", "editor"])}
        />,
      );
      expect([...view.container.querySelectorAll("input")]).toEqual([
        first,
        second,
      ]);
      expect(document.activeElement).toBe(second);
    },
  );

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

  it.each([false, true])(
    "hides an unfinished visibility condition until streamed state enables it (negated: %s)",
    (negated) => {
      const stream = createSpecStream({
        initial: spec(
          {
            main: {
              type: "Button",
              props: { label: "Continue" },
              visible: negated ? { not: {} } : {},
            },
          },
          { open: negated },
        ),
      });
      const view = render(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.queryByRole("button")).toBeNull();
      stream.push(
        JSON.stringify({
          op: "add",
          path: `/elements/main/visible${negated ? "/not" : ""}/$state`,
          value: "/open",
        }) + "\n",
      );
      view.rerender(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.queryByRole("button")).toBeNull();
      stream.push(
        JSON.stringify({
          op: "replace",
          path: "/state/open",
          value: !negated,
        }) + "\n",
      );
      view.rerender(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.getByRole("button").textContent).toBe("Continue");
      stream.push(
        JSON.stringify({ op: "replace", path: "/state/open", value: negated }) +
          "\n",
      );
      view.rerender(
        <SpecRenderer components={components} spec={stream.spec} />,
      );
      expect(view.queryByRole("button")).toBeNull();
    },
  );

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

  it("renders an element again once it changes after its component threw", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const photo = (path: string) =>
      spec(
        { main: { type: "Photo", props: { src: { $state: path } } } },
        { tools },
      );
    const failing = photo("/tools");
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={failing}
        streaming
      />,
    );
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="error"]'),
    ).toBeNull();

    view.rerender(
      <SpecRenderer catalog={catalog} components={components} spec={failing} />,
    );
    expect(view.container.textContent).toContain("Photo failed");

    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={photo("/tools/photos/0")}
      />,
    );
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/bridge.jpg",
    );
  });

  it("keeps an element's last valid render while the spec streams", () => {
    const mounted = vi.fn();
    const Text = ({ props }: SpecComponentProps<{ text: string }>) => {
      useEffect(() => mounted(), []);
      return <p>{props.text}</p>;
    };
    const probe = { ...components, Text };
    const text = (value: unknown) =>
      spec({ main: { type: "Text", props: { text: value } } });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={probe}
        spec={text("Hi")}
        streaming
      />,
    );
    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={probe}
        spec={text(5)}
        streaming
      />,
    );
    expect(view.container.querySelector("p")?.textContent).toBe("Hi");
    expect(
      view.container.querySelector(
        '[data-gf-spec-placeholder="invalid-props"]',
      ),
    ).toBeNull();

    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={probe}
        spec={text("Hello")}
        streaming
      />,
    );
    expect(view.container.querySelector("p")?.textContent).toBe("Hello");
    expect(mounted).toHaveBeenCalledTimes(1);

    view.rerender(
      <SpecRenderer catalog={catalog} components={probe} spec={text(5)} />,
    );
    expect(view.container.querySelector("p")).toBeNull();
    expect(
      view.container.querySelector(
        '[data-gf-spec-placeholder="invalid-props"]',
      ),
    ).not.toBeNull();
  });

  it("does not stand an element of another type in for one that is still invalid", () => {
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec({ main: { type: "Text", props: { text: "Hi" } } })}
        streaming
      />,
    );
    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec({ main: { type: "Picture", props: { src: 5 } } })}
        streaming
      />,
    );
    expect(view.container.querySelector("p")).toBeNull();
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("does not carry accepted props over to an element's new type", () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec(
          { main: { type: "Text", props: { text: "Hi" } } },
          { tools },
        )}
        streaming
      />,
    );
    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec(
          { main: { type: "Picture", props: { src: { $state: "/tools" } } } },
          { tools },
        )}
        streaming
      />,
    );
    expect(view.container.querySelector("p")).toBeNull();
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("keeps an element's last accepted props while a bound value streams", () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const picture = (src: unknown) =>
      spec({ main: { type: "Picture", props: { src } } }, { tools });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={picture("https://example.com/first.jpg")}
        streaming
      />,
    );
    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={picture({ $state: "/tools" })}
        streaming
      />,
    );
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/first.jpg",
    );

    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={picture({ $state: "/tools" })}
      />,
    );
    expect(view.container.querySelector("img")).toBeNull();
    expect(
      view.container.querySelector(
        '[data-gf-spec-placeholder="invalid-props"]',
      ),
    ).not.toBeNull();
  });

  it("writes a held element's binding to the path it shows", () => {
    const store = createStateStore({ form: { agree: false } });
    const toggle = (path: string) =>
      spec({
        main: { type: "Toggle", props: { checked: { $bindState: path } } },
      });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        state={store}
        spec={toggle("/f")}
        streaming
      />,
    );
    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        state={store}
        spec={toggle("/form")}
        streaming
      />,
    );
    fireEvent.click(view.getByRole("checkbox"));
    expect(store.getState()).toEqual({ form: { agree: false }, f: true });
  });

  it("shows an element's problem only once the spec stops streaming", () => {
    const broken = spec({
      main: { type: "Stack", children: ["a", "b"] },
      a: { type: "Text", props: { text: 5 } },
      b: { type: "Nope" },
    });
    const reasons = () =>
      [...view.container.querySelectorAll("[data-gf-spec-placeholder]")].map(
        (node) => node.getAttribute("data-gf-spec-placeholder"),
      );
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={broken}
        streaming
      />,
    );
    expect(reasons()).toEqual(["pending"]);

    view.rerender(
      <SpecRenderer catalog={catalog} components={components} spec={broken} />,
    );
    expect(reasons()).toEqual(["invalid-props", "unknown-type"]);
  });

  it("waits for a primitive prop to resolve while streaming", () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const picture = (path: string) =>
      spec(
        { main: { type: "Picture", props: { src: { $state: path } } } },
        { tools },
      );
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={picture("/tools")}
        streaming
      />,
    );
    expect(
      [...view.container.querySelectorAll("[data-gf-spec-placeholder]")].map(
        (node) => node.getAttribute("data-gf-spec-placeholder"),
      ),
    ).toEqual(["pending"]);
    expect(view.container.querySelector("img")).toBeNull();

    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={picture("/tools/photos/0")}
      />,
    );
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/bridge.jpg",
    );
  });

  it("shows invalid props when a primitive prop resolves to an object", () => {
    const tools = Object.assign(Object.create(null), {
      photos: ["https://example.com/bridge.jpg"],
    });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec(
          { main: { type: "Picture", props: { src: { $state: "/tools" } } } },
          { tools },
        )}
      />,
    );
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="invalid-props"]')
        ?.textContent,
    ).toBe("Picture: src expected string, got object");
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

  it("shows one pending placeholder after the spec while it streams", () => {
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
    const pending = () =>
      view.container.querySelectorAll('[data-gf-spec-placeholder="pending"]');
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={streamed({})}
        streaming
      />,
    );
    expect(pending()).toHaveLength(1);
    expect(pending()[0]?.previousElementSibling?.tagName).toBe("SECTION");
    expect(view.container.querySelector("section")?.textContent).toBe("A");

    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={complete}
        streaming
      />,
    );
    expect(pending()).toHaveLength(1);

    view.rerender(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={streamed({})}
      />,
    );
    expect(pending()).toHaveLength(0);
    expect(
      view.container.querySelectorAll('[data-gf-spec-placeholder="missing"]'),
    ).toHaveLength(3);
  });

  it("keeps elements mounted when the spec stops streaming", () => {
    const mounted = vi.fn();
    const Text = ({ props }: SpecComponentProps<{ text: string }>) => {
      useEffect(() => mounted(), []);
      return <p>{props.text}</p>;
    };
    const probe = { ...components, Text };
    const done = spec({ main: { type: "Text", props: { text: "Hi" } } });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={probe}
        spec={done}
        streaming
      />,
    );
    view.rerender(
      <SpecRenderer catalog={catalog} components={probe} spec={done} />,
    );
    expect(view.container.textContent).toBe("Hi");
    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it("shows a pending placeholder until the root arrives", () => {
    const empty: Spec = { root: "", elements: {} };
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={empty}
        streaming
      />,
    );
    expect(
      view.container.querySelectorAll('[data-gf-spec-placeholder="pending"]'),
    ).toHaveLength(1);

    view.rerender(
      <SpecRenderer catalog={catalog} components={components} spec={empty} />,
    );
    expect(
      view.container.querySelector("[data-gf-spec-placeholder]"),
    ).toBeNull();
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
