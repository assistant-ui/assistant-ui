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
  it.each(["button", "return"])(
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
        await pressEnter(web.container.querySelector("input")!);
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
