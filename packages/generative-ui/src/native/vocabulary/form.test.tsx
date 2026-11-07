// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  pressEnter,
  renderNativeSpec,
  renderWebSpec,
  spec,
  typeText,
} from "../testUtils";

afterEach(cleanupSpecs);

const actions = { save: { description: "Save" } };
const input = spec({
  main: {
    type: "Form",
    props: { gap: 2 },
    children: ["name", "city", "send"],
    on: { submit: { action: "save", params: { values: { $event: "" } } } },
  },
  name: { type: "Input", props: { name: "name", label: "Name" } },
  city: {
    type: "Input",
    props: { name: "city", label: "City", defaultValue: "Paris" },
  },
  send: { type: "Button", props: { label: "Save", submit: true } },
});

describe("Form on React Native", () => {
  it("blocks required and length constrained values until valid", async () => {
    const save = vi.fn();
    const rendered = renderNativeSpec(
      spec({
        main: {
          type: "Form",
          children: ["name", "send"],
          on: { submit: { action: "save" } },
        },
        name: {
          type: "Input",
          props: { name: "name", required: true, minLength: 3, maxLength: 4 },
        },
        send: { type: "Button", props: { label: "Save", submit: true } },
      }),
      { save },
      actions,
    );
    const field = rendered.container.querySelector("input")!;
    const submit = byRole(rendered.container, "button", "Save");
    await press(submit);
    expect(save).not.toHaveBeenCalled();
    await typeText(field, "Al");
    await press(submit);
    expect(save).not.toHaveBeenCalled();
    await typeText(field, "Ada");
    await press(submit);
    expect(save).toHaveBeenCalledOnce();
  });

  it("blocks an out-of-range number and an unchecked required checkbox", async () => {
    const save = vi.fn();
    const rendered = renderNativeSpec(
      spec({
        main: {
          type: "Form",
          children: ["amount", "agree", "send"],
          on: { submit: { action: "save" } },
        },
        amount: {
          type: "Input",
          props: { name: "amount", inputType: "number", min: 2, max: 5 },
        },
        agree: {
          type: "Checkbox",
          props: { name: "agree", label: "Agree", required: true },
        },
        send: { type: "Button", props: { label: "Save", submit: true } },
      }),
      { save },
      actions,
    );
    const submit = byRole(rendered.container, "button", "Save");
    await typeText(rendered.container.querySelector("input")!, "8");
    await press(byRole(rendered.container, "checkbox", "Agree"));
    await press(submit);
    expect(save).not.toHaveBeenCalled();
    await typeText(rendered.container.querySelector("input")!, "3");
    await press(submit);
    expect(save).toHaveBeenCalledOnce();
  });
  it.each(["button", "return key (web requestSubmit)"])(
    "submits named values from %s like the web",
    async (trigger) => {
      const nativeHandler = vi.fn();
      const webHandler = vi.fn();
      const native = renderNativeSpec(input, { save: nativeHandler }, actions);
      const web = renderWebSpec(input, { save: webHandler }, actions);
      await typeText(native.container.querySelector("input")!, "Ada");
      await typeText(web.container.querySelector("input")!, "Ada");
      if (trigger === "button") {
        await press(byRole(native.container, "button", "Save"));
        await press(web.container.querySelector("button")!);
      } else {
        await pressEnter(native.container.querySelector("input")!);
        await act(async () =>
          web.container.querySelector("form")!.requestSubmit(),
        );
      }
      expect(nativeHandler).toHaveBeenCalledOnce();
      expect(nativeHandler.mock.calls[0]![0]).toEqual(
        webHandler.mock.calls[0]![0],
      );
      expect(nativeHandler.mock.calls[0]![0]).toEqual({
        values: { name: "Ada", city: "Paris" },
      });
      expect(
        (native.container.firstElementChild as HTMLElement).style.gap,
      ).toBe("8px");
    },
  );
});
