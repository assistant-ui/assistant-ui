import { startTransition, Suspense, useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
} from "@testing-library/react";
import { useEffect, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import { createStateStore, type SpecStateStore } from "../state";
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

const confirmationCatalog = defineCatalog({
  components: catalog.components,
  actions: {
    refresh: { description: "Reload" },
    deleteItem: { description: "Deletes an item", confirm: true },
  },
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
  it("formats props and action params with the host locale", () => {
    const input = spec(
      {
        main: { type: "Stack", children: ["amount", "save", "saved"] },
        amount: { type: "Text", props: { text: { $calc: "number(1234.5)" } } },
        save: {
          type: "Button",
          props: { label: "Save" },
          on: {
            press: {
              action: "setState",
              params: { path: "/saved", value: { $calc: "number(1234.5)" } },
            },
          },
        },
        saved: { type: "Text", props: { text: { $state: "/saved" } } },
      },
      { saved: "" },
    );
    const view = render(
      <SpecRenderer components={components} spec={input} locale="de-DE" />,
    );
    expect(view.container.textContent).toBe("1.234,5Save");
    fireEvent.click(view.getByText("Save"));
    expect(view.container.textContent).toBe("1.234,5Save1.234,5");
  });

  it("retries a failed element when the locale changes", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    const hosts: SpecComponents = {
      ...components,
      Price: ({ props }: SpecComponentProps<{ text: string }>) => {
        if (props.text !== "1,234.5") throw new Error("Unsupported format");
        return <p>{props.text}</p>;
      },
      Editor: () => {
        const [value, setValue] = useState("");
        return (
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        );
      },
    };
    const input = spec({
      main: { type: "Stack", children: ["price", "editor"] },
      price: { type: "Price", props: { text: { $calc: "number(1234.5)" } } },
      editor: { type: "Editor" },
    });
    try {
      const view = render(
        <SpecRenderer
          components={hosts}
          spec={input}
          locale="de-DE"
          onError={onError}
        />,
      );
      expect(view.container.textContent).toBe(
        "Price failed: Unsupported format",
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Unsupported format" }),
        { elementId: "price" },
      );
      const editor = view.container.querySelector("input")!;
      fireEvent.change(editor, { target: { value: "draft" } });
      view.rerender(
        <SpecRenderer
          components={hosts}
          spec={input}
          locale="en-US"
          onError={onError}
        />,
      );
      expect(view.container.textContent).toBe("1,234.5");
      expect(
        view.container.querySelector('[data-gf-spec-placeholder="error"]'),
      ).toBeNull();
      expect(view.container.querySelector("input")).toBe(editor);
      expect(editor.value).toBe("draft");
    } finally {
      error.mockRestore();
    }
  });

  it.each([
    { children: [], copies: 5000 },
    { children: ["missing"], copies: 100 },
    { children: ["main"], copies: 100 },
    { children: ["missing", "main"], copies: 100 },
    { children: ["invalid"], copies: 100 },
  ])(
    "bounds repeat expansion for $children children",
    ({ children, copies }) => {
      const repeated = spec(
        {
          main: {
            type: "Stack",
            repeat: { path: "/items" },
            children: Array.from({ length: 50 }, () => children).flat(),
          },
          invalid: { props: {} } as never,
        },
        { items: Array(copies).fill(null) },
      );
      const view = render(
        <SpecRenderer components={components} spec={repeated} />,
      );
      expect(view.container.querySelectorAll("section")).toHaveLength(0);
      expect(
        view.container.querySelectorAll(
          '[data-gf-spec-placeholder="too-large"]',
        ),
      ).toHaveLength(1);

      view.rerender(
        <SpecRenderer components={components} spec={repeated} streaming />,
      );
      expect(view.container.querySelectorAll("section")).toHaveLength(0);
      expect(
        view.container.querySelectorAll('[data-gf-spec-placeholder="pending"]'),
      ).toHaveLength(1);
    },
  );

  it("ignores default entries in named slots when applying the budget", () => {
    const view = render(
      <SpecRenderer
        components={{
          ...components,
          Stack: ({ children, slots }) => (
            <section>
              {children}
              <footer>{Object.values(slots)}</footer>
            </section>
          ),
        }}
        spec={spec({
          main: {
            type: "Stack",
            children: ["leaf"],
            slots: { default: Array(5000).fill("leaf"), footer: ["leaf"] },
          },
          leaf: { type: "Text", props: { text: "Safe" } },
        })}
      />,
    );
    expect(view.container.querySelectorAll("p")).toHaveLength(2);
    expect(view.container.querySelector("footer")?.textContent).toBe("Safe");
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="too-large"]'),
    ).toBeNull();
  });

  it("keeps the last fitting tree while streaming and replaces oversized nested repeats with one placeholder", () => {
    const nested = spec({
      main: { type: "Stack", repeat: { path: "/items" }, children: ["middle"] },
      middle: {
        type: "Stack",
        repeat: { path: "/items" },
        children: ["inner"],
      },
      inner: { type: "Stack", repeat: { path: "/items" }, children: ["leaf"] },
      leaf: { type: "Text", props: { text: "Safe" } },
    });
    const state = createStateStore({ items: [1] });
    const view = render(
      <SpecRenderer
        components={components}
        spec={nested}
        state={state}
        streaming
      />,
    );
    expect(view.container.querySelectorAll("p")).toHaveLength(1);

    act(() => state.set("/items", Array(200).fill(1)));
    expect(view.container.querySelectorAll("p")).toHaveLength(1);
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="too-large"]'),
    ).toBeNull();

    view.rerender(
      <SpecRenderer components={components} spec={nested} state={state} />,
    );
    expect(view.container.querySelectorAll("p")).toHaveLength(0);
    expect(
      view.container.querySelectorAll('[data-gf-spec-placeholder="too-large"]'),
    ).toHaveLength(1);
  });

  it("runs a watch for a write made while the last fitting tree is shown", () => {
    const onAction = vi.fn();
    const nested = spec({
      main: { type: "Stack", children: ["label", "grid"] },
      label: {
        type: "Text",
        props: { text: { $state: "/x" } },
        watch: { "/x": { action: "refresh" } },
      },
      grid: { type: "Stack", repeat: { path: "/items" }, children: ["row"] },
      row: { type: "Stack", repeat: { path: "/items" }, children: ["leaf"] },
      leaf: { type: "Text", props: { text: "Cell" } },
    });
    const state = createStateStore({ x: "a", items: [1] });
    render(
      <SpecRenderer
        components={components}
        spec={nested}
        state={state}
        onAction={onAction}
        streaming
      />,
    );
    act(() => state.set("/items", Array(100).fill(1)));
    act(() => state.set("/x", "b"));
    expect(onAction).not.toHaveBeenCalled();
    act(() => state.set("/items", [1]));
    expect(onAction).toHaveBeenCalledOnce();
  });

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

  it("removes one repeated item with a formula and appends another", () => {
    const store = createStateStore({
      items: [
        { id: "a", title: "First" },
        { id: "b", title: "Second" },
        { id: "c", title: "Third" },
      ],
    });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        state={store}
        spec={spec({
          main: { type: "Stack", children: ["list", "add"] },
          list: {
            type: "Stack",
            repeat: { path: "/items", key: "id" },
            children: ["title", "remove"],
          },
          title: { type: "Text", props: { text: { $item: "/title" } } },
          remove: {
            type: "Button",
            props: { label: "Remove" },
            on: {
              press: {
                action: "setState",
                params: {
                  path: "/items",
                  value: { $calc: "without(${/items}, ${$index})" },
                },
              },
            },
          },
          add: {
            type: "Button",
            props: { label: "Add" },
            on: {
              press: {
                action: "setState",
                params: {
                  path: "/items/-",
                  value: { id: "d", title: "Fourth" },
                },
              },
            },
          },
        })}
      />,
    );
    expect(view.container.textContent).toBe(
      "FirstRemoveSecondRemoveThirdRemoveAdd",
    );
    fireEvent.click(view.getAllByRole("button", { name: "Remove" })[1]!);
    expect(store.get("/items")).toEqual([
      { id: "a", title: "First" },
      { id: "c", title: "Third" },
    ]);
    expect(view.container.textContent).toBe("FirstRemoveThirdRemoveAdd");
    fireEvent.click(view.getByRole("button", { name: "Add" }));
    expect(store.get("/items")).toEqual([
      { id: "a", title: "First" },
      { id: "c", title: "Third" },
      { id: "d", title: "Fourth" },
    ]);
    expect(view.container.textContent).toBe(
      "FirstRemoveThirdRemoveFourthRemoveAdd",
    );
  });

  it("writes a root binding and preserves it through reseeding and restoration", () => {
    const store = createStateStore({ name: "model" });
    const view = render(
      <SpecRenderer
        state={store}
        spec={spec({
          main: { type: "Form", props: { value: { $bindState: "" } } },
        })}
        components={{
          Form: ({ props, setProp }: SpecComponentProps) => (
            <button
              type="button"
              onClick={() => setProp("value", { name: "edited" })}
            >
              {JSON.stringify(props["value"])}
            </button>
          ),
        }}
      />,
    );
    expect(view.container.textContent).toBe('{"name":"model"}');
    fireEvent.click(view.getByRole("button"));
    expect(store.getState()).toEqual({ name: "edited" });
    expect(view.container.textContent).toBe('{"name":"edited"}');
    act(() => store.seed({ name: "replacement", extra: true }));
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

  it.each(["state", "item"])(
    "replaces a %s-bound array item without growing the list",
    (binding) => {
      const store = createStateStore({ items: [false, true] });
      const view = render(
        <SpecRenderer
          catalog={catalog}
          components={components}
          state={store}
          spec={spec({
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
          })}
        />,
      );
      fireEvent.click(view.getAllByRole("checkbox")[0]!);
      expect(store.get("/items")).toEqual([true, true]);
      fireEvent.click(view.getAllByRole("checkbox")[0]!);
      expect(store.get("/items")).toEqual([false, true]);
      act(() => store.seed({ items: [true, false], extra: "streamed" }));
      expect(store.getState()).toEqual({
        items: [false, false],
        extra: "streamed",
      });
      expect(
        createStateStore(
          { items: [true, false] },
          { writes: store.writes() },
        ).get("/items"),
      ).toEqual([false, false]);
    },
  );

  it("writes repeated bindings under the empty-string state key", () => {
    const store = createStateStore({ "": [{ value: false }] });
    const view = render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        state={store}
        spec={spec({
          main: {
            type: "Stack",
            repeat: { path: "/" },
            children: ["item"],
          },
          item: {
            type: "Toggle",
            props: { checked: { $bindItem: "/value" } },
          },
        })}
      />,
    );

    fireEvent.click(view.getByRole("checkbox"));

    expect(store.get("//0/value")).toBe(true);
    expect(store.get("/0")).toBeUndefined();
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

  it("confirms protected actions, then stops a declined list without an error", async () => {
    const calls: string[] = [];
    const confirmAction = vi.fn(async () => {
      calls.push("confirm");
      return true;
    });
    const deleteItem = vi.fn(() => calls.push("delete"));
    const onError = vi.fn();
    const store = createStateStore();
    const tree = spec({
      main: {
        type: "Button",
        props: { label: "Delete" },
        on: {
          press: [
            { action: "refresh" },
            { action: "deleteItem", params: { id: { $event: "/at" } } },
            { action: "setState", params: { path: "/done", value: true } },
          ],
        },
      },
    });
    const props = {
      spec: tree,
      catalog: confirmationCatalog,
      components,
      state: store,
      handlers: { refresh: () => calls.push("refresh"), deleteItem },
      onError,
    };
    const view = render(
      <SpecRenderer {...props} confirmAction={confirmAction} />,
    );
    await act(async () => fireEvent.click(view.getByText("Delete")));
    expect(calls).toEqual(["refresh", "confirm", "delete"]);
    expect(confirmAction).toHaveBeenCalledExactlyOnceWith({
      action: "deleteItem",
      params: { id: 1 },
      elementId: "main",
    });
    expect(store.get("/done")).toBe(true);

    act(() => store.set("/done", false));
    calls.length = 0;
    view.rerender(<SpecRenderer {...props} confirmAction={() => false} />);
    await act(async () => fireEvent.click(view.getByText("Delete")));
    expect(calls).toEqual(["refresh"]);
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(store.get("/done")).toBe(false);
    expect(onError).not.toHaveBeenCalled();

    view.rerender(<SpecRenderer {...props} />);
    await act(async () => fireEvent.click(view.getByText("Delete")));
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0].message).toContain("confirm option");
  });

  it("runs the confirmed action when its binding changes while approval is pending", async () => {
    let approve!: (approved: boolean) => void;
    const approval = new Promise<boolean>((resolve) => {
      approve = resolve;
    });
    const confirmAction = vi.fn(() => approval);
    const deleteItem = vi.fn();
    const refresh = vi.fn();
    const binding = { action: "deleteItem", params: { id: 7 } };
    const view = render(
      <SpecRenderer
        catalog={confirmationCatalog}
        components={components}
        handlers={{ deleteItem, refresh }}
        confirmAction={confirmAction}
        spec={spec({
          main: {
            type: "Button",
            props: { label: "Delete" },
            on: { press: binding },
          },
        })}
      />,
    );
    await act(async () => fireEvent.click(view.getByText("Delete")));
    expect(confirmAction).toHaveBeenCalledExactlyOnceWith({
      action: "deleteItem",
      params: { id: 7 },
      elementId: "main",
    });
    expect(deleteItem).not.toHaveBeenCalled();
    binding.action = "refresh";
    await act(async () => approve(true));
    expect(deleteItem).toHaveBeenCalledExactlyOnceWith(
      { id: 7 },
      expect.objectContaining({ elementId: "main", kind: "event" }),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "uses committed handlers when replacement suspension is %s",
    async (blocked) => {
      let approve!: (approved: boolean) => void;
      const approval = new Promise<boolean>((resolve) => {
        approve = resolve;
      });
      const confirmAction = vi.fn(() => approval);
      const committed = vi.fn();
      const replacement = vi.fn();
      const didSuspend = vi.fn();
      const suspension = new Promise<void>(() => {});
      function Suspender({ blocked }: { blocked: boolean }) {
        if (blocked) {
          didSuspend();
          throw suspension;
        }
        return null;
      }
      const tree = spec({
        main: {
          type: "Button",
          props: { label: "Delete" },
          on: { press: { action: "deleteItem" } },
        },
      });
      const content = (handler: typeof committed, blocked = false) => (
        <Suspense fallback={<p>Loading</p>}>
          <SpecRenderer
            spec={tree}
            catalog={confirmationCatalog}
            components={components}
            handlers={{ deleteItem: handler }}
            confirmAction={confirmAction}
          />
          <Suspender blocked={blocked} />
        </Suspense>
      );
      const view = render(content(committed));
      await act(async () => fireEvent.click(view.getByText("Delete")));
      expect(confirmAction).toHaveBeenCalledOnce();
      await act(async () => {
        startTransition(() => view.rerender(content(replacement, blocked)));
      });
      if (blocked) expect(didSuspend).toHaveBeenCalled();
      else expect(didSuspend).not.toHaveBeenCalled();
      expect(view.queryByText("Loading")).toBeNull();
      await act(async () => approve(true));
      if (blocked) {
        expect(committed).toHaveBeenCalledExactlyOnceWith(
          {},
          expect.objectContaining({ elementId: "main", kind: "event" }),
        );
        expect(replacement).not.toHaveBeenCalled();
      } else {
        expect(replacement).toHaveBeenCalledExactlyOnceWith(
          {},
          expect.objectContaining({ elementId: "main", kind: "event" }),
        );
        expect(committed).not.toHaveBeenCalled();
      }
      view.rerender(content(committed));
    },
  );

  it("never confirms a protected watch action", async () => {
    const confirmAction = vi.fn(() => true);
    const deleteItem = vi.fn();
    const onError = vi.fn();
    const store = createStateStore({ value: 0 });
    render(
      <SpecRenderer
        catalog={confirmationCatalog}
        components={components}
        state={store}
        handlers={{ deleteItem }}
        confirmAction={confirmAction}
        onError={onError}
        spec={spec({
          main: {
            type: "Stack",
            watch: { "/value": { action: "deleteItem" } },
          },
        })}
      />,
    );
    await act(async () => store.set("/value", 1));
    expect(confirmAction).not.toHaveBeenCalled();
    expect(deleteItem).not.toHaveBeenCalled();
    expect(onError.mock.calls[0]?.[0].message).toContain("user event");
  });

  it.each(["plain", "not", "$cond"] as const)(
    "hides an unfinished visibility condition until streamed state enables it (form: %s)",
    (form) => {
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
      const view = render(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.queryByRole("button")).toBeNull();
      stream.push(
        JSON.stringify({
          op: "add",
          path: `/elements/main/visible${form === "plain" ? "" : `/${form}`}/$state`,
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

  it("tracks the first change after switching to an equally valued watched path", () => {
    const store = createStateStore({ a: 0, b: 0 });
    const refresh = vi.fn();
    const draw = (path: string) => (
      <SpecRenderer
        components={components}
        state={store}
        handlers={{ refresh }}
        spec={spec({
          main: { type: "Stack", watch: { [path]: { action: "refresh" } } },
        })}
      />
    );
    const view = render(draw("/a"));
    view.rerender(draw("/b"));
    expect(refresh).not.toHaveBeenCalled();
    act(() => store.set("/b", 1));
    expect(refresh).toHaveBeenCalledExactlyOnceWith(
      {},
      expect.objectContaining({ trigger: "/b" }),
    );
    view.rerender(draw("/b"));
    act(() => store.set("/a", 1));
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => store.set("/b", 2));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("baselines added and re-added watches without dependency-array warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const store = createStateStore({ a: 0, b: 0 });
      const refresh = vi.fn();
      const draw = (paths: string[]) => (
        <SpecRenderer
          components={components}
          state={store}
          handlers={{ refresh }}
          spec={spec({
            main: {
              type: "Stack",
              watch: Object.fromEntries(
                paths.map((path) => [path, { action: "refresh" }]),
              ),
            },
          })}
        />
      );
      const view = render(draw(["/a"]));
      view.rerender(draw(["/a", "/b"]));
      expect(refresh).not.toHaveBeenCalled();
      act(() => store.set("/b", 1));
      expect(refresh).toHaveBeenCalledTimes(1);
      view.rerender(draw(["/b"]));
      act(() => store.set("/a", 1));
      expect(refresh).toHaveBeenCalledTimes(1);
      view.rerender(draw(["/b", "/a"]));
      expect(refresh).toHaveBeenCalledTimes(1);
      act(() => store.set("/a", 2));
      expect(refresh).toHaveBeenCalledTimes(2);
      view.rerender(draw([]));
      act(() => store.set("/b", 2));
      expect(refresh).toHaveBeenCalledTimes(2);
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
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

  it("does not dispatch a watch for streamed model state writes", () => {
    const refresh = vi.fn();
    const draw = (x: number) => (
      <SpecRenderer
        components={components}
        handlers={{ refresh }}
        spec={spec(
          { main: { type: "Stack", watch: { "/x": { action: "refresh" } } } },
          { x },
        )}
        streaming
      />
    );
    const view = render(draw(0));
    view.rerender(draw(1));
    view.rerender(draw(2));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("dispatches a watched set batched with a seed and compares later sets with the seeded value", () => {
    const store = createStateStore({ x: 0 });
    const refresh = vi.fn();
    render(
      <SpecRenderer
        components={components}
        state={store}
        handlers={{ refresh }}
        spec={spec({
          main: { type: "Stack", watch: { "/x": { action: "refresh" } } },
        })}
        streaming
      />,
    );
    act(() => store.seed({ x: 1 }));
    expect(refresh).not.toHaveBeenCalled();

    act(() => {
      store.set("/x", 2);
      store.seed({ x: 3 });
    });
    expect(store.get("/x")).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => store.seed({ x: 4 }));
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => store.set("/x", 5));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it.each(["/y", "/xy"])(
    "does not dispatch an unrelated %s set batched with a watched seed",
    (writePath) => {
      const store = createStateStore({ x: 0, y: 0, xy: 0 });
      const refresh = vi.fn();
      render(
        <SpecRenderer
          components={components}
          state={store}
          handlers={{ refresh }}
          spec={spec({
            main: { type: "Stack", watch: { "/x": { action: "refresh" } } },
          })}
        />,
      );
      act(() => {
        store.set(writePath, 1);
        store.seed({ x: 2, y: 0, xy: 0 });
      });
      expect(store.get("/x")).toBe(2);
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("pairs the watched value with the revision from its render", () => {
    const store = createStateStore({ x: 0 });
    const refresh = vi.fn();
    const Writer = ({ props }: SpecComponentProps<{ write: boolean }>) => {
      useLayoutEffect(() => {
        if (props.write) store.set("/x", 1);
      }, [props.write]);
      return null;
    };
    const draw = (write: boolean) => (
      <SpecRenderer
        components={{ ...components, Writer }}
        state={store}
        handlers={{ refresh }}
        spec={spec({
          main: {
            type: "Stack",
            watch: { "/x": { action: "refresh" } },
            children: ["writer"],
          },
          writer: { type: "Writer", props: { write } },
        })}
      />
    );
    const view = render(draw(false));
    view.rerender(draw(true));
    expect(store.get("/x")).toBe(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    { watchPath: "/x/value", writePath: "/x", value: { value: 1 } },
    { watchPath: "/x", writePath: "/x/value", value: 1 },
    { watchPath: "", writePath: "/x/value", value: 1 },
  ])(
    "dispatches a $watchPath watch for a $writePath write",
    ({ watchPath, writePath, value }) => {
      const store = createStateStore({ x: { value: 0 } });
      const refresh = vi.fn();
      render(
        <SpecRenderer
          components={components}
          state={store}
          handlers={{ refresh }}
          spec={spec({
            main: {
              type: "Stack",
              watch: { [watchPath]: { action: "refresh" } },
            },
          })}
        />,
      );
      act(() => store.set(writePath, value));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ trigger: watchPath }),
      );
    },
  );

  it.each([
    { writePath: "/items/0", watchPath: "/items/1", items: ["a", "a", "b"] },
    { writePath: "/items/-", watchPath: "/items/2", items: ["a", "b", "a"] },
  ])(
    "dispatches changed array index watches after a $writePath insert",
    ({ writePath, watchPath, items }) => {
      const store = createStateStore({ items: ["a", "b"] });
      const refresh = vi.fn();
      const unchanged = vi.fn();
      render(
        <SpecRenderer
          components={components}
          state={store}
          handlers={{ refresh, unchanged }}
          spec={spec({
            main: {
              type: "Stack",
              watch: {
                [watchPath]: {
                  action: "refresh",
                  params: { value: { $state: watchPath } },
                },
                "/items/0": { action: "unchanged" },
              },
            },
          })}
        />,
      );
      expect(refresh).not.toHaveBeenCalled();
      act(() => store.set(writePath, "a"));
      expect(store.get("/items")).toEqual(items);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledWith(
        { value: "a" },
        expect.objectContaining({ trigger: watchPath, kind: "watch" }),
      );
      expect(unchanged).not.toHaveBeenCalled();
    },
  );

  it("keeps watch dispatch for stores outside createStateStore", () => {
    const store = { ...createStateStore({ x: 0 }) };
    const refresh = vi.fn();
    render(
      <SpecRenderer
        components={components}
        state={store}
        handlers={{ refresh }}
        spec={spec({
          main: { type: "Stack", watch: { "/x": { action: "refresh" } } },
        })}
      />,
    );
    act(() => store.seed({ x: 1 }));
    expect(refresh).toHaveBeenCalledTimes(1);
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

  it("restarts a followed source from the new initial when reset", () => {
    const before: Spec = {
      root: "t",
      elements: { t: { type: "Text", props: { text: "before" } } },
    };
    const source =
      '{"op":"replace","path":"/elements/t/props/text","value":"after"}\n';
    const hook = renderHook(
      ({ initial }: { initial?: Spec }) =>
        useSpecStream({ source, ...(initial ? { initial } : {}) }),
      { initialProps: {} },
    );
    expect(hook.result.current.spec.elements["t"]?.type).toBeUndefined();

    hook.rerender({ initial: before });
    act(() => hook.result.current.reset());
    expect(hook.result.current.spec.elements["t"]).toEqual({
      type: "Text",
      props: { text: "after" },
    });
  });
});

describe("SpecRenderer model state", () => {
  it.each([false, true])(
    "clears a removed model base while preserving user writes (external: %s)",
    (external) => {
      const initial = spec(
        {
          main: { type: "Stack", children: ["label", "toggle"] },
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
      const view = render(
        <SpecRenderer
          components={components}
          spec={initial}
          {...optionalState}
        />,
      );
      fireEvent.click(view.container.querySelector("input")!);
      expect(view.container.textContent).toBe(external ? "external" : "model");
      view.rerender(
        <SpecRenderer components={components} spec={next} {...optionalState} />,
      );
      expect(view.container.textContent).toBe(external ? "external" : "");
      expect(view.container.querySelector("input")!.checked).toBe(true);
      view.rerender(
        <SpecRenderer
          components={components}
          spec={{ ...next }}
          {...optionalState}
        />,
      );
      expect(view.container.textContent).toBe(external ? "external" : "");
      expect(view.container.querySelector("input")!.checked).toBe(true);
    },
  );
});

it("does not dispatch a root watch when mounting a spec without state", () => {
  const refresh = vi.fn();
  const view = render(
    <SpecRenderer
      components={components}
      handlers={{ refresh }}
      spec={{
        root: "main",
        elements: {
          main: {
            type: "Button",
            props: { label: "change" },
            watch: { "": { action: "refresh" } },
            on: {
              press: {
                action: "setState",
                params: { path: "/count", value: 1 },
              },
            },
          },
        },
      }}
    />,
  );
  expect(refresh).not.toHaveBeenCalled();
  fireEvent.click(view.getByRole("button"));
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("isolates the empty model base between renderer instances", () => {
  const stores: SpecStateStore[] = [];
  const capture = ({ state }: SpecComponentProps) => {
    stores.push(state);
    return null;
  };
  const input: Spec = {
    root: "capture",
    elements: { capture: { type: "Capture" } },
  };
  const mount = () =>
    render(<SpecRenderer spec={input} components={{ Capture: capture }} />);
  const first = mount();
  const firstState = stores.at(-1)!.getState();
  first.unmount();
  mount();
  const secondState = stores.at(-1)!.getState();
  expect(secondState).not.toBe(firstState);
  firstState["name"] = "first renderer";
  expect(secondState).toEqual({});
  mount();
  expect(stores.at(-1)!.getState()).toEqual({});
});
