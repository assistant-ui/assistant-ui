// @vitest-environment jsdom

import * as React from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { A2uiBindingContext } from "../a2ui/BindingContext";
import { AnsweredValuesProvider } from "../answeredValues";
import { FIELD_VALUE_ATTR } from "../constants";
import { renderGenerativeUI } from "../renderGenerativeUI";
import type { GenerativeUIDispatch } from "../types";
import { defaultGenerativeUILibrary } from "./index";
import { interactiveVocabulary } from "./interactive";
import { collectFormValues } from "./collectFormValues";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  await React.act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const view = (
  props: Record<string, unknown>,
  dispatch?: GenerativeUIDispatch,
) =>
  renderGenerativeUI(
    { $type: "DatePicker", label: "When", name: "when", ...props },
    interactiveVocabulary,
    { status: "done", ...(dispatch ? { dispatch } : {}) },
  );

const mount = async (element: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await React.act(async () => root!.render(element));
  return container;
};

const change = async (input: HTMLInputElement, value: string) => {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const nativeValue = (type: string, value: string) => {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  return input.value;
};

describe("DatePicker temporal contract", () => {
  it.each([
    ["2026-07-15T12:34Z", "2026-07-16T13:45Z", ""],
    ["2026-07-15T12:34:56+08:00", "2026-07-16T21:45:00+08:00", "1"],
    [
      "2026-07-15T12:34:56.123456-00:00",
      "2026-07-16T13:45:00.000000-00:00",
      "any",
    ],
  ])(
    "preserves the anchor through an empty segment edit of %s",
    async (value, emitted, step) => {
      const dispatch = vi.fn();
      const container = await mount(
        view(
          { inputType: "datetime", value, $action: { type: "save" } },
          dispatch,
        ),
      );
      const input = container.querySelector("input")!;
      await change(input, "2026-07-16T08:30");
      expect(input.step).toBe(step);
      await change(input, "");
      expect(dispatch).toHaveBeenLastCalledWith({ type: "save", $input: "" });
      expect(collectFormValues([input])).toEqual({ when: "" });
      expect(input.step).toBe(step);
      await change(input, "2026-07-16T09:45");
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "save",
        $input: emitted,
      });
      expect(collectFormValues([input])).toEqual({ when: emitted });
      expect(input.step).toBe(step);
    },
  );

  it("submits an edited instant fraction", async () => {
    const dispatch = vi.fn();
    const container = await mount(
      view(
        {
          inputType: "datetime",
          value: "2025-12-15T17:00:00.250Z",
          $action: { type: "save" },
        },
        dispatch,
      ),
    );
    const input = container.querySelector("input")!;
    await change(input, "2025-12-15T12:00:00.750");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2025-12-15T17:00:00.750Z",
    });
    expect(collectFormValues([input])).toEqual({
      when: "2025-12-15T17:00:00.750Z",
    });
  });

  it.each(["2025-11-02T01:30:00.25", "2025-11-02T01:30:00.250"])(
    "submits an untouched repeated hour instant when the browser reports %s",
    async (reported) => {
      const anchor = "2025-11-02T06:30:00.250Z";
      const container = await mount(
        view({ inputType: "datetime", value: anchor }),
      );
      const input = container.querySelector("input")!;
      vi.spyOn(input, "value", "get").mockReturnValue(reported);
      expect(collectFormValues([input])).toEqual({ when: anchor });
    },
  );

  it.each([
    [
      "2026-07-15T12:34:56.123456Z",
      "2026-07-15T08:34:56.123",
      "2026-07-16T08:34:56.123",
      "2026-07-16T12:34:56.123456Z",
    ],
    [
      "2026-07-15T12:34:56.5Z",
      "2026-07-15T08:34:56.500",
      "2026-07-16T08:34:56.500",
      "2026-07-16T12:34:56.5Z",
    ],
  ])(
    "keeps the fraction's precision when only the day changes from %s",
    async (value, displayed, edited, emitted) => {
      const dispatch = vi.fn();
      const container = await mount(
        view(
          { inputType: "datetime", value, $action: { type: "save" } },
          dispatch,
        ),
      );
      const input = container.querySelector("input")!;
      expect(input.value).toBe(displayed);
      await change(input, edited);
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "save",
        $input: emitted,
      });
      expect(collectFormValues([input])).toEqual({ when: emitted });
    },
  );

  it("pads edited milliseconds to the anchor precision", async () => {
    const dispatch = vi.fn();
    const container = await mount(
      view(
        {
          inputType: "datetime",
          value: "2026-07-15T12:34:56.123456Z",
          $action: { type: "save" },
        },
        dispatch,
      ),
    );
    const input = container.querySelector("input")!;
    await change(input, "2026-07-16T08:34:56.789");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-16T12:34:56.789000Z",
    });
  });

  it("submits a cleared instant fraction in its original offset", async () => {
    const dispatch = vi.fn();
    const container = await mount(
      renderGenerativeUI(
        {
          $type: "Form",
          $action: { type: "submit" },
          children: [
            {
              $type: "DatePicker",
              name: "when",
              inputType: "datetime",
              value: "2025-12-15T17:00:00.250-00:00",
            },
            { $type: "Button", label: "Submit", submit: true },
          ],
        },
        defaultGenerativeUILibrary,
        { status: "done", dispatch },
      ),
    );
    const input = container.querySelector("input")!;
    expect(input.step).toBe("any");
    expect(input.value).toBe("2025-12-15T12:00:00.250");
    await change(input, "2025-12-15T12:00:00");
    expect(input.value).toBe("2025-12-15T12:00");
    await React.act(async () => container.querySelector("button")!.click());
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "submit",
      $input: { when: "2025-12-15T17:00:00.000-00:00" },
    });
  });

  it("preserves the anchor through binding echoes and replaces it on an external update", async () => {
    const dispatch = vi.fn();
    const BindingContext = A2uiBindingContext!;
    let replace: React.Dispatch<React.SetStateAction<string>> | undefined;
    const Surface = () => {
      const [value, setValue] = React.useState("2026-07-15T12:34-00:00");
      replace = setValue;
      return (
        <BindingContext.Provider
          value={{
            fields: new Map([["when", { value, arrayValue: false }]]),
            update: (_, next) => setValue(String(next)),
          }}
        >
          {view(
            { inputType: "datetime", value, $action: { type: "save" } },
            dispatch,
          )}
        </BindingContext.Provider>
      );
    };
    const container = await mount(<Surface />);
    const input = container.querySelector("input")!;
    await change(input, "2026-07-16T08:30");
    await change(input, "");
    expect(input.step).toBe("");
    await change(input, "2026-07-16T09:45");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-16T13:45-00:00",
    });
    expect(input.step).toBe("");
    await React.act(async () => replace!("2026-07-17T12:34:56+08:00"));
    await change(input, "");
    expect(input.step).toBe("1");
    await change(input, "2026-07-18T09:45:30");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-18T21:45:30+08:00",
    });
  });

  it("submits the sanitized live value of an invalid date", async () => {
    const container = await mount(view({ value: "12/15/2025" }));
    const input = container.querySelector("input")!;
    expect(input.value).toBe("");
    expect(input.hasAttribute(FIELD_VALUE_ATTR)).toBe(false);
    expect(collectFormValues([input])).toEqual({ when: "" });
  });

  it.each([
    ["2025-12-15T17:00Z", "2025-12-16T14:30Z"],
    ["2025-12-15T17:00:00.120000-00:00", "2025-12-16T14:30:00.000000-00:00"],
  ])(
    "collects the live instant without an input event using %s",
    async (value, emitted) => {
      const container = await mount(view({ inputType: "datetime", value }));
      const input = container.querySelector("input")!;
      expect(collectFormValues([input])).toEqual({ when: value });
      input.value = "2025-12-16T09:30";
      expect(collectFormValues([input])).toEqual({ when: emitted });
      input.value = "";
      expect(collectFormValues([input])).toEqual({ when: "" });
    },
  );

  it.each([
    {
      value: "2026-07-15T12:34:56.123",
      min: "2026-07-15T12:00:00",
      max: "2026-07-15T13:00:00",
    },
    {
      value: "2026-07-15T12:34:56",
      min: "2026-07-15T12:00:00.123",
      max: "2026-07-15T13:00:00",
    },
    {
      value: "2026-07-15T12:34:56",
      min: "2026-07-15T12:00:00",
      max: "2026-07-15T13:00:00.123",
    },
  ])(
    "allows fractional local values and bounds without step mismatch: $value, $min, $max",
    async (props) => {
      const container = await mount(view({ inputType: "datetime", ...props }));
      const input = container.querySelector("input")!;
      expect(input.step).toBe("any");
      expect(input.validity.stepMismatch).toBe(false);
      expect(input.checkValidity()).toBe(true);
    },
  );

  it("preserves fractional instant bounds in the viewer time zone", async () => {
    const container = await mount(
      view({
        inputType: "datetime",
        value: "2026-07-15T12:34Z",
        min: "2026-07-15T12:00:00.123+08:00",
        max: "2026-07-15T13:00:00.456789-05:30",
      }),
    );
    const input = container.querySelector("input")!;
    expect(input.min).toBe("2026-07-15T00:00:00.123");
    expect(input.max).toBe("2026-07-15T14:30:00.456");
    expect(input.step).toBe("any");
    expect(input.validity.stepMismatch).toBe(false);
  });

  it.each([
    [
      "2025-12-15T17:00:00Z",
      "2025-12-15T12:00",
      "2025-12-16T14:30:00Z",
      "2025-12-17T14:30:00Z",
    ],
    [
      "2025-12-15T17:00:00+02:00",
      "2025-12-15T10:00",
      "2025-12-16T16:30:00+02:00",
      "2025-12-17T16:30:00+02:00",
    ],
  ])(
    "submits and resolves canonical instant %s before and after editing",
    async (initial, displayed, edited, autofilled) => {
      const dispatch = vi.fn();
      const tree = (
        <div data-aui="root">
          {renderGenerativeUI(
            {
              $type: "Form",
              $action: { type: "submit" },
              children: [
                {
                  $type: "DatePicker",
                  name: "when",
                  inputType: "datetime",
                  value: initial,
                  $action: { type: "picker", when: { $field: "when" } },
                },
                { $type: "Button", label: "Submit", submit: true },
                {
                  $type: "Button",
                  label: "Reference",
                  $action: { type: "reference", when: { $field: "when" } },
                },
              ],
            },
            defaultGenerativeUILibrary,
            { status: "done", dispatch },
          )}
        </div>
      );
      const container = await mount(tree);
      const input = container.querySelector("input")!;
      const [submit, reference] = container.querySelectorAll("button");
      expect(input.value).toBe(displayed);
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(initial);
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: initial,
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: initial },
      });
      await change(input, "2025-12-16T09:30");
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "picker",
        when: edited,
        $input: edited,
      });
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(edited);
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: edited,
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: edited },
      });
      input.value = "2025-12-17T09:30";
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(edited);
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: autofilled,
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: autofilled },
      });
      input.value = "";
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: "",
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: "" },
      });
    },
  );

  it.each([
    ["time", "17:00:00", "17:00", "08:30:45"],
    ["time", "12:00:05.1200", "12:00:05.12", "08:30"],
    ["datetime", "2025-12-15T17:00:00", "2025-12-15T17:00", "2025-12-16T08:30"],
  ])(
    "preserves a canonical %s value through Form and $field",
    async (inputType, initial, displayed, edited) => {
      const dispatch = vi.fn();
      const container = await mount(
        <div data-aui="root">
          {renderGenerativeUI(
            {
              $type: "Form",
              $action: { type: "submit" },
              children: [
                {
                  $type: "DatePicker",
                  name: "when",
                  inputType,
                  value: initial,
                },
                { $type: "Button", label: "Submit", submit: true },
                {
                  $type: "Button",
                  label: "Reference",
                  $action: { type: "reference", when: { $field: "when" } },
                },
              ],
            },
            defaultGenerativeUILibrary,
            { status: "done", dispatch },
          )}
        </div>,
      );
      const input = container.querySelector("input")!;
      const [submit, reference] = container.querySelectorAll("button");
      expect(input.value).toBe(displayed);
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(initial);
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: initial,
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: initial },
      });

      await change(input, edited);
      expect(input.value).toBe(edited);
      expect(input.hasAttribute(FIELD_VALUE_ATTR)).toBe(false);
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: edited,
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: edited },
      });

      input.value = "";
      await React.act(async () => reference!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "reference",
        when: "",
      });
      await React.act(async () => submit!.click());
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "submit",
        $input: { when: "" },
      });
    },
  );

  it("submits a filled initially empty datetime as an instant in the viewer offset", async () => {
    const dispatch = vi.fn();
    const container = await mount(
      <div data-aui="root">
        {renderGenerativeUI(
          {
            $type: "Form",
            $action: { type: "submit" },
            children: [
              { $type: "DatePicker", name: "when", inputType: "datetime" },
              { $type: "Button", label: "Submit", submit: true },
              {
                $type: "Button",
                label: "Reference",
                $action: { type: "reference", when: { $field: "when" } },
              },
            ],
          },
          defaultGenerativeUILibrary,
          { status: "done", dispatch },
        )}
      </div>,
    );
    const input = container.querySelector("input")!;
    const [submit, reference] = container.querySelectorAll("button");
    expect(input.hasAttribute(FIELD_VALUE_ATTR)).toBe(false);

    await change(input, "2025-12-15T09:00");
    await React.act(async () => submit!.click());
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "submit",
      $input: { when: "2025-12-15T09:00:00-05:00" },
    });
    await React.act(async () => reference!.click());
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "reference",
      when: "2025-12-15T09:00:00-05:00",
    });
  });

  it.each([
    ["time", "12:00:00", "12:00", "12:00:00", "1"],
    ["time", "12:00:05.1200", "12:00:05.12", "12:00:05.1200", "any"],
    ["time", "12:00:05.123456", "12:00:05.123", "12:00:05.123456", "any"],
    [
      "datetime",
      "2025-12-15T12:00:05.123456",
      "2025-12-15T12:00:05.123",
      "2025-12-15T12:00:05.123456",
      "any",
    ],
    [
      "datetime",
      "2025-12-15T17:00:00Z",
      "2025-12-15T12:00",
      "2025-12-15T17:00:00Z",
      "1",
    ],
  ])(
    "normalizes %s without rewriting the input on rerender",
    async (inputType, canonical, normalized, fieldValue, step) => {
      const setter = vi.spyOn(HTMLInputElement.prototype, "value", "set");
      const container = await mount(view({ inputType, value: canonical }));
      const input = container.querySelector("input")!;
      expect(input.value).toBe(normalized);
      expect(input.getAttribute("value")).toBe(normalized);
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(fieldValue);
      expect(collectFormValues([input])).toEqual({
        when: fieldValue ?? normalized,
      });
      expect(input.step).toBe(step);
      const calls = setter.mock.calls.length;
      await React.act(async () =>
        root!.render(view({ inputType, value: canonical })),
      );
      expect(setter.mock.calls.length).toBe(calls);
    },
  );

  it("uses a fixed viewer time zone", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      "America/New_York",
    );
    expect(new Date("2026-07-15T12:00Z").getTimezoneOffset()).toBe(240);
  });

  it("declares the three temporal input types and defaults to date", async () => {
    const schema = interactiveVocabulary.DatePicker.properties;
    for (const inputType of ["date", "datetime", "time"]) {
      expect(schema.safeParse({ inputType }).success).toBe(true);
    }
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ inputType: "datetime-local" }).success).toBe(
      false,
    );
    const container = await mount(view({ value: "2026-07-15" }));
    expect(container.querySelector("input")!.type).toBe("date");
  });

  it.each([
    {
      value: "2026-07-15T12:34Z",
      displayed: "2026-07-15T08:34",
      edited: "2026-07-16T09:45",
      emitted: "2026-07-16T13:45Z",
      step: "",
    },
    {
      value: "2026-07-15T12:34:56+08:00",
      displayed: "2026-07-15T00:34:56",
      edited: "2026-07-16T09:45:30",
      emitted: "2026-07-16T21:45:30+08:00",
      step: "1",
    },
    {
      value: "2026-07-15T12:34:56.123456-05:30",
      displayed: "2026-07-15T14:04:56.123",
      edited: "2026-07-16T09:45:30",
      emitted: "2026-07-16T08:15:30.000000-05:30",
      step: "any",
    },
  ])(
    "shows $value locally on the first client render and submits its offset and precision",
    async ({ value, displayed, edited, emitted, step }) => {
      const dispatch = vi.fn();
      let firstType: string | undefined;
      const Capture = () => (
        <div
          ref={(element) => {
            if (element && firstType === undefined) {
              firstType = element.querySelector("input")!.type;
            }
          }}
        >
          {view(
            { inputType: "datetime", value, $action: { type: "save" } },
            dispatch,
          )}
        </div>
      );
      const container = await mount(<Capture />);
      const input = container.querySelector("input")!;
      expect(firstType).toBe("datetime-local");
      expect(input.getAttribute("value")).toBe(displayed);
      expect(input.value).toBe(nativeValue("datetime-local", displayed));
      expect(input.step).toBe(step);
      expect(input.getAttribute("aria-label")).toBe("When");
      expect(input.name).toBe("when");
      expect(input.readOnly).toBe(false);
      await change(input, edited);
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "save",
        $input: emitted,
      });
      expect(input.value).toBe(nativeValue("datetime-local", edited));
    },
  );

  it("converts instant bounds and preserves floating bounds", async () => {
    const container = await mount(
      view({
        inputType: "datetime",
        value: "2026-07-15T12:34Z",
        min: "2026-07-15T00:00:30+08:00",
        max: "2026-07-16T23:59:45-05:30",
      }),
    );
    const input = container.querySelector("input")!;
    expect(input.min).toBe("2026-07-14T12:00:30");
    expect(input.max).toBe("2026-07-17T01:29:45");
    await React.act(async () =>
      root!.render(
        view({
          inputType: "datetime",
          value: "2026-07-15T12:34Z",
          min: "2026-07-15T01:00",
          max: "2026-07-15T22:00",
        }),
      ),
    );
    expect(input.min).toBe("2026-07-15T01:00");
    expect(input.max).toBe("2026-07-15T22:00");
  });

  it("normalizes local and converted instant bounds", async () => {
    const container = await mount(
      view({
        inputType: "datetime",
        value: "2025-12-15T17:00:00Z",
        min: "2025-12-15T17:00:00Z",
        max: "2025-12-15T20:00:05.1200",
      }),
    );
    const input = container.querySelector("input")!;
    expect(input.min).toBe("2025-12-15T12:00");
    expect(input.max).toBe("2025-12-15T20:00:05.12");
  });

  it.each([
    ["2026-01-15T12:34", "2026-01-15T12:34:00-05:00"],
    ["2026-07-15T12:34", "2026-07-15T12:34:00-04:00"],
  ])(
    "submits an empty datetime with the viewer offset at %s",
    async (edited, emitted) => {
      const dispatch = vi.fn();
      const container = await mount(
        view({ inputType: "datetime", $action: { type: "save" } }, dispatch),
      );
      const input = container.querySelector("input")!;
      expect(input.type).toBe("datetime-local");
      expect(input.value).toBe("");
      await change(input, edited!);
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "save",
        $input: emitted,
      });
      expect(input.step).toBe("1");
    },
  );

  it("uses the viewer offset for each unbound edit of an initially empty picker", async () => {
    const dispatch = vi.fn();
    const container = await mount(
      view({ inputType: "datetime", $action: { type: "save" } }, dispatch),
    );
    const input = container.querySelector("input")!;
    await change(input, "2026-01-15T12:34");
    await change(input, "2026-07-15T12:34");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-15T12:34:00-04:00",
    });
    await change(input, "");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "save", $input: "" });
    await change(input, "2026-07-16T12:34");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-16T12:34:00-04:00",
    });
  });

  it.each([
    {
      inputType: "date",
      value: "2026-07-15",
      min: "2026-01-01",
      max: "2026-12-31",
      edited: "2026-07-16",
      step: "",
    },
    {
      inputType: "time",
      value: "12:34",
      min: "09:00",
      max: "17:00",
      edited: "13:45",
      step: "",
    },
    {
      inputType: "time",
      value: "12:34:56",
      min: "09:00:01",
      max: "17:00:59",
      edited: "13:45:30",
      step: "1",
    },
    {
      inputType: "datetime",
      value: "2026-07-15T12:34",
      min: "2026-07-15T09:00",
      max: "2026-07-15T17:00",
      edited: "2026-07-15T13:45",
      step: "",
    },
    {
      inputType: "datetime",
      value: "2026-07-15T12:34:56",
      min: "2026-07-15T09:00:01",
      max: "2026-07-15T17:00:59",
      edited: "2026-07-15T13:45:30",
      step: "1",
      editedFieldValue: "2026-07-15T13:45:30.000",
    },
  ])(
    "passes $inputType value $value and bounds through unchanged",
    async ({ inputType, value, min, max, edited, step, editedFieldValue }) => {
      const dispatch = vi.fn();
      const container = await mount(
        view(
          { inputType, value, min, max, $action: { type: "save" } },
          dispatch,
        ),
      );
      const input = container.querySelector("input")!;
      expect(input.type).toBe(
        inputType === "datetime" ? "datetime-local" : inputType,
      );
      expect(input.getAttribute("value")).toBe(value);
      expect(input.hasAttribute(FIELD_VALUE_ATTR)).toBe(false);
      expect(collectFormValues([input])).toEqual({
        when: nativeValue(input.type, value),
      });
      expect(input.value).toBe(nativeValue(input.type, value));
      expect(input.min).toBe(min);
      expect(input.max).toBe(max);
      expect(input.step).toBe(step);
      await change(input, edited);
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "save",
        $input: nativeValue(input.type, edited),
      });
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(
        editedFieldValue ?? null,
      );
      expect(collectFormValues([input])).toEqual({
        when: nativeValue(input.type, edited),
      });
    },
  );

  it.each([
    {
      inputType: "datetime",
      value: "2026-07-15T12:34:56+08:00",
      edited: "2026-07-16T09:45:30",
      emitted: "2026-07-16T21:45:30+08:00",
      hasInstantAnchor: true,
    },
    {
      inputType: "datetime",
      value: "",
      edited: "2026-07-16T09:45",
      emitted: "2026-07-16T09:45:00-04:00",
      hasInstantAnchor: false,
    },
    {
      inputType: "datetime",
      value: "2026-07-15T12:34",
      edited: "2026-07-16T09:45",
      emitted: "2026-07-16T09:45",
      hasInstantAnchor: false,
    },
    {
      inputType: "time",
      value: "12:34",
      edited: "09:45",
      emitted: "09:45",
      hasInstantAnchor: false,
    },
  ])(
    "sends the same $inputType value to the binding and action for $value",
    async ({ inputType, value, edited, emitted, hasInstantAnchor }) => {
      const update = vi.fn();
      const dispatch = vi.fn();
      const BindingContext = A2uiBindingContext!;
      const Surface = () => {
        const [current, setCurrent] = React.useState(value);
        return (
          <BindingContext.Provider
            value={{
              fields: new Map([
                ["when", { value: current, arrayValue: false }],
              ]),
              update: (path, next) => {
                update(path, next);
                setCurrent(String(next));
              },
            }}
          >
            {view(
              { inputType, value: current, $action: { type: "save" } },
              dispatch,
            )}
            <output>{current}</output>
          </BindingContext.Provider>
        );
      };
      const container = await mount(<Surface />);
      const input = container.querySelector("input")!;
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(
        hasInstantAnchor ? value : null,
      );
      await change(input, edited);
      expect(update).toHaveBeenLastCalledWith("when", emitted);
      expect(dispatch).toHaveBeenLastCalledWith({
        type: "save",
        $input: emitted,
      });
      expect(container.querySelector("output")!.textContent).toBe(emitted);
      expect(input.getAttribute(FIELD_VALUE_ATTR)).toBe(
        hasInstantAnchor || /(?:Z|[+-]\d{2}:\d{2})$/.test(emitted)
          ? emitted
          : null,
      );
      expect(input.value).toBe(nativeValue(input.type, edited));
      await change(input, "");
      expect(update).toHaveBeenLastCalledWith("when", "");
      expect(dispatch).toHaveBeenLastCalledWith({ type: "save", $input: "" });
    },
  );

  it("uses answered values and accepts later value replacements", async () => {
    const dispatch = vi.fn();
    const container = await mount(
      <AnsweredValuesProvider values={{ when: "2026-07-15T12:34:56-05:30" }}>
        {view(
          {
            inputType: "datetime",
            value: "2026-07-15T12:34Z",
            $action: { type: "save" },
          },
          dispatch,
        )}
      </AnsweredValuesProvider>,
    );
    let input = container.querySelector("input")!;
    expect(input.value).toBe(
      nativeValue("datetime-local", "2026-07-15T14:04:56"),
    );
    await change(input, "2026-07-16T09:45:30");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-16T08:15:30-05:30",
    });
    await React.act(async () =>
      root!.render(
        <AnsweredValuesProvider values={undefined}>
          {view(
            {
              inputType: "datetime",
              value: "2026-07-17T12:34:56+08:00",
              $action: { type: "save" },
            },
            dispatch,
          )}
        </AnsweredValuesProvider>,
      ),
    );
    input = container.querySelector("input")!;
    expect(input.value).toBe(
      nativeValue("datetime-local", "2026-07-17T00:34:56"),
    );
    await change(input, "2026-07-18T09:45:30");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-18T21:45:30+08:00",
    });
  });

  it("renders the raw instant on the server and hydrates without a mismatch", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRecoverableError = vi.fn();
    const dispatch = vi.fn();
    const tree = view(
      {
        inputType: "datetime",
        value: "2026-07-15T12:34:56.123+08:00",
        $action: { type: "save" },
      },
      dispatch,
    );
    const html = renderToString(tree);
    expect(html).toContain('type="text"');
    expect(html).toMatch(/readonly=""/i);
    expect(html).toContain('value="2026-07-15T12:34:56.123+08:00"');
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    await React.act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError });
    });
    const input = container.querySelector("input")!;
    expect(input.type).toBe("datetime-local");
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe(
      nativeValue("datetime-local", "2026-07-15T00:34:56.123"),
    );
    await change(input, "2026-07-16T09:45:30");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "save",
      $input: "2026-07-16T21:45:30.000+08:00",
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it.each([
    { inputType: "date", value: "2026-07-15", type: "date" },
    { inputType: "time", value: "12:34:56", type: "time" },
    {
      inputType: "datetime",
      value: "2026-07-15T12:34:56.123",
      type: "datetime-local",
    },
    { inputType: "datetime", value: "", type: "datetime-local" },
  ])(
    "server renders $inputType $value as an editable picker immediately",
    ({ inputType, value, type }) => {
      const html = renderToString(view({ inputType, value }));
      expect(html).toContain(`type="${type}"`);
      expect(html).toContain(`value="${value}"`);
      expect(html.toLowerCase()).not.toContain("readonly");
    },
  );
});
