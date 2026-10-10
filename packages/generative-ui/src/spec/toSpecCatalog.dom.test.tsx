// @vitest-environment jsdom

import {
  createStateStore,
  type Spec,
  type SpecStateStore,
} from "generative-frame/spec";
import { SpecRenderer } from "generative-frame/spec/react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultGenerativeUILibrary } from "../vocabulary";
import { toSpecCatalog } from "./toSpecCatalog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { catalog, components } = toSpecCatalog(defaultGenerativeUILibrary, {
  actions: {
    pick: { description: "Records the picked size." },
    open: { description: "Opens a row." },
    save: { description: "Saves the order." },
    dismiss: { description: "Dismisses the order." },
  },
});

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

type Handler = (params: Record<string, unknown>) => unknown;

async function render(
  spec: Spec,
  handlers: Record<string, Handler> = {},
  state?: SpecStateStore,
) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={spec}
        handlers={handlers}
        {...(state ? { state } : {})}
      />,
    );
  });
  return container;
}

const query = <T extends Element>(container: Element, selector: string) => {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};

const setInputValue = (input: HTMLInputElement, value: string) =>
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!.call(input, value);

const dispatch = (target: Element, type: string) =>
  act(async () => {
    target.dispatchEvent(new Event(type, { bubbles: true }));
  });

describe("toSpecCatalog components", () => {
  it("runs the actions a Button binds to `press`", async () => {
    const container = await render({
      root: "col",
      elements: {
        col: { type: "Col", children: ["status", "go"] },
        status: { type: "Text", props: { value: { $state: "/status" } } },
        go: {
          type: "Button",
          props: { label: "Go" },
          on: {
            press: {
              action: "setState",
              params: { path: "/status", value: "started" },
            },
          },
        },
      },
      state: { status: "idle" },
    });

    await act(async () => query<HTMLElement>(container, "button").click());

    expect(query(container, '[data-aui="text"]').textContent).toBe("started");
  });

  it("writes a control's value back through `$bindState` and passes it as `$event`", async () => {
    const pick = vi.fn();
    const container = await render(
      {
        root: "col",
        elements: {
          col: { type: "Col", children: ["size", "echo"] },
          size: {
            type: "Select",
            props: {
              name: "size",
              options: [
                { label: "Small", value: "s" },
                { label: "Medium", value: "m" },
              ],
              defaultValue: { $bindState: "/size" },
            },
            on: {
              change: { action: "pick", params: { size: { $event: "" } } },
            },
          },
          echo: { type: "Text", props: { value: { $state: "/size" } } },
        },
        state: { size: "s" },
      },
      { pick },
    );

    const select = query<HTMLSelectElement>(container, "select");
    await act(async () => {
      select.value = "m";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(query(container, '[data-aui="text"]').textContent).toBe("m");
    expect(query(container, "select")).toBe(select);
    expect(pick).toHaveBeenCalledWith({ size: "m" }, expect.anything());
  });

  it("writes each edit of a bound Input inside a Form back to state", async () => {
    const container = await render({
      root: "col",
      elements: {
        col: { type: "Col", children: ["form", "echo"] },
        form: { type: "Form", children: ["note"] },
        note: {
          type: "Input",
          props: { name: "note", defaultValue: { $bindState: "/note" } },
        },
        echo: { type: "Text", props: { value: { $state: "/note" } } },
      },
      state: { note: "" },
    });

    const input = query<HTMLInputElement>(container, "input");
    setInputValue(input, "Leave at the door");
    await dispatch(input, "input");

    expect(query(container, '[data-aui="text"]').textContent).toBe(
      "Leave at the door",
    );
    expect(query(container, "input")).toBe(input);
  });

  it.each([
    {
      type: "Checkbox",
      props: { label: "Gift wrap", defaultChecked: { $bindState: "/v" } },
      initial: false,
      selector: "input",
      interact: (input: HTMLInputElement) => act(async () => input.click()),
      next: true,
    },
    {
      type: "RadioGroup",
      props: {
        options: [
          { label: "Small", value: "s" },
          { label: "Medium", value: "m" },
        ],
        defaultValue: { $bindState: "/v" },
      },
      initial: "s",
      selector: 'input[value="m"]',
      interact: (input: HTMLInputElement) => act(async () => input.click()),
      next: "m",
    },
    {
      type: "CheckboxGroup",
      props: {
        options: [
          { label: "Basil", value: "basil" },
          { label: "Olives", value: "olives" },
        ],
        defaultValue: { $bindState: "/v" },
      },
      initial: ["basil"],
      selector: 'input[value="olives"]',
      interact: (input: HTMLInputElement) => act(async () => input.click()),
      next: ["basil", "olives"],
    },
    {
      type: "Slider",
      props: { min: 0, max: 10, defaultValue: { $bindState: "/v" } },
      initial: 4,
      selector: "input",
      interact: async (input: HTMLInputElement) => {
        await dispatch(input, "pointerdown");
        setInputValue(input, "7");
        await dispatch(input, "input");
        await dispatch(input, "pointerup");
      },
      next: 7,
    },
    {
      type: "DatePicker",
      props: { value: { $bindState: "/v" } },
      initial: "2026-10-12",
      selector: "input",
      interact: async (input: HTMLInputElement) => {
        setInputValue(input, "2026-10-14");
        await dispatch(input, "input");
      },
      next: "2026-10-14",
    },
  ])(
    "writes a bound $type back and emits its value with `change`",
    async ({ type, props, initial, selector, interact, next }) => {
      const pick = vi.fn();
      const state = createStateStore({ v: initial });
      const container = await render(
        {
          root: "control",
          elements: {
            control: {
              type,
              props,
              on: { change: { action: "pick", params: { v: { $event: "" } } } },
            },
          },
        },
        { pick },
        state,
      );

      const input = query<HTMLInputElement>(container, selector);
      await interact(input);

      expect(state.get("/v")).toEqual(next);
      expect(query(container, selector)).toBe(input);
      expect(pick).toHaveBeenCalledOnce();
      expect(pick).toHaveBeenCalledWith({ v: next }, expect.anything());
    },
  );

  it("compares a bound Slider's commit against the value its gesture started from", async () => {
    const pick = vi.fn();
    const state = createStateStore({ v: 4 });
    const container = await render(
      {
        root: "volume",
        elements: {
          volume: {
            type: "Slider",
            props: { min: 0, max: 10, defaultValue: { $bindState: "/v" } },
            on: { change: { action: "pick", params: { v: { $event: "" } } } },
          },
        },
      },
      { pick },
      state,
    );
    const input = query<HTMLInputElement>(container, "input");
    const press = (type: string) =>
      act(async () => {
        input.dispatchEvent(
          new KeyboardEvent(type, { key: "ArrowLeft", bubbles: true }),
        );
      });
    const drag = async (value: string) => {
      await dispatch(input, "pointerdown");
      setInputValue(input, value);
      await dispatch(input, "input");
      await dispatch(input, "pointerup");
    };

    const move = (value: number) => act(async () => state.set("/v", value));

    await drag("7");
    await move(0);
    expect(input.value).toBe("0");
    await press("keydown");
    await press("keyup");
    await move(10);
    await dispatch(input, "pointerdown");
    await dispatch(input, "pointerup");
    await move(3);
    setInputValue(input, "10");
    await dispatch(input, "input");

    expect(pick.mock.calls.map(([params]) => params)).toEqual([
      { v: 7 },
      { v: 10 },
    ]);
  });

  it("keeps a ListViewItem plain unless it binds `press`", async () => {
    const open = vi.fn();
    const container = await render(
      {
        root: "list",
        elements: {
          list: { type: "ListView", children: ["plain", "linked"] },
          plain: { type: "ListViewItem", children: ["plainText"] },
          plainText: { type: "Text", props: { value: "Plain" } },
          linked: {
            type: "ListViewItem",
            children: ["linkedText"],
            on: { press: { action: "open", params: { id: 7 } } },
          },
          linkedText: { type: "Text", props: { value: "Linked" } },
        },
      },
      { open },
    );

    const triggers = container.querySelectorAll<HTMLElement>(
      '[data-aui="listview-item-trigger"]',
    );
    expect(triggers).toHaveLength(1);
    expect(triggers[0]!.textContent).toBe("Linked");

    await act(async () => triggers[0]!.click());

    expect(open).toHaveBeenCalledWith({ id: 7 }, expect.anything());
  });

  it("wires Card footer buttons to `confirm` and `cancel`", async () => {
    const save = vi.fn();
    const dismiss = vi.fn();
    const container = await render(
      {
        root: "card",
        elements: {
          card: {
            type: "Card",
            props: {
              title: "Order",
              confirm: { label: "Save" },
              cancel: { label: "Dismiss" },
            },
            on: {
              confirm: { action: "save" },
              cancel: { action: "dismiss" },
            },
          },
        },
      },
      { save, dismiss },
    );

    await act(async () =>
      query<HTMLElement>(container, '[data-aui="card-confirm"]').click(),
    );
    await act(async () =>
      query<HTMLElement>(container, '[data-aui="card-cancel"]').click(),
    );

    expect(save).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("emits a form Card's named values with `confirm`", async () => {
    const save = vi.fn();
    const container = await render(
      {
        root: "card",
        elements: {
          card: {
            type: "Card",
            props: { asForm: true, confirm: { label: "Save" } },
            children: ["note"],
            on: {
              confirm: { action: "save", params: { values: { $event: "" } } },
            },
          },
          note: {
            type: "Input",
            props: { name: "note", defaultValue: "Leave at the door" },
          },
        },
      },
      { save },
    );

    await act(async () =>
      query<HTMLElement>(container, '[data-aui="card-confirm"]').click(),
    );

    expect(save).toHaveBeenCalledWith(
      { values: { note: "Leave at the door" } },
      expect.anything(),
    );
  });
});
