// @vitest-environment jsdom
import { act } from "react";
import { AccessibilityInfo } from "react-native";
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

afterEach(() => {
  cleanupSpecs();
  vi.useRealTimers();
});

const actions = {
  go: { description: "Go" },
  capture: { description: "Capture a value" },
};

describe("interactive vocabulary on React Native", () => {
  it("presses a Button like the web", async () => {
    const input = spec({
      main: {
        type: "Button",
        props: { label: "Go", buttonStyle: "primary" },
        on: { press: { action: "go", params: { from: "button" } } },
      },
    });
    const native = vi.fn();
    const web = vi.fn();
    const { container } = renderNativeSpec(input, { go: native }, actions);
    const webSpec = renderWebSpec(input, { go: web }, actions);
    await press(byRole(container, "button", "Go"));
    await act(async () => webSpec.container.querySelector("button")!.click());
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(byRole(container, "button", "Go").style.backgroundColor).toBe(
      "rgb(23, 23, 23)",
    );
  });

  it("counts an undoable Button down and fires after the window", async () => {
    vi.useFakeTimers();
    const announce = vi
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    const go = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Button",
          props: { label: "Delete", undoable: true },
          on: { press: { action: "go" } },
        },
      }),
      { go },
      actions,
    );
    await press(byRole(container, "button", "Delete"));
    expect(byRole(container, "button", "Undo Delete").textContent).toBe(
      "Undo 5",
    );
    expect(announce).toHaveBeenCalledWith("Delete in 5 seconds");
    for (let second = 0; second < 4; second++)
      await act(async () => vi.advanceTimersByTime(1_000));
    expect(byRole(container, "button", "Undo Delete").textContent).toBe(
      "Undo 1",
    );
    expect(go).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(go).toHaveBeenCalledOnce();
    expect(byRole(container, "button", "Delete").textContent).toBe("Delete");
  });

  it("cancels an undoable Button on a second press", async () => {
    vi.useFakeTimers();
    vi.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(
      () => {},
    );
    const go = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Button",
          props: { label: "Delete", undoable: true },
          on: { press: { action: "go" } },
        },
      }),
      { go },
      actions,
    );
    await press(byRole(container, "button", "Delete"));
    await press(byRole(container, "button", "Undo Delete"));
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(go).not.toHaveBeenCalled();
    expect(byRole(container, "button", "Delete").textContent).toBe("Delete");
  });

  it("submits the enclosing asForm Card from a submit Button", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Card",
          props: { asForm: true },
          children: ["name", "send"],
          on: {
            confirm: { action: "capture", params: { values: { $event: "" } } },
          },
        },
        name: { type: "Input", props: { name: "name", label: "Name" } },
        send: { type: "Button", props: { label: "Send", submit: true } },
      }),
      { capture },
      actions,
    );
    await typeText(container.querySelector("input")!, "Ada");
    await press(byRole(container, "button", "Send"));
    expect(capture.mock.calls[0]![0]).toEqual({ values: { name: "Ada" } });
  });

  it("submits an unbound Input's text on return like the web", async () => {
    const input = spec({
      main: {
        type: "Input",
        props: { label: "Search", defaultValue: "a" },
        on: {
          submit: { action: "capture", params: { value: { $event: "" } } },
        },
      },
    });
    const native = vi.fn();
    const web = vi.fn();
    const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
    const webSpec = renderWebSpec(input, { capture: web }, actions);
    await typeText(nativeSpec.container.querySelector("input")!, "abc");
    await typeText(webSpec.container.querySelector("input")!, "abc");
    await pressEnter(nativeSpec.container.querySelector("input")!);
    await pressEnter(webSpec.container.querySelector("input")!);
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(native.mock.calls[0]![0]).toEqual({ value: "abc" });
  });

  it("writes a bound Input back to state and follows it", async () => {
    const { container, state } = renderNativeSpec(
      spec(
        {
          main: {
            type: "Input",
            props: { label: "Name", defaultValue: { $bindState: "/name" } },
          },
        },
        { name: "Ada" },
      ),
    );
    const field = container.querySelector("input")!;
    expect(field.value).toBe("Ada");
    await typeText(field, "Grace");
    expect(state.get("/name")).toBe("Grace");
    await act(async () => state.set("/name", "Hopper"));
    expect(field.value).toBe("Hopper");
  });

  it("restarts an unbound Input when its initial value changes", async () => {
    const view = (defaultValue: string) =>
      spec({ main: { type: "Input", props: { label: "Name", defaultValue } } });
    const rendered = renderNativeSpec(view("a"));
    await typeText(rendered.container.querySelector("input")!, "typed");
    await rendered.update(view("a"));
    expect(rendered.container.querySelector("input")!.value).toBe("typed");
    await rendered.update(view("b"));
    expect(rendered.container.querySelector("input")!.value).toBe("b");
  });

  it("hides a password and keeps a multiline Input from submitting on return", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Col", props: {}, children: ["secret", "notes"] },
        secret: {
          type: "Input",
          props: { label: "Secret", inputType: "password" },
        },
        notes: {
          type: "Input",
          props: { label: "Notes", multiline: true },
          on: { submit: { action: "capture" } },
        },
      }),
      { capture },
      actions,
    );
    expect(container.querySelector("input")!.type).toBe("password");
    const notes = container.querySelector("textarea")!;
    await pressEnter(notes);
    expect(capture).not.toHaveBeenCalled();
  });
});

const options = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b", description: "Second choice" },
  { label: "Gamma", value: "c" },
];

const choices = [
  { type: "Select", initial: "a", reset: "c", selected: "b" },
  { type: "Checkbox", initial: false, reset: true, selected: true },
  { type: "RadioGroup", initial: "a", reset: "c", selected: "b" },
  {
    type: "CheckboxGroup",
    initial: ["a"],
    reset: ["c"],
    selected: ["a", "b"],
  },
] as const;

const control = (type: string, initial: unknown, label = "Choices") => ({
  type,
  props:
    type === "Checkbox"
      ? { label, name: "choice", defaultChecked: initial }
      : {
          label,
          name: "choice",
          options,
          defaultValue: initial,
          ...(type === "Select" ? { placeholder: "Pick one" } : {}),
        },
  on: {
    change: { action: "capture", params: { value: { $event: "" } } },
  },
});

const row = (container: HTMLElement, type: string, label?: string) =>
  byRole(
    container,
    type === "Checkbox" || type === "CheckboxGroup" ? "checkbox" : "radio",
    label ?? (type === "Checkbox" ? "Choices" : "Beta"),
  );

const changeWeb = async (container: HTMLElement, type: string) => {
  if (type === "Select") {
    const select = container.querySelector("select")!;
    await act(async () => {
      select.value = "b";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  } else {
    const target =
      type === "Checkbox"
        ? container.querySelector<HTMLInputElement>("input[type=checkbox]")!
        : container.querySelector<HTMLInputElement>('input[value="b"]')!;
    await act(async () => target.click());
  }
};

describe("native choice controls", () => {
  it.each(["Select", "RadioGroup"])(
    "does not dispatch a repeated $type selection",
    async (type) => {
      const capture = vi.fn();
      const { container } = renderNativeSpec(
        spec({ main: control(type, "a") }),
        { capture },
        actions,
      );
      await press(row(container, type, "Alpha"));
      expect(capture).not.toHaveBeenCalled();
    },
  );

  it("keeps CheckboxGroup changes in option order", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({ main: control("CheckboxGroup", ["c"]) }),
      { capture },
      actions,
    );
    await press(row(container, "CheckboxGroup"));
    expect(capture.mock.calls[0]![0]).toEqual({ value: ["b", "c"] });
  });

  it.each(choices)(
    "dispatches $type changes like the web",
    async ({ type, initial, selected }) => {
      const input = spec({ main: control(type, initial) });
      const native = vi.fn();
      const web = vi.fn();
      const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
      const webSpec = renderWebSpec(input, { capture: web }, actions);
      await press(row(nativeSpec.container, type));
      await changeWeb(webSpec.container, type);
      expect(native).toHaveBeenCalledOnce();
      expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
      expect(native.mock.calls[0]![0]).toEqual({ value: selected });
    },
  );

  it.each(choices)(
    "writes bound $type values and follows state",
    async ({ type, initial, selected }) => {
      const field = control(type, { $bindState: "/choice" });
      const rendered = renderNativeSpec(
        spec({ main: field }, { choice: initial }),
        { capture: vi.fn() },
        actions,
      );
      await press(row(rendered.container, type));
      expect(rendered.state.get("/choice")).toEqual(selected);
      expect(row(rendered.container, type).getAttribute("aria-checked")).toBe(
        "true",
      );
      await act(async () => rendered.state.set("/choice", initial));
      expect(row(rendered.container, type).getAttribute("aria-checked")).toBe(
        "false",
      );
      expect(
        row(
          rendered.container,
          type,
          type === "Checkbox" ? "Choices" : "Alpha",
        ).getAttribute("aria-checked"),
      ).toBe(type === "Checkbox" ? "false" : "true");
    },
  );

  it.each(choices)(
    "resets unbound $type only when its initial value changes",
    async ({ type, initial, reset }) => {
      const view = (value: unknown, label = "Choices") =>
        spec({ main: control(type, value, label) });
      const rendered = renderNativeSpec(
        view(initial),
        { capture: vi.fn() },
        actions,
      );
      await press(row(rendered.container, type));
      await rendered.update(view(initial, "Updated choices"));
      expect(
        row(
          rendered.container,
          type,
          type === "Checkbox" ? "Updated choices" : "Beta",
        ).getAttribute("aria-checked"),
      ).toBe("true");
      await rendered.update(view(reset, "Updated choices"));
      if (type === "Checkbox") {
        await rendered.update(view(false, "Updated choices"));
        expect(
          row(rendered.container, type, "Updated choices").getAttribute(
            "aria-checked",
          ),
        ).toBe("false");
      } else {
        expect(
          row(rendered.container, type, "Gamma").getAttribute("aria-checked"),
        ).toBe("true");
        expect(
          row(rendered.container, type, "Beta").getAttribute("aria-checked"),
        ).toBe("false");
      }
    },
  );

  it.each(choices)(
    "submits $type values in an asForm Card like the web",
    async ({ type, initial, selected }) => {
      const input = spec({
        main: {
          type: "Card",
          props: { asForm: true, confirm: { label: "Send" } },
          children: ["choice"],
          on: {
            confirm: { action: "capture", params: { values: { $event: "" } } },
          },
        },
        choice: control(type, initial),
      });
      const native = vi.fn();
      const web = vi.fn();
      const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
      const webSpec = renderWebSpec(input, { capture: web }, actions);
      await press(row(nativeSpec.container, type));
      await changeWeb(webSpec.container, type);
      await press(byRole(nativeSpec.container, "button", "Send"));
      await act(async () =>
        webSpec.container.querySelector("form")!.requestSubmit(),
      );
      expect(native.mock.calls.at(-1)![0]).toEqual(web.mock.calls.at(-1)![0]);
      expect(native.mock.calls.at(-1)![0]).toEqual({
        values: { choice: selected },
      });
    },
  );

  it.each(choices)(
    "exposes $type roles, labels, and checked state",
    ({ type, initial }) => {
      const { container } = renderNativeSpec(
        spec({ main: control(type, initial) }),
      );
      if (type !== "Checkbox") {
        const group = byRole(
          container,
          type === "CheckboxGroup" ? "group" : "radiogroup",
          "Choices",
        );
        expect(group.getAttribute("aria-label")).toBe("Choices");
      }
      expect(
        row(
          container,
          type,
          type === "Checkbox" ? "Choices" : "Alpha",
        ).getAttribute("aria-checked"),
      ).toBe(type === "Checkbox" ? "false" : "true");
      expect(row(container, type).getAttribute("aria-label")).toBe(
        type === "Checkbox" ? "Choices" : "Beta",
      );
    },
  );

  it.each([
    { type: "Select", expected: "" },
    { type: "Checkbox", expected: false },
    { type: "RadioGroup", expected: undefined },
    { type: "CheckboxGroup", expected: [] },
  ])(
    "submits untouched $type values like the web",
    async ({ type, expected }) => {
      const input = spec({
        main: {
          type: "Card",
          props: { asForm: true, confirm: { label: "Send" } },
          children: ["choice"],
          on: {
            confirm: { action: "capture", params: { values: { $event: "" } } },
          },
        },
        choice: control(type, undefined),
      });
      const native = vi.fn();
      const web = vi.fn();
      const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
      const webSpec = renderWebSpec(input, { capture: web }, actions);
      await press(byRole(nativeSpec.container, "button", "Send"));
      await act(async () =>
        webSpec.container.querySelector("form")!.requestSubmit(),
      );
      expect(native.mock.calls[0]![0].values).toHaveProperty("choice");
      expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
      expect(native.mock.calls[0]![0]).toEqual({
        values: { choice: expected },
      });
    },
  );

  it("submits the first Select option when there is no placeholder", async () => {
    const input = spec({
      main: {
        type: "Card",
        props: { asForm: true, confirm: { label: "Send" } },
        children: ["choice"],
        on: {
          confirm: { action: "capture", params: { values: { $event: "" } } },
        },
      },
      choice: {
        type: "Select",
        props: { name: "choice", options },
      },
    });
    const native = vi.fn();
    const web = vi.fn();
    const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
    const webSpec = renderWebSpec(input, { capture: web }, actions);
    await press(byRole(nativeSpec.container, "button", "Send"));
    await act(async () =>
      webSpec.container.querySelector("form")!.requestSubmit(),
    );
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(native.mock.calls[0]![0]).toEqual({ values: { choice: "a" } });
  });

  it.each(["Select", "RadioGroup", "CheckboxGroup"])(
    "renders $type children after the options",
    (type) => {
      const { container } = renderNativeSpec(
        spec({
          main: {
            ...control(type, type === "CheckboxGroup" ? [] : "a"),
            children: ["after"],
          },
          after: { type: "Text", props: { value: "After options" } },
        }),
      );
      const group = byRole(
        container,
        type === "CheckboxGroup" ? "group" : "radiogroup",
        "Choices",
      );
      expect(group.textContent!.indexOf("After options")).toBeGreaterThan(
        group.textContent!.indexOf("Gamma"),
      );
    },
  );

  it("renders a switch Checkbox as a native switch that toggles like the web", async () => {
    const input = spec({
      main: {
        type: "Checkbox",
        props: { label: "Alerts", variant: "switch" },
        on: {
          change: { action: "capture", params: { value: { $event: "" } } },
        },
      },
    });
    const native = vi.fn();
    const web = vi.fn();
    const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
    const webSpec = renderWebSpec(input, { capture: web }, actions);
    const row = byRole(nativeSpec.container, "switch", "Alerts");
    expect(row.getAttribute("aria-checked")).toBe("false");
    await press(row);
    await act(async () =>
      webSpec.container
        .querySelector<HTMLInputElement>('[role="switch"]')!
        .click(),
    );
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(native.mock.calls[0]![0]).toEqual({ value: true });
    expect(
      byRole(nativeSpec.container, "switch", "Alerts").getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });
});

const slider = (defaultValue: unknown = 0.3) => ({
  type: "Slider",
  props: {
    label: "Volume",
    name: "volume",
    min: 0.1,
    max: 0.7,
    step: 0.2,
    unit: "%",
    defaultValue,
  },
  on: { change: { action: "capture", params: { value: { $event: "" } } } },
});

describe("native Slider", () => {
  it("steps on the min grid, rounds, clamps, and exposes its value", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({ main: slider(0.35) }),
      { capture },
      actions,
    );
    const value = () => byRole(container, "slider", "Volume");
    expect(value().getAttribute("aria-valuenow")).toBe("0.35");
    expect(value().getAttribute("aria-valuemin")).toBe("0.1");
    expect(value().getAttribute("aria-valuemax")).toBe("0.7");
    expect(value().getAttribute("aria-valuetext")).toBe("0.35 %");
    await press(byRole(container, "button", "Increase Volume"));
    expect(value().getAttribute("aria-valuenow")).toBe("0.5");
    await press(byRole(container, "button", "Increase Volume"));
    expect(value().textContent).toBe("0.7 %");
    expect(
      byRole(container, "button", "Increase Volume").getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
    await press(byRole(container, "button", "Increase Volume"));
    expect(capture).toHaveBeenCalledTimes(2);
    await press(byRole(container, "button", "Decrease Volume"));
    expect(value().getAttribute("aria-valuenow")).toBe("0.5");
    expect(capture.mock.calls.map((call) => call[0].value)).toEqual([
      0.5, 0.7, 0.5,
    ]);
    await press(byRole(container, "button", "Decrease Volume"));
    await press(byRole(container, "button", "Decrease Volume"));
    expect(value().getAttribute("aria-valuenow")).toBe("0.1");
    expect(
      byRole(container, "button", "Decrease Volume").getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
    await press(byRole(container, "button", "Decrease Volume"));
    expect(capture).toHaveBeenCalledTimes(5);
  });

  it("dispatches the same numeric change as the web", async () => {
    const input = spec({ main: slider(0.3) });
    const native = vi.fn();
    const web = vi.fn();
    const n = renderNativeSpec(input, { capture: native }, actions);
    const w = renderWebSpec(input, { capture: web }, actions);
    await press(byRole(n.container, "button", "Increase Volume"));
    const range = w.container.querySelector<HTMLInputElement>(
      'input[type="range"]',
    )!;
    await act(async () => {
      range.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      range.value = "0.5";
      range.dispatchEvent(new Event("input", { bubbles: true }));
      range.dispatchEvent(new Event("change", { bubbles: true }));
      range.dispatchEvent(new Event("pointerup", { bubbles: true }));
    });
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
  });

  it("writes bound values and restarts an unbound value when its default changes", async () => {
    const bound = renderNativeSpec(
      spec({ main: slider({ $bindState: "/volume" }) }, { volume: 0.3 }),
    );
    await press(byRole(bound.container, "button", "Increase Volume"));
    expect(bound.state.get("/volume")).toBe(0.5);
    await act(async () => bound.state.set("/volume", 0.7));
    expect(
      byRole(bound.container, "slider", "Volume").getAttribute("aria-valuenow"),
    ).toBe("0.7");
    const unbound = renderNativeSpec(spec({ main: slider(0.3) }));
    await press(byRole(unbound.container, "button", "Increase Volume"));
    await unbound.update(spec({ main: slider(0.3) }));
    expect(
      byRole(unbound.container, "slider", "Volume").getAttribute(
        "aria-valuenow",
      ),
    ).toBe("0.5");
    await unbound.update(spec({ main: slider(0.1) }));
    expect(
      byRole(unbound.container, "slider", "Volume").getAttribute(
        "aria-valuenow",
      ),
    ).toBe("0.1");
  });

  it("submits a number from an asForm Card like the web", async () => {
    const input = spec({
      main: {
        type: "Card",
        props: { asForm: true, confirm: { label: "Send" } },
        children: ["volume"],
        on: {
          confirm: { action: "capture", params: { values: { $event: "" } } },
        },
      },
      volume: slider(0.3),
    });
    const native = vi.fn();
    const web = vi.fn();
    const n = renderNativeSpec(input, { capture: native }, actions);
    const w = renderWebSpec(input, { capture: web }, actions);
    await press(byRole(n.container, "button", "Increase Volume"));
    const range = w.container.querySelector<HTMLInputElement>(
      'input[type="range"]',
    )!;
    await act(async () => {
      range.value = "0.5";
      range.dispatchEvent(new Event("input", { bubbles: true }));
      range.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await press(byRole(n.container, "button", "Send"));
    await act(async () => w.container.querySelector("form")!.requestSubmit());
    expect(native.mock.lastCall![0]).toEqual(web.mock.lastCall![0]);
    expect(native.mock.lastCall![0]).toEqual({ values: { volume: 0.5 } });
  });
});
