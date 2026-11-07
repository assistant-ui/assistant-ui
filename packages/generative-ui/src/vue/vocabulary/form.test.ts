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

describe("form vocabulary in Vue", () => {
  it("passes constraints to controls and blocks invalid Card confirmation", async () => {
    const handler = vi.fn();
    const rendered = renderVueSpec(
      spec({
        main: {
          type: "Card",
          props: { asForm: true, confirm: { label: "Save" } },
          children: ["name", "amount"],
          on: { confirm: { action: "save" } },
        },
        name: {
          type: "Input",
          props: { name: "name", required: true, minLength: 2, maxLength: 8 },
        },
        amount: {
          type: "Input",
          props: { name: "amount", inputType: "number", min: 1, max: 5 },
        },
      }),
      { save: handler },
    );
    const form = rendered.container.querySelector("form")!;
    const name = form.querySelector<HTMLInputElement>('input[name="name"]')!;
    const amount = form.querySelector<HTMLInputElement>(
      'input[name="amount"]',
    )!;
    expect([name.required, name.minLength, name.maxLength]).toEqual([
      true,
      2,
      8,
    ]);
    expect([amount.min, amount.max]).toEqual(["1", "5"]);
    form.requestSubmit();
    await nextTick();
    expect(handler).not.toHaveBeenCalled();
    name.value = "ada";
    amount.value = "9";
    form.requestSubmit();
    await nextTick();
    expect(handler).not.toHaveBeenCalled();
    amount.value = "3";
    form.requestSubmit();
    await nextTick();
    expect(handler).toHaveBeenCalledOnce();
  });
  it("does not emit submit for an invalid form", async () => {
    const handler = vi.fn();
    const rendered = renderVueSpec(
      spec({
        main: {
          type: "Form",
          children: ["name"],
          on: { submit: { action: "save" } },
        },
        name: { type: "Input", props: { name: "name", required: true } },
      }),
      { save: handler },
    );
    const form = rendered.container.querySelector("form")!;
    expect(form.querySelector("input")?.required).toBe(true);
    form.requestSubmit();
    await nextTick();
    expect(handler).not.toHaveBeenCalled();
  });
  it.each<[string, Spec["elements"]]>([
    ["a bare form", { main: { type: "Form" } }],
    [
      "a form with a gap and child",
      {
        main: { type: "Form", props: { gap: 2 }, children: ["detail"] },
        detail: { type: "Fact", props: { label: "a", value: "b" } },
      },
    ],
    [
      "a bound form",
      {
        main: {
          type: "Form",
          on: {
            submit: {
              action: "setState",
              params: { path: "/submitted", value: true },
            },
          },
        },
      },
    ],
  ])("renders %s like React", (_name, elements) => {
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });

  it("emits collected form values to the handler and state store", async () => {
    const elements: Spec["elements"] = {
      main: {
        type: "Form",
        on: {
          submit: [
            { action: "save", params: { values: { $event: "" } } },
            {
              action: "setState",
              params: { path: "/values", value: { $event: "" } },
            },
          ],
        },
      },
    };
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderReactSpec(spec(elements, { values: null }), {
      save: reactHandler,
    });
    const vue = renderVueSpec(spec(elements, { values: null }), {
      save: vueHandler,
    });
    for (const rendered of [react, vue]) {
      const form = rendered.container.querySelector("form")!;
      form.innerHTML =
        '<input name="email" value="a@example.com"><input name="agree" type="checkbox" checked><input name="tag" value="a"><input name="tag" value="b"><input name="off" value="ignored" disabled>';
    }
    await act(async () => {
      react.container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    vue.container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();
    expect(vueHandler).toHaveBeenCalledOnce();
    expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
      reactHandler.mock.calls.map(([params]) => params),
    );
    expect(vue.state.getState()).toEqual(react.state.getState());
    expect(vue.state.get("/values")).toEqual({
      email: "a@example.com",
      agree: true,
      tag: ["a", "b"],
    });
  });

  it("prevents submission without a bound event", async () => {
    const react = renderReactSpec(spec({ main: { type: "Form" } }));
    const vue = renderVueSpec(spec({ main: { type: "Form" } }));
    const events = [react, vue].map((rendered) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      rendered.container.querySelector("form")!.dispatchEvent(event);
      return event;
    });
    await nextTick();
    expect(events.map((event) => event.defaultPrevented)).toEqual([true, true]);
  });
});
