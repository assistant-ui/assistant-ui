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
  it("renders read only and bound rows like React", () => {
    const rendered = renderVueSpec(spec(rows)).markup();
    expect(rendered).toBe(renderReactSpec(spec(rows)).markup());
    expect(rendered.match(/data-aui="listview-item-trigger"/g)).toHaveLength(1);
  });

  it.each(["click", "Enter", " "])(
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
        else
          trigger.dispatchEvent(
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
