// @vitest-environment jsdom
import { act } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStateStore, type Spec } from "generative-frame/spec";
import { SpecRenderer as ReactSpecRenderer } from "generative-frame/spec/react";
import { SpecRenderer as VueSpecRenderer } from "generative-frame/spec/vue";
import { toSpecCatalog as toReactSpecCatalog } from "../../spec/toSpecCatalog";
import { toSpecCatalog as toVueSpecCatalog } from "../toSpecCatalog";
import { GENERATED_NAME_ATTR } from "../../constants";
import {
  canonical,
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const interactiveUnmounts: (() => void)[] = [];
afterEach(() => {
  cleanupSpecs();
  for (const unmount of interactiveUnmounts.splice(0)) unmount();
});

const options = [
  { label: "Small", value: "s" },
  { label: "Large", value: "l" },
];
const described = [
  { label: "Small", value: "s", description: "Compact" },
  { label: "Large", value: "l" },
];
const bound = (prop: string) => ({ [prop]: { $bindState: "/v" } });
const on = (event: string) => ({
  [event]: { action: "capture", params: { value: { $event: "" } } },
});
const actions = {
  capture: { description: "Capture the control value." },
  refresh: { description: "Refresh." },
};
const reactCatalog = toReactSpecCatalog(undefined, { actions });
const vueCatalog = toVueSpecCatalog(undefined, { actions });
const renderWithHandler = (
  source: Spec,
  handler: (params: Record<string, unknown>) => void,
  framework: "react" | "vue",
) => {
  const container = document.createElement("div");
  document.body.append(container);
  const state = createStateStore(source.state ?? {});
  const handlers = { capture: handler, refresh: handler };
  let update: (next: Spec) => Promise<void>;
  if (framework === "react") {
    const root = createRoot(container);
    act(() =>
      root.render(
        createElement(ReactSpecRenderer, {
          spec: source,
          state,
          handlers,
          ...reactCatalog,
        }),
      ),
    );
    interactiveUnmounts.push(() => act(() => root.unmount()));
    update = async (next) => {
      await act(async () => {
        root.render(
          createElement(ReactSpecRenderer, {
            spec: next,
            state,
            handlers,
            ...reactCatalog,
          }),
        );
      });
    };
  } else {
    const current = shallowRef(source);
    const app = createApp({
      render: () =>
        h(VueSpecRenderer, {
          spec: current.value,
          state,
          handlers,
          ...vueCatalog,
        }),
    });
    app.mount(container);
    interactiveUnmounts.push(() => app.unmount());
    update = async (next) => {
      current.value = next;
      await nextTick();
    };
  }
  return {
    container,
    state,
    markup: () => {
      const ids = new Map<string, string>();
      return [...container.childNodes]
        .map((node) => canonical(node, ids))
        .join("");
    },
    update,
  };
};
const setValue = (
  input: HTMLInputElement | HTMLSelectElement,
  value: string,
) => {
  if (input instanceof HTMLSelectElement) input.value = value;
  else
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
};
const query = <T extends Element>(container: Element, selector: string) => {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};

const cases: [string, Spec][] = [
  ["Button basic", spec({ main: { type: "Button", props: { label: "Go" } } })],
  [
    "Button styles",
    spec({
      main: {
        type: "Button",
        props: {
          label: "Save",
          buttonStyle: "primary",
          block: true,
          submit: true,
        },
      },
    }),
  ],
  [
    "Button false flags",
    spec({
      main: {
        type: "Button",
        props: { label: "Save", block: false, submit: false },
      },
    }),
  ],
  [
    "Button action",
    spec({ main: { type: "Button", props: { label: "Go" }, on: on("press") } }),
  ],
  [
    "Button children",
    spec({
      main: { type: "Button", props: { label: "Go" }, children: ["note"] },
      note: { type: "Text", props: { value: " now" } },
    }),
  ],
  [
    "Button undoable",
    spec({
      main: {
        type: "Button",
        props: { label: "Send", undoable: true },
        on: on("press"),
      },
    }),
  ],
  [
    "Select options",
    spec({
      main: {
        type: "Select",
        props: {
          options,
          placeholder: "Pick",
          label: "Size",
          name: "size",
          defaultValue: "l",
        },
      },
    }),
  ],
  [
    "Select placeholder",
    spec({ main: { type: "Select", props: { options, placeholder: "Pick" } } }),
  ],
  [
    "Select duplicates",
    spec({
      main: { type: "Select", props: { options: [...options, options[0]] } },
    }),
  ],
  [
    "Select invalid options",
    spec({ main: { type: "Select", props: { options: "not-an-array" } } }),
  ],
  ["Input default", spec({ main: { type: "Input" } })],
  [
    "Input text",
    spec({
      main: {
        type: "Input",
        props: {
          inputType: "text",
          defaultValue: "Hi",
          name: "message",
          label: "Message",
          placeholder: "Type",
        },
      },
    }),
  ],
  [
    "Input multiline",
    spec({
      main: { type: "Input", props: { multiline: true, defaultValue: "Hi" } },
    }),
  ],
  [
    "Input password",
    spec({
      main: {
        type: "Input",
        props: { inputType: "password", multiline: true },
      },
    }),
  ],
  [
    "Input number",
    spec({
      main: { type: "Input", props: { inputType: "number", multiline: true } },
    }),
  ],
  [
    "DatePicker date",
    spec({
      main: {
        type: "DatePicker",
        props: {
          value: "2026-10-12",
          min: "2026-10-01",
          max: "2026-10-31",
          name: "date",
          label: "Date",
        },
      },
    }),
  ],
  [
    "DatePicker datetime",
    spec({
      main: {
        type: "DatePicker",
        props: { inputType: "datetime", value: "2026-10-12T12:30:00Z" },
      },
    }),
  ],
  [
    "DatePicker time",
    spec({
      main: {
        type: "DatePicker",
        props: { inputType: "time", value: "12:30:45" },
      },
    }),
  ],
  [
    "DatePicker floating",
    spec({
      main: {
        type: "DatePicker",
        props: {
          inputType: "datetime",
          value: "2026-10-12T12:30",
          min: "2026-10-01T00:00",
          max: "2026-10-31T23:59",
        },
      },
    }),
  ],
  [
    "Checkbox default",
    spec({ main: { type: "Checkbox", props: { label: "Agree" } } }),
  ],
  [
    "Checkbox checked",
    spec({
      main: {
        type: "Checkbox",
        props: { label: "Agree", defaultChecked: true, name: "agree" },
      },
    }),
  ],
  [
    "Checkbox switch",
    spec({
      main: {
        type: "Checkbox",
        props: { label: "Enabled", variant: "switch" },
      },
    }),
  ],
  [
    "Slider default",
    spec({ main: { type: "Slider", props: { min: 0, max: 10 } } }),
  ],
  [
    "Slider labelled",
    spec({
      main: {
        type: "Slider",
        props: {
          min: 0,
          max: 10,
          step: 2,
          defaultValue: 4,
          unit: "px",
          label: "Size",
          name: "size",
        },
      },
    }),
  ],
  [
    "RadioGroup described",
    spec({
      main: {
        type: "RadioGroup",
        props: {
          options: described,
          defaultValue: "s",
          name: "size",
          label: "Size",
        },
      },
    }),
  ],
  [
    "RadioGroup children",
    spec({
      main: {
        type: "RadioGroup",
        props: { options, name: "size" },
        children: ["note"],
      },
      note: { type: "Text", props: { value: "Extra" } },
    }),
  ],
  ["RadioGroup missing options", spec({ main: { type: "RadioGroup" } })],
  [
    "CheckboxGroup described",
    spec({
      main: {
        type: "CheckboxGroup",
        props: {
          options: described,
          defaultValue: ["s"],
          name: "size",
          label: "Size",
        },
      },
    }),
  ],
  [
    "CheckboxGroup children",
    spec({
      main: {
        type: "CheckboxGroup",
        props: { options, name: "size" },
        children: ["note"],
      },
      note: { type: "Text", props: { value: "Extra" } },
    }),
  ],
  ["CheckboxGroup missing options", spec({ main: { type: "CheckboxGroup" } })],
];

describe("interactive vocabulary in Vue", () => {
  it.each(cases)("renders %s like React", (_name, source) => {
    expect(renderVueSpec(source).markup()).toBe(
      renderReactSpec(source).markup(),
    );
  });

  it.each([
    [
      "Button",
      { label: "Go" },
      "press",
      "button",
      "click",
      undefined,
      undefined,
    ],
    ["Select", { options }, "change", "select", "change", "l", undefined],
    [
      "Input",
      { defaultValue: "Start" },
      "submit",
      "input",
      "keydown",
      "New",
      undefined,
    ],
    [
      "DatePicker",
      { value: "2026-10-12" },
      "change",
      "input",
      "input",
      "2026-10-14",
      undefined,
    ],
    [
      "Checkbox",
      { label: "Agree" },
      "change",
      "input",
      "click",
      undefined,
      undefined,
    ],
    [
      "Slider",
      { min: 0, max: 10, defaultValue: 4 },
      "change",
      "input",
      "pointerup",
      "7",
      "pointerdown",
    ],
    [
      "RadioGroup",
      { options, name: "group" },
      "change",
      'input[value="l"]',
      "click",
      undefined,
      undefined,
    ],
    [
      "CheckboxGroup",
      { options, name: "group" },
      "change",
      'input[value="l"]',
      "click",
      undefined,
      undefined,
    ],
  ] as const)(
    "emits %s like React",
    async (type, props, event, selector, trigger, value, before) => {
      const source = spec({ main: { type, props, on: on(event) } });
      const reactHandler = vi.fn();
      const vueHandler = vi.fn();
      const react = renderWithHandler(source, reactHandler, "react");
      const vue = renderWithHandler(source, vueHandler, "vue");
      vue.container.remove();
      const perform = (container: HTMLElement) => {
        const control = query<HTMLElement>(container, selector);
        if (before) control.dispatchEvent(new Event(before, { bubbles: true }));
        if (value !== undefined) setValue(control as HTMLInputElement, value);
        if (trigger === "click") control.click();
        else if (trigger === "keydown")
          control.dispatchEvent(
            new KeyboardEvent(trigger, { key: "Enter", bubbles: true }),
          );
        else control.dispatchEvent(new Event(trigger, { bubbles: true }));
      };
      await act(async () => perform(react.container));
      react.container.remove();
      document.body.append(vue.container);
      perform(vue.container);
      await nextTick();
      expect(vue.markup()).toBe(react.markup());
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
      expect(vueHandler).toHaveBeenCalledOnce();
      const expected =
        type === "Button"
          ? undefined
          : type === "Checkbox"
            ? true
            : type === "Slider"
              ? 7
              : type === "CheckboxGroup"
                ? ["l"]
                : type === "Input"
                  ? "New"
                  : type === "DatePicker"
                    ? "2026-10-14"
                    : "l";
      expect(vueHandler.mock.calls[0]?.[0]).toEqual({ value: expected });
      expect(vue.state.get("")).toEqual(react.state.get(""));
    },
  );

  it.each([
    [
      "Select",
      { options, ...bound("defaultValue") },
      "select",
      "change",
      "l",
      undefined,
    ],
    ["Input", { ...bound("defaultValue") }, "input", "input", "New", undefined],
    [
      "DatePicker",
      { ...bound("value") },
      "input",
      "input",
      "2026-10-14",
      undefined,
    ],
    [
      "Checkbox",
      { label: "Agree", ...bound("defaultChecked") },
      "input",
      "click",
      undefined,
      undefined,
    ],
    [
      "Slider",
      { min: 0, max: 10, ...bound("defaultValue") },
      "input",
      "input",
      "7",
      "pointerdown",
    ],
    [
      "RadioGroup",
      { options, name: "group", ...bound("defaultValue") },
      'input[value="l"]',
      "click",
      undefined,
      undefined,
    ],
    [
      "CheckboxGroup",
      { options, name: "group", ...bound("defaultValue") },
      'input[value="l"]',
      "click",
      undefined,
      undefined,
    ],
  ] as const)(
    "writes a bound %s like React",
    async (type, props, selector, trigger, value, before) => {
      const initial =
        type === "Checkbox"
          ? false
          : type === "Slider"
            ? 4
            : type === "CheckboxGroup"
              ? ["s"]
              : type === "DatePicker"
                ? "2026-10-12"
                : "s";
      const source = spec(
        {
          main: { type, props, on: on(type === "Input" ? "submit" : "change") },
        },
        { v: initial },
      );
      const reactHandler = vi.fn();
      const vueHandler = vi.fn();
      const react = renderWithHandler(source, reactHandler, "react");
      const vue = renderWithHandler(source, vueHandler, "vue");
      vue.container.remove();
      const perform = (container: HTMLElement) => {
        const control = query<HTMLElement>(container, selector);
        if (before) control.dispatchEvent(new Event(before, { bubbles: true }));
        if (value !== undefined) setValue(control as HTMLInputElement, value);
        if (trigger === "click") control.click();
        else control.dispatchEvent(new Event(trigger, { bubbles: true }));
        if (type === "Input")
          control.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          );
        if (type === "Slider")
          control.dispatchEvent(new Event("pointerup", { bubbles: true }));
      };
      await act(async () => perform(react.container));
      react.container.remove();
      document.body.append(vue.container);
      perform(vue.container);
      await nextTick();
      expect(vue.markup()).toBe(react.markup());
      expect(vue.state.get("/v")).toEqual(react.state.get("/v"));
      const expected =
        type === "Checkbox"
          ? true
          : type === "Slider"
            ? 7
            : type === "CheckboxGroup"
              ? ["s", "l"]
              : type === "Input"
                ? "New"
                : type === "DatePicker"
                  ? "2026-10-14"
                  : "l";
      expect(vue.state.get("/v")).toEqual(expected);
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
      expect(vueHandler).toHaveBeenCalledOnce();
      expect(vueHandler.mock.calls[0]?.[0]).toEqual({ value: expected });
    },
  );

  it("commits a typed DatePicker value on blur", async () => {
    const source = spec({
      main: {
        type: "DatePicker",
        props: { value: "2026-10-12" },
        on: on("change"),
      },
    });
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderWithHandler(source, reactHandler, "react");
    const vue = renderWithHandler(source, vueHandler, "vue");
    const perform = (container: HTMLElement) => {
      const input = query<HTMLInputElement>(container, "input");
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "1", bubbles: true }),
      );
      setValue(input, "2026-10-14");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.blur();
    };
    await act(async () => perform(react.container));
    perform(vue.container);
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
      reactHandler.mock.calls.map(([params]) => params),
    );
    expect(vueHandler).toHaveBeenCalledOnce();
  });

  it("commits a stepped Slider adjustment on keyup", async () => {
    const source = spec(
      {
        main: {
          type: "Slider",
          props: {
            min: 0,
            max: 10,
            step: 2,
            defaultValue: { $bindState: "/v" },
          },
          on: on("change"),
        },
      },
      { v: 4 },
    );
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderWithHandler(source, reactHandler, "react");
    const vue = renderWithHandler(source, vueHandler, "vue");
    const perform = (container: HTMLElement) => {
      const input = query<HTMLInputElement>(container, "input");
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      setValue(input, "6");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }),
      );
    };
    await act(async () => perform(react.container));
    react.container.remove();
    perform(vue.container);
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    expect(vue.state.get("/v")).toEqual(react.state.get("/v"));
    expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
      reactHandler.mock.calls.map(([params]) => params),
    );
    expect(vueHandler).toHaveBeenCalledOnce();
  });

  it("parses a typed datetime against its instant anchor", async () => {
    const source = spec(
      {
        main: {
          type: "DatePicker",
          props: { inputType: "datetime", value: { $bindState: "/v" } },
          on: on("change"),
        },
      },
      { v: "2026-10-12T12:30:00+02:00" },
    );
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderWithHandler(source, reactHandler, "react");
    const vue = renderWithHandler(source, vueHandler, "vue");
    const perform = (container: HTMLElement) => {
      const input = query<HTMLInputElement>(container, "input");
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "1", bubbles: true }),
      );
      setValue(input, "2026-10-12T13:30");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.blur();
    };
    await act(async () => perform(react.container));
    react.container.remove();
    perform(vue.container);
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    expect(vue.state.get("/v")).toEqual(react.state.get("/v"));
    expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
      reactHandler.mock.calls.map(([params]) => params),
    );
    expect(vueHandler).toHaveBeenCalledOnce();
  });

  it("delays and cancels an undoable Button press like React", async () => {
    vi.useFakeTimers();
    try {
      const source = spec({
        main: {
          type: "Button",
          props: { label: "Send", undoable: true },
          on: on("press"),
        },
      });
      const reactHandler = vi.fn();
      const vueHandler = vi.fn();
      const react = renderWithHandler(source, reactHandler, "react");
      const vue = renderWithHandler(source, vueHandler, "vue");
      const clickReact = async () =>
        act(async () =>
          query<HTMLButtonElement>(react.container, "button").click(),
        );
      const clickVue = async () => {
        query<HTMLButtonElement>(vue.container, "button").click();
        await nextTick();
      };
      await clickReact();
      await clickVue();
      expect(vue.markup()).toBe(react.markup());
      await clickReact();
      await clickVue();
      expect(vue.markup()).toBe(react.markup());
      expect(vueHandler).not.toHaveBeenCalled();
      await clickReact();
      await clickVue();
      for (let second = 0; second < 5; second++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await nextTick();
      }
      expect(vue.markup()).toBe(react.markup());
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
      expect(vueHandler).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps generated group names within each group and separates unnamed groups", () => {
    for (const type of ["RadioGroup", "CheckboxGroup"]) {
      const source = spec({ main: { type, props: { options } } });
      const reactContainer = document.createElement("div");
      const vueContainer = document.createElement("div");
      document.body.append(reactContainer, vueContainer);
      const reactRoot = createRoot(reactContainer);
      act(() =>
        reactRoot.render(
          createElement(
            "div",
            {},
            ...[0, 1].map((key) =>
              createElement(ReactSpecRenderer, {
                key,
                spec: source,
                state: createStateStore({}),
                ...reactCatalog,
              }),
            ),
          ),
        ),
      );
      interactiveUnmounts.push(() => act(() => reactRoot.unmount()));
      const vueApp = createApp({
        render: () =>
          h(
            "div",
            [0, 1].map(() =>
              h(VueSpecRenderer, {
                spec: source,
                state: createStateStore({}),
                ...vueCatalog,
              }),
            ),
          ),
      });
      vueApp.mount(vueContainer);
      interactiveUnmounts.push(() => vueApp.unmount());
      const groups = [...vueContainer.querySelectorAll("fieldset")];
      expect(groups).toHaveLength(2);
      const names = groups.map((group) => {
        const inputs = [...group.querySelectorAll<HTMLInputElement>("input")];
        expect(inputs).toHaveLength(options.length);
        expect(
          inputs.every(
            (input) => input.getAttribute(GENERATED_NAME_ATTR) === "",
          ),
        ).toBe(true);
        expect(new Set(inputs.map((input) => input.name)).size).toBe(1);
        return inputs[0]!.name;
      });
      expect(names[0]).not.toBe(names[1]);
      expect(canonical(vueContainer.firstElementChild!)).toBe(
        canonical(reactContainer.firstElementChild!),
      );
    }
  });

  it.each([
    ["Button", { label: "Go" }, "press", "button", "click", undefined],
    ["Select", { options }, "change", "select", "change", "l"],
    ["Input", { defaultValue: "Old" }, "submit", "input", "keydown", "New"],
    ["Checkbox", { label: "Agree" }, "change", "input", "click", undefined],
    [
      "RadioGroup",
      { options, name: "group" },
      "change",
      'input[value="l"]',
      "click",
      undefined,
    ],
  ] as const)(
    "activates a patched %s event",
    async (type, props, event, selector, trigger, value) => {
      const initial = spec({ main: { type, props } });
      const patched = spec({
        main: { type, props, on: { [event]: { action: "refresh" } } },
      });
      const reactHandler = vi.fn();
      const vueHandler = vi.fn();
      const react = renderWithHandler(initial, reactHandler, "react");
      const vue = renderWithHandler(initial, vueHandler, "vue");
      await react.update(patched);
      await vue.update(patched);
      expect(vue.markup()).toBe(react.markup());
      expect(vue.markup()).toContain("data-aui-action=");
      vue.container.remove();
      const perform = (container: HTMLElement) => {
        const control = query<HTMLElement>(container, selector);
        if (value !== undefined) setValue(control as HTMLInputElement, value);
        if (trigger === "click") control.click();
        else if (trigger === "keydown")
          control.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          );
        else control.dispatchEvent(new Event(trigger, { bubbles: true }));
      };
      await act(async () => perform(react.container));
      react.container.remove();
      document.body.append(vue.container);
      perform(vue.container);
      await nextTick();
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
      expect(vueHandler).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["Input", { defaultValue: "Old" }, "New"],
    ["Checkbox", { label: "Agree", defaultChecked: false }, true],
  ] as const)("controls a patched %s binding", async (type, props, next) => {
    const initial = spec(
      { main: { type, props } },
      { v: type === "Input" ? "Old" : false },
    );
    const patched = spec({
      main: {
        type,
        props: {
          ...props,
          ...bound(type === "Input" ? "defaultValue" : "defaultChecked"),
        },
      },
    });
    const react = renderReactSpec(initial);
    const vue = renderVueSpec(initial);
    await react.update(patched);
    await vue.update(patched);
    expect(vue.markup()).toBe(react.markup());
    expect(query<HTMLInputElement>(vue.container, "input").name).toBe("main");
    const perform = (container: HTMLElement) => {
      const input = query<HTMLInputElement>(container, "input");
      if (type === "Input") {
        setValue(input, next as string);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else input.click();
    };
    await act(async () => perform(react.container));
    perform(vue.container);
    await nextTick();
    expect(vue.state.get("/v")).toBe(next);
    expect(vue.state.get("/v")).toBe(react.state.get("/v"));
    expect(vue.markup()).toBe(react.markup());
  });

  it("writes a bound Input without an event listener", async () => {
    const source = spec(
      { main: { type: "Input", props: bound("defaultValue") } },
      { v: "Old" },
    );
    const react = renderReactSpec(source);
    const vue = renderVueSpec(source);
    const perform = (container: HTMLElement) => {
      const input = query<HTMLInputElement>(container, "input");
      setValue(input, "New");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    await act(async () => perform(react.container));
    perform(vue.container);
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    expect(vue.state.get("/v")).toBe("New");
    expect(vue.state.get("/v")).toBe(react.state.get("/v"));
    expect(vue.markup()).not.toContain("data-aui-action");
  });

  it.each([
    ["Select", { options, defaultValue: { $state: "/v" } }, "s", "l", "select"],
    ["Input", { defaultValue: { $state: "/v" } }, "s", "l", "input"],
    [
      "DatePicker",
      { value: { $state: "/v" } },
      "2026-10-12",
      "2026-10-14",
      "input",
    ],
    [
      "Checkbox",
      { label: "Agree", defaultChecked: { $state: "/v" } },
      false,
      true,
      "input",
    ],
    [
      "Slider",
      { min: 0, max: 10, defaultValue: { $state: "/v" } },
      4,
      6,
      "input",
    ],
    [
      "RadioGroup",
      { options, name: "group", defaultValue: { $state: "/v" } },
      "s",
      "l",
      "input",
    ],
    [
      "CheckboxGroup",
      { options, name: "group", defaultValue: { $state: "/v" } },
      ["s"],
      ["l"],
      "input",
    ],
  ] as const)(
    "updates an unbound %s default like React",
    async (type, props, initial, next, selector) => {
      const source = spec({ main: { type, props } }, { v: initial });
      const react = renderReactSpec(source);
      const vue = renderVueSpec(source);
      vue.container.remove();
      await act(async () => react.state.set("/v", next));
      react.container.remove();
      document.body.append(vue.container);
      vue.state.set("/v", next);
      await nextTick();
      expect(vue.markup()).toBe(react.markup());
      const read = (container: HTMLElement) =>
        [
          ...container.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            selector,
          ),
        ].map((input) =>
          input instanceof HTMLInputElement &&
          (input.type === "checkbox" || input.type === "radio")
            ? input.checked
            : input.value,
        );
      expect(read(vue.container)).toEqual(read(react.container));
    },
  );

  it.each([
    ["unbound", { label: "Go" }, undefined],
    ["submit", { label: "Go", submit: true }, on("press")],
  ])("does not emit a %s Button press", async (_name, props, events) => {
    const source = spec({
      main: { type: "Button", props, ...(events ? { on: events } : {}) },
    });
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderWithHandler(source, reactHandler, "react");
    const vue = renderWithHandler(source, vueHandler, "vue");
    await act(async () =>
      query<HTMLButtonElement>(react.container, "button").click(),
    );
    query<HTMLButtonElement>(vue.container, "button").click();
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    expect(reactHandler).not.toHaveBeenCalled();
    expect(vueHandler).not.toHaveBeenCalled();
  });
});
