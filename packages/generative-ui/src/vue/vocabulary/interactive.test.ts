// @vitest-environment jsdom
import { act } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString as renderReactToString } from "react-dom/server";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString as renderVueToString } from "vue/server-renderer";
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
  it.each([
    ["Input", { defaultValue: "Typed" }, "input", "Typed"],
    [
      "Input",
      { multiline: true, defaultValue: "Multiline" },
      "textarea",
      "Multiline",
    ],
    ["Select", { options, defaultValue: "l" }, "select", "l"],
    ["Checkbox", { label: "Agree", defaultChecked: true }, "input", true],
    ["Slider", { min: 0, max: 10, defaultValue: 4 }, "input", "4"],
    ["RadioGroup", { options, defaultValue: "s" }, "input", ["s"]],
    ["CheckboxGroup", { options, defaultValue: ["s"] }, "input", ["s"]],
  ] as const)(
    "server renders and hydrates unbound %s with its initial value",
    async (type, props, selector, expected) => {
      const source = spec({ main: { type, props } });
      const reactHTML = renderReactToString(
        createElement(ReactSpecRenderer, {
          spec: source,
          state: createStateStore({}),
          ...reactCatalog,
        }),
      );
      const vueApp = createSSRApp({
        render: () =>
          h(VueSpecRenderer, {
            spec: source,
            state: createStateStore({}),
            ...vueCatalog,
          }),
      });
      const vueHTML = await renderVueToString(vueApp);
      const parse = (html: string) => {
        const container = document.createElement("div");
        container.innerHTML = html;
        return container;
      };
      const read = (container: HTMLElement) => {
        if (type === "RadioGroup" || type === "CheckboxGroup")
          return [...container.querySelectorAll<HTMLInputElement>(selector)]
            .filter((input) => input.checked)
            .map((input) => input.value);
        const control = query<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >(container, selector);
        return control instanceof HTMLInputElement &&
          control.type === "checkbox"
          ? control.checked
          : control.value;
      };
      const container = parse(vueHTML);
      expect(read(parse(reactHTML))).toEqual(expected);
      expect(read(container)).toEqual(expected);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        vueApp.mount(container);
        interactiveUnmounts.push(() => vueApp.unmount());
        expect(warn).not.toHaveBeenCalled();
        expect(read(container)).toEqual(expected);
      } finally {
        warn.mockRestore();
      }
    },
  );

  it.each(cases)("renders %s like React", async (_name, source) => {
    const vue = renderVueSpec(source);
    const react = renderReactSpec(source);
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
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

  it.each([
    [
      "Select",
      { options, defaultValue: "s" },
      "select",
      "l",
      "change",
      "label",
    ],
    [
      "Input",
      { defaultValue: "Start" },
      "input",
      "Edited",
      "input",
      "placeholder",
    ],
    [
      "Input multiline",
      { defaultValue: "Start", multiline: true },
      "textarea",
      "Edited",
      "input",
      "placeholder",
    ],
    [
      "Checkbox",
      { label: "Agree", defaultChecked: false },
      "input",
      true,
      "click",
      "label",
    ],
    [
      "Slider",
      { min: 0, max: 10, defaultValue: 4 },
      "input",
      "7",
      "input",
      "label",
    ],
    [
      "RadioGroup",
      { options, defaultValue: "s" },
      'input[value="l"]',
      true,
      "click",
      "label",
    ],
    [
      "CheckboxGroup",
      { options, defaultValue: ["s"] },
      'input[value="l"]',
      true,
      "click",
      "label",
    ],
  ] as const)(
    "preserves an unbound %s edit until its initial value changes",
    async (kind, props, selector, edited, trigger, changedProp) => {
      const type = kind === "Input multiline" ? "Input" : kind;
      const event = type === "Input" ? "submit" : "change";
      const source = spec({ main: { type, props, on: on(event) } });
      const reactHandler = vi.fn();
      const vueHandler = vi.fn();
      const react = renderWithHandler(source, reactHandler, "react");
      const vue = renderWithHandler(source, vueHandler, "vue");
      const edit = (container: HTMLElement) => {
        const control = query<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >(container, selector);
        if (trigger === "click") control.click();
        else {
          if (type === "Slider")
            control.dispatchEvent(new Event("pointerdown", { bubbles: true }));
          if (control instanceof HTMLTextAreaElement)
            control.value = edited as string;
          else setValue(control, edited as string);
          control.dispatchEvent(new Event(trigger, { bubbles: true }));
        }
      };
      const read = (container: HTMLElement) => {
        const control = query<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >(container, selector);
        return control instanceof HTMLInputElement &&
          (control.type === "checkbox" || control.type === "radio")
          ? control.checked
          : control.value;
      };
      await act(async () => edit(react.container));
      edit(vue.container);
      await nextTick();
      const updated = spec({
        main: {
          type,
          props: { ...props, [changedProp]: "Updated" },
          on: on(event),
        },
      });
      await react.update(updated);
      await vue.update(updated);
      expect(read(vue.container)).toBe(read(react.container));
      expect(vue.markup()).toBe(react.markup());
      if (
        type === "RadioGroup" ||
        type === "CheckboxGroup" ||
        type === "Checkbox"
      )
        expect(read(vue.container)).toBe(true);
      else expect(read(vue.container)).toBe(edited);

      const commit = (container: HTMLElement) => {
        const control = query<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >(container, selector);
        if (type === "Slider")
          control.dispatchEvent(new Event("pointerup", { bubbles: true }));
        if (type === "Input")
          control.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              ctrlKey: kind === "Input multiline",
              bubbles: true,
            }),
          );
      };
      await act(async () => commit(react.container));
      commit(vue.container);
      await nextTick();
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );

      const editAgain = (container: HTMLElement) => {
        if (type === "Select") {
          const control = query<HTMLSelectElement>(container, "select");
          control.value = "s";
          control.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (type === "RadioGroup")
          query<HTMLInputElement>(container, 'input[value="s"]').click();
        else query<HTMLInputElement>(container, selector).click();
      };
      if (
        type === "Select" ||
        type === "RadioGroup" ||
        type === "CheckboxGroup" ||
        type === "Checkbox"
      ) {
        await act(async () => editAgain(react.container));
        editAgain(vue.container);
        await nextTick();
      }
      const resetValue =
        type === "Checkbox" ? "defaultChecked" : "defaultValue";
      const reset =
        type === "Checkbox"
          ? true
          : type === "CheckboxGroup"
            ? ["l"]
            : type === "Slider"
              ? 2
              : type === "Input"
                ? "Reset"
                : "l";
      const resetSpec = spec({
        main: { type, props: { ...props, [resetValue]: reset }, on: on(event) },
      });
      await react.update(resetSpec);
      await vue.update(resetSpec);
      expect(read(vue.container)).toBe(read(react.container));
      if (
        type === "Checkbox" ||
        type === "RadioGroup" ||
        type === "CheckboxGroup"
      )
        expect(read(vue.container)).toBe(true);
      else expect(read(vue.container)).toBe(String(reset));
      if (type === "CheckboxGroup")
        expect(
          query<HTMLInputElement>(vue.container, 'input[value="s"]').checked,
        ).toBe(false);
      expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
        reactHandler.mock.calls.map(([params]) => params),
      );
    },
  );

  it("updates an edited bound multiline Input from state", async () => {
    const source = spec(
      {
        main: {
          type: "Input",
          props: { multiline: true, ...bound("defaultValue") },
        },
      },
      { v: "Start" },
    );
    const react = renderReactSpec(source);
    const vue = renderVueSpec(source);
    for (const rendered of [react, vue]) {
      const textarea = query<HTMLTextAreaElement>(
        rendered.container,
        "textarea",
      );
      textarea.value = "Edited";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await nextTick();
    await act(async () => react.state.set("/v", "Written"));
    vue.state.set("/v", "Written");
    await nextTick();
    expect(query<HTMLTextAreaElement>(vue.container, "textarea").value).toBe(
      query<HTMLTextAreaElement>(react.container, "textarea").value,
    );
    expect(query<HTMLTextAreaElement>(vue.container, "textarea").value).toBe(
      "Written",
    );
  });

  it("commits an unbound Slider edit on keyup after a re-render", async () => {
    const props = { min: 0, max: 10, defaultValue: 4, label: "Size" };
    const source = spec({ main: { type: "Slider", props, on: on("change") } });
    const reactHandler = vi.fn();
    const vueHandler = vi.fn();
    const react = renderWithHandler(source, reactHandler, "react");
    const vue = renderWithHandler(source, vueHandler, "vue");
    const edit = (container: HTMLElement) => {
      const input = query<HTMLInputElement>(container, "input");
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      setValue(input, "7");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    await act(async () => edit(react.container));
    edit(vue.container);
    await nextTick();
    const updated = spec({
      main: {
        type: "Slider",
        props: { ...props, label: "Amount" },
        on: on("change"),
      },
    });
    await react.update(updated);
    await vue.update(updated);
    expect(query<HTMLInputElement>(vue.container, "input").value).toBe(
      query<HTMLInputElement>(react.container, "input").value,
    );
    const commit = (container: HTMLElement) =>
      query<HTMLInputElement>(container, "input").dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }),
      );
    await act(async () => commit(react.container));
    commit(vue.container);
    expect(vueHandler.mock.calls.map(([params]) => params)).toEqual(
      reactHandler.mock.calls.map(([params]) => params),
    );
    expect(vueHandler.mock.calls[0]?.[0]).toEqual({ value: 7 });
  });

  it.each(["Select", "RadioGroup", "CheckboxGroup"] as const)(
    "keeps %s selection by value when options reorder",
    async (type) => {
      const props = {
        options,
        ...(type === "CheckboxGroup"
          ? { defaultValue: ["s"] }
          : { defaultValue: "s" }),
      };
      const source = spec({ main: { type, props } });
      const react = renderReactSpec(source);
      const vue = renderVueSpec(source);
      const selection = (container: HTMLElement) =>
        type === "Select"
          ? query<HTMLSelectElement>(container, "select").value
          : [...container.querySelectorAll<HTMLInputElement>("input")]
              .filter((input) => input.checked)
              .map((input) => input.value);
      if (type === "Select") {
        const untouched = spec({
          main: { type, props: { ...props, options: [...options].reverse() } },
        });
        await react.update(untouched);
        await vue.update(untouched);
        expect(selection(vue.container)).toEqual(selection(react.container));
        expect(selection(vue.container)).toBe("s");
      }
      const edit = (container: HTMLElement) => {
        if (type === "Select") {
          const control = query<HTMLSelectElement>(container, "select");
          control.value = "l";
          control.dispatchEvent(new Event("change", { bubbles: true }));
        } else query<HTMLInputElement>(container, 'input[value="l"]').click();
      };
      await act(async () => edit(react.container));
      edit(vue.container);
      await nextTick();
      const reordered = spec({
        main: {
          type,
          props: {
            ...props,
            options: type === "Select" ? options : [...options].reverse(),
          },
        },
      });
      await react.update(reordered);
      await vue.update(reordered);
      expect(selection(vue.container)).toEqual(selection(react.container));
      expect(selection(vue.container)).toEqual(
        type === "Select" ? "l" : type === "RadioGroup" ? ["l"] : ["l", "s"],
      );
    },
  );

  it("keeps the browser's choice for an unbound Select whose default is not an option", async () => {
    const select = (label: string) =>
      spec({
        main: {
          type: "Select",
          props: { label, options, defaultValue: "missing" },
        },
      });
    const vue = renderVueSpec(select("Size"));
    const react = renderReactSpec(select("Size"));
    await react.update(select("Updated"));
    await vue.update(select("Updated"));
    const value = (container: HTMLElement) =>
      query<HTMLSelectElement>(container, "select").value;
    expect(value(vue.container)).toBe(value(react.container));
    expect(value(vue.container)).toBe("s");
  });
});
