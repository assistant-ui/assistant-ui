// @vitest-environment jsdom
import { act } from "react";
import type { Spec } from "generative-frame/spec";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderNativeSpec,
  renderWebSpec,
  spec,
  typeText,
} from "./testUtils";

afterEach(cleanupSpecs);

const actions = { save: { description: "Save the form" } };
const options = [
  { label: "Small", value: "s" },
  { label: "Large", value: "l" },
];

const form = (children: string[]): Spec =>
  spec({
    main: {
      type: "Card",
      props: { asForm: true, confirm: { label: "Save" } },
      children,
      on: { confirm: { action: "save", params: { values: { $event: "" } } } },
    },
    first: { type: "Input", props: { name: "note", label: "First" } },
    second: { type: "Input", props: { name: "note", label: "Second" } },
    agree: { type: "Checkbox", props: { name: "agree", label: "Agree" } },
    size: { type: "RadioGroup", props: { name: "size", options } },
    tags: { type: "CheckboxGroup", props: { name: "tags", options } },
    plan: { type: "Select", props: { name: "plan", options } },
    qty: {
      type: "Slider",
      props: {
        name: "qty",
        label: "Quantity",
        min: 0,
        max: 10,
        defaultValue: 3,
      },
    },
  });

const submitWeb = (container: HTMLElement) =>
  act(async () => container.querySelector("form")!.requestSubmit());

describe("form scope on React Native", () => {
  it("collects repeated names, checkboxes, groups, and numbers like the web", async () => {
    const input = form([
      "first",
      "second",
      "agree",
      "size",
      "tags",
      "plan",
      "qty",
    ]);
    const native = vi.fn();
    const web = vi.fn();
    const nativeSpec = renderNativeSpec(input, { save: native }, actions);
    const webSpec = renderWebSpec(input, { save: web }, actions);
    const nativeFields = nativeSpec.container.querySelectorAll("input");
    const webFields =
      webSpec.container.querySelectorAll<HTMLInputElement>(
        'input[name="note"]',
      );
    await typeText(nativeFields[0]!, "one");
    await typeText(nativeFields[1]!, "two");
    await typeText(webFields[0]!, "one");
    await typeText(webFields[1]!, "two");
    await press(byRole(nativeSpec.container, "checkbox", "Agree"));
    await act(async () =>
      webSpec.container
        .querySelector<HTMLInputElement>('input[name="agree"]')!
        .click(),
    );
    await press(byRole(nativeSpec.container, "checkbox", "Large"));
    await act(async () =>
      webSpec.container
        .querySelector<HTMLInputElement>('input[name="tags"][value="l"]')!
        .click(),
    );

    await press(byRole(nativeSpec.container, "button", "Save"));
    await submitWeb(webSpec.container);
    expect(native.mock.calls[0]![0].values).toHaveProperty("size");
    expect(web.mock.calls[0]![0].values).toHaveProperty("size");
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(native.mock.calls[0]![0]).toEqual({
      values: {
        note: ["one", "two"],
        agree: true,
        size: undefined,
        tags: ["l"],
        plan: "s",
        qty: 3,
      },
    });
  });

  it("stops collecting a control once it unmounts, like the web", async () => {
    const native = vi.fn();
    const web = vi.fn();
    const nativeSpec = renderNativeSpec(
      form(["first", "agree"]),
      { save: native },
      actions,
    );
    const webSpec = renderWebSpec(
      form(["first", "agree"]),
      { save: web },
      actions,
    );
    await nativeSpec.update(form(["agree"]));
    await webSpec.update(form(["agree"]));
    await press(byRole(nativeSpec.container, "button", "Save"));
    await submitWeb(webSpec.container);
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(native.mock.calls[0]![0]).toEqual({ values: { agree: false } });
  });
});
