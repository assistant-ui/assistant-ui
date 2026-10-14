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
