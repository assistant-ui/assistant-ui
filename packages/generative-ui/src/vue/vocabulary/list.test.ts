// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Spec } from "generative-frame/spec";
import { nextTick } from "vue";
import {
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

describe("structured lists in Vue", () => {
  it.each([
    ["Steps", "steps", [{ title: 0, detail: 12 }], "012"],
    ["Timeline", "items", [{ time: 0, title: 12, detail: 34 }], "01234"],
  ] as const)(
    "renders numeric %s entries like React",
    (type, prop, entries, text) => {
      const input = spec({ main: { type, props: { [prop]: entries } } });
      const react = renderReactSpec(input);
      const vue = renderVueSpec(input);
      expect(vue.markup()).toBe(react.markup());
      expect(vue.container.textContent).toBe(text);
    },
  );

  it.each([
    [
      "Steps",
      "steps",
      [{ title: "Start", detail: "Prepare" }, { title: "Finish" }],
    ],
    [
      "Steps",
      "steps",
      [
        { title: "Valid" },
        null,
        { detail: "Missing title" },
        { title: 12, detail: 4 },
      ],
    ],
    [
      "Timeline",
      "items",
      [
        { title: "Launch", time: "Monday", detail: "Live" },
        { title: "Review", time: "Tuesday" },
      ],
    ],
    ["Timeline", "items", []],
  ] as const)("renders %s entries like React", (type, prop, entries) => {
    const input = spec({ main: { type, props: { [prop]: entries } } });
    const react = renderReactSpec(input);
    const vue = renderVueSpec(input);
    expect(vue.markup()).toBe(react.markup());
    if (
      entries.some(
        (entry) =>
          entry === null ||
          !("title" in entry) ||
          typeof entry.title !== "string",
      )
    )
      expect(vue.markup()).toContain(
        'data-gf-spec-placeholder="invalid-props"',
      );
    else expect(vue.markup()).toContain(`data-aui="${type.toLowerCase()}"`);
  });
});

const rows: Spec["elements"] = {
  main: { type: "ListView", children: ["plain", "linked"] },
  plain: { type: "ListViewItem", children: ["plainText"] },
  plainText: { type: "Text", props: { value: "Plain" } },
  linked: {
    type: "ListViewItem",
    children: ["linkedText"],
    on: {
      press: [
        { action: "open", params: { value: { $event: "" } } },
        { action: "setState", params: { path: "/pressed", value: true } },
      ],
    },
  },
  linkedText: { type: "Text", props: { value: "Linked" } },
};

describe("list vocabulary in Vue", () => {
  it("keeps nested Button, Checkbox, and Select operable outside the named row button", async () => {
    const withControls: Spec["elements"] = {
      main: {
        type: "ListViewItem",
        children: ["label", "button", "checkbox", "select"],
        on: { press: { action: "open" } },
      },
      label: { type: "Text", props: { value: "Settings" } },
      button: { type: "Button", props: { label: "Edit" } },
      checkbox: { type: "Checkbox", props: { label: "Enabled" } },
      select: {
        type: "Select",
        props: { label: "Mode", options: [{ label: "Auto", value: "auto" }] },
      },
    };
    const markup: string[] = [];
    for (const render of [renderReactSpec, renderVueSpec]) {
      const onOpen = vi.fn();
      const { container, markup: getMarkup } = render(spec(withControls), {
        open: onOpen,
      });
      markup.push(getMarkup());
      const row = container.querySelector('[data-aui="listview-item"]')!;
      const trigger = row.querySelector<HTMLButtonElement>(
        '[data-aui="listview-item-trigger"] button',
      )!;
      expect(trigger).not.toBeNull();
      expect(trigger.tabIndex).toBe(0);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute("aria-labelledby")).toBe(
        row.querySelector('[data-aui="listview-item-content"]')?.id,
      );
      expect(
        row.querySelector('[data-aui="listview-item-content"]')?.textContent,
      ).toContain("Settings");
      for (const selector of [
        '[data-aui="button"]',
        '[data-aui="checkbox"]',
        '[data-aui="select"]',
      ]) {
        const control = row.querySelector<HTMLElement>(selector)!;
        expect(control).not.toBeNull();
        expect(
          control.parentElement?.closest('button, [role="button"]'),
        ).toBeNull();
        if (render === renderReactSpec) await act(async () => control.click());
        else control.click();
      }
      expect(onOpen).not.toHaveBeenCalled();
    }
    await nextTick();
    expect(markup[1]).toBe(markup[0]);
  });

  it("renders read only and bound rows like React", () => {
    const rendered = renderVueSpec(spec(rows)).markup();
    expect(rendered).toBe(renderReactSpec(spec(rows)).markup());
    expect(rendered.match(/data-aui="listview-item-trigger"/g)).toHaveLength(1);
  });

  it.each(["click", "button click"])(
    "emits press from %s with the same params and state",
    async (interaction) => {
      const reactHandler = vi.fn();
      const vueHandler = vi.fn();
      const react = renderReactSpec(spec(rows, { pressed: false }), {
        open: reactHandler,
      });
      const vue = renderVueSpec(spec(rows, { pressed: false }), {
        open: vueHandler,
      });
      const perform = (container: HTMLElement) => {
        const trigger = container.querySelector<HTMLElement>(
          '[data-aui="listview-item-trigger"]',
        )!;
        if (interaction === "click") trigger.click();
        else trigger.querySelector("button")!.click();
      };
      await act(async () => perform(react.container));
      perform(vue.container);
      await nextTick();
      expect(vueHandler).toHaveBeenCalledOnce();
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
      expect(vue.state.getState()).toEqual(react.state.getState());
      expect(vue.state.get("/pressed")).toBe(true);
    },
  );

  it.each(["Enter", " "])(
    "does not dispatch press directly from %s key events",
    async (key) => {
      for (const render of [renderReactSpec, renderVueSpec]) {
        const { container, state } = render(
          spec(
            {
              main: {
                type: "ListViewItem",
                children: ["text"],
                on: {
                  press: {
                    action: "setState",
                    params: { path: "/pressed", value: true },
                  },
                },
              },
              text: { type: "Text", props: { value: "Row" } },
            },
            { pressed: false },
          ),
        );
        const button = container.querySelector<HTMLButtonElement>(
          '[data-aui="listview-item-trigger"] > button',
        )!;
        button.focus();
        for (let repeat = 0; repeat < 2; repeat++) {
          button.dispatchEvent(
            new KeyboardEvent("keydown", {
              key,
              bubbles: true,
              repeat: repeat > 0,
            }),
          );
        }
        expect(state.get("/pressed")).toBe(false);
        button.dispatchEvent(
          new KeyboardEvent("keyup", { key, bubbles: true }),
        );
        expect(state.get("/pressed")).toBe(false);
        if (render === renderReactSpec) await act(async () => button.click());
        else button.click();
        await nextTick();
        expect(state.get("/pressed")).toBe(true);
      }
    },
  );

  it.each([
    ["React", renderReactSpec],
    ["Vue", renderVueSpec],
  ] as const)(
    "fires only the inner row action for nested %s rows",
    async (_, render) => {
      const nestedRows: Spec["elements"] = {
        main: {
          type: "ListView",
          children: ["outerRow"],
        },
        outerRow: {
          type: "ListViewItem",
          children: ["outerText", "innerList"],
          on: {
            press: { action: "setState", params: { path: "/outer", value: 1 } },
          },
        },
        outerText: { type: "Text", props: { value: "Outer" } },
        innerList: { type: "ListView", children: ["innerRow"] },
        innerRow: {
          type: "ListViewItem",
          children: ["innerText"],
          on: {
            press: { action: "setState", params: { path: "/inner", value: 1 } },
          },
        },
        innerText: { type: "Text", props: { value: "Inner" } },
      };
      const { container, state } = render(
        spec(nestedRows, { inner: 0, outer: 0 }),
      );
      const set = vi.spyOn(state, "set");
      const innerText = container.querySelectorAll(
        '[data-aui="text"]',
      )[1] as HTMLElement;
      if (render === renderReactSpec) await act(async () => innerText.click());
      else innerText.click();
      await nextTick();
      expect(set).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith("/inner", 1);
      expect(state.get("/inner")).toBe(1);
      expect(state.get("/outer")).toBe(0);
      const outerText =
        container.querySelector<HTMLElement>('[data-aui="text"]')!;
      if (render === renderReactSpec) await act(async () => outerText.click());
      else outerText.click();
      await nextTick();
      expect(state.get("/outer")).toBe(1);
    },
  );

  it("ignores nested controls and unrelated keys", async () => {
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderReactSpec(spec(rows), { open: reactHandler });
    const vue = renderVueSpec(spec(rows), { open: vueHandler });
    const perform = (container: HTMLElement) => {
      const trigger = container.querySelector<HTMLElement>(
        '[data-aui="listview-item-trigger"]',
      )!;
      const nested = document.createElement("button");
      trigger.append(nested);
      nested.click();
      nested.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      );
    };
    await act(async () => perform(react.container));
    perform(vue.container);
    await nextTick();
    expect(reactHandler).not.toHaveBeenCalled();
    expect(vueHandler).not.toHaveBeenCalled();
    expect(vue.state.getState()).toEqual(react.state.getState());
  });
});
