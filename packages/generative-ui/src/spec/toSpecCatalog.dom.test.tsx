// @vitest-environment jsdom

import type { Spec } from "generative-frame/spec";
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

async function render(spec: Spec, handlers: Record<string, Handler> = {}) {
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
    expect(pick).toHaveBeenCalledWith({ size: "m" }, expect.anything());
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
