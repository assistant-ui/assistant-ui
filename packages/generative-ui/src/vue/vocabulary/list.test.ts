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
        expect(control.closest('button, [role="button"]')).toBe(
          control.matches('button, [role="button"]') ? control : null,
        );
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

  it.each(["click", "button click", "Enter", " "])(
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
        else if (interaction === "button click")
          trigger.querySelector("button")!.click();
        else
          trigger.querySelector("button")!.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: interaction,
              bubbles: true,
              cancelable: true,
            }),
          );
      };
      await act(async () => perform(react.container));
      perform(vue.container);
      await nextTick();
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
      expect(vue.state.getState()).toEqual(react.state.getState());
      expect(vue.state.get("/pressed")).toBe(true);
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
