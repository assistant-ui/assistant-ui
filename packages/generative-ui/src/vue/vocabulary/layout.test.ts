// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Spec } from "generative-frame/spec";
import { createStateStore } from "generative-frame/spec";
import { SpecRenderer as ReactSpecRenderer } from "generative-frame/spec/react";
import { SpecRenderer as VueSpecRenderer } from "generative-frame/spec/vue";
import { toSpecCatalog as toReactSpecCatalog } from "../../spec/toSpecCatalog";
import { toSpecCatalog as toVueSpecCatalog } from "../toSpecCatalog";
import {
  canonical,
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
  type RenderedSpec,
} from "../testUtils";

const eventUnmounts: (() => void)[] = [];
afterEach(() => {
  cleanupSpecs();
  for (const unmount of eventUnmounts.splice(0)) unmount();
});

const actions = {
  save: { description: "Save values" },
  dismiss: { description: "Dismiss card" },
};

function renderEventSpec(
  input: Spec,
  framework: "react" | "vue",
  handlers: Record<string, (params: Record<string, unknown>) => unknown>,
): Omit<RenderedSpec, "update"> {
  const container = document.createElement("div");
  document.body.append(container);
  const state = createStateStore(input.state ?? {});
  if (framework === "react") {
    const { catalog, components } = toReactSpecCatalog(undefined, { actions });
    const root = createRoot(container);
    act(() =>
      root.render(
        createElement(ReactSpecRenderer, {
          spec: input,
          catalog,
          components,
          state,
          handlers,
        }),
      ),
    );
    eventUnmounts.push(() => act(() => root.unmount()));
  } else {
    const { catalog, components } = toVueSpecCatalog(undefined, { actions });
    const app = createApp({
      render: () =>
        h(VueSpecRenderer, {
          spec: input,
          catalog,
          components,
          state,
          handlers,
        }),
    });
    app.mount(container);
    eventUnmounts.push(() => app.unmount());
  }
  return {
    container,
    state,
    markup: () =>
      [...container.childNodes].map((node) => canonical(node)).join(""),
  };
}

const tabsSpec = (tabs: string[]) =>
  spec({
    main: {
      type: "Tabs",
      props: { tabs },
      children: ["first", "second", "third"],
    },
    first: { type: "Text", props: { value: "First panel" } },
    second: { type: "Text", props: { value: "Second panel" } },
    third: { type: "Text", props: { value: "Third panel" } },
  });

describe("Tabs in Vue", () => {
  it("names the tab list like React", () => {
    const input = spec({
      main: {
        type: "Tabs",
        props: { tabs: ["One"], label: "Trip days" },
        children: ["first"],
      },
      first: { type: "Text", props: { value: "First panel" } },
    });
    const vue = renderVueSpec(input);
    expect(vue.markup()).toBe(renderReactSpec(input).markup());
    expect(
      vue.container
        .querySelector('[role="tablist"]')
        ?.getAttribute("aria-label"),
    ).toBe("Trip days");
  });

  it("renders no tabs when there are no labels or panels", () => {
    const input = spec({ main: { type: "Tabs", props: { tabs: [] } } });
    expect(renderVueSpec(input).markup()).toBe(renderReactSpec(input).markup());
  });

  it("renders mounted panels and fallback labels like React", () => {
    for (const labels of [
      ["One", "Two", "Three"],
      ["One"],
      [],
      ["One", "Two", "Three", "Four"],
    ]) {
      const react = renderReactSpec(tabsSpec(labels));
      const vue = renderVueSpec(tabsSpec(labels));
      expect(vue.markup()).toBe(react.markup());
      const tabs = [
        ...vue.container.querySelectorAll<HTMLElement>('[role="tab"]'),
      ];
      const panels = [
        ...vue.container.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
      ];
      expect(tabs.map((tab) => tab.textContent)).toEqual(
        labels.length >= 3 ? labels : [labels[0] ?? "1", "2", "3"],
      );
      expect(panels.map((panel) => panel.hidden)).toEqual(
        labels.length === 4 ? [false, true, true, true] : [false, true, true],
      );
      for (const [index, tab] of tabs.entries()) {
        expect(tab.getAttribute("aria-controls")).toBe(panels[index]!.id);
        expect(panels[index]!.getAttribute("aria-labelledby")).toBe(tab.id);
      }
      expect(panels[2]!.textContent).toContain("Third panel");
    }
  });

  it("moves focus and selection through ArrowRight, ArrowLeft, Home, and End", async () => {
    const react = renderReactSpec(tabsSpec(["One", "Two", "Three"]));
    const vue = renderVueSpec(tabsSpec(["One", "Two", "Three"]));
    const tabs = (container: HTMLElement) => [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    const press = (container: HTMLElement, key: string) =>
      tabs(container)[0]!.parentElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    press(vue.container, "Tab");
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    for (const [key, expected] of [
      ["End", 2],
      ["ArrowRight", 0],
      ["ArrowLeft", 2],
      ["Home", 0],
      ["ArrowRight", 1],
    ] as const) {
      await act(async () => press(react.container, key));
      press(vue.container, key);
      await nextTick();
      expect(vue.markup()).toBe(react.markup());
      expect(document.activeElement).toBe(tabs(vue.container)[expected]);
      expect(tabs(vue.container).map((tab) => tab.tabIndex)).toEqual(
        tabs(react.container).map((tab) => tab.tabIndex),
      );
    }
    await act(async () => tabs(react.container)[2]!.click());
    tabs(vue.container)[2]!.click();
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    const reduced = spec({
      main: { type: "Tabs", props: { tabs: ["One"] }, children: ["first"] },
      first: { type: "Text", props: { value: "First panel" } },
    });
    await react.update(reduced);
    await vue.update(reduced);
    expect(vue.markup()).toBe(react.markup());
  });
});

const element = (
  type: string,
  props: Record<string, unknown> = {},
  children?: string[],
): Spec["elements"] => ({
  main: { type, props, ...(children ? { children } : {}) },
  ...(children ? { child: { type: "Text", props: { value: "nested" } } } : {}),
});

describe("layout vocabulary in Vue", () => {
  it.each<[string, Spec["elements"]]>([
    ["Card default", element("Card")],
    [
      "Card title and padding",
      element("Card", { title: "Account", padding: 2 }, ["child"]),
    ],
    [
      "Card background",
      element("Card", { background: "linear-gradient(red, blue)" }),
    ],
    ["Card without title", element("Card", { padding: 0 })],
    [
      "Card form",
      element("Card", {
        asForm: true,
        confirm: { label: "Save" },
        cancel: { label: "Dismiss" },
      }),
    ],
    ["Card confirm footer", element("Card", { confirm: { label: "OK" } })],
    ["Card cancel footer", element("Card", { cancel: { label: "Cancel" } })],
    [
      "Card section footer",
      element("Card", {
        confirm: { label: "Save" },
        cancel: { label: "Dismiss" },
      }),
    ],
    ["Col", element("Col", { gap: 2, align: "center" }, ["child"])],
    [
      "Row",
      element("Row", { gap: 3, align: "end", justify: "between" }, ["child"]),
    ],
    ["Spacer", element("Spacer")],
    [
      "Badge",
      element("Badge", { value: "Ready", variant: "success" }, ["child"]),
    ],
    ["Box default", element("Box")],
    ["Box numeric dimensions", element("Box", { width: 100, height: 20 })],
    ["Box CSS dimensions", element("Box", { width: "50%", height: "2rem" })],
    ["Box numeric radius", element("Box", { radius: 8 })],
    ["Box full radius", element("Box", { radius: "full" })],
    [
      "Box background and children",
      element("Box", { background: "red", width: 50 }, ["child"]),
    ],
  ])("renders %s like React", (_name, elements) => {
    const input = spec(elements);
    const vue = renderVueSpec(input);
    const react = renderReactSpec(input);
    expect(vue.markup()).toBe(react.markup());
    expect(vue.markup()).toContain('data-aui="');
  });

  it.each([false, true])(
    "matches Card footer events asForm=%s",
    async (asForm) => {
      const input = spec({
        main: {
          type: "Card",
          props: {
            asForm,
            confirm: { label: "Save" },
            cancel: { label: "Dismiss" },
          },
          on: {
            confirm: [
              {
                action: "setState",
                params: { path: "/submitted", value: { $event: "" } },
              },
              { action: "save", params: { values: { $event: "" } } },
            ],
            cancel: { action: "dismiss", params: { values: { $event: "" } } },
          },
        },
      });
      const vueSave = vi.fn();
      const reactSave = vi.fn();
      const vueDismiss = vi.fn();
      const reactDismiss = vi.fn();
      const vue = renderEventSpec(input, "vue", {
        save: vueSave,
        dismiss: vueDismiss,
      });
      const react = renderEventSpec(input, "react", {
        save: reactSave,
        dismiss: reactDismiss,
      });
      expect(vue.markup()).toBe(react.markup());
      if (asForm) {
        for (const rendered of [react, vue]) {
          const field = document.createElement("input");
          field.name = "email";
          field.value = "a@x.com";
          rendered.container.querySelector("form")!.append(field);
        }
        await act(async () =>
          react.container.querySelector("form")!.requestSubmit(),
        );
        vue.container.querySelector("form")!.requestSubmit();
        await nextTick();
      } else {
        await act(async () =>
          react.container
            .querySelector<HTMLButtonElement>('[data-aui="card-confirm"]')!
            .click(),
        );
        vue.container
          .querySelector<HTMLButtonElement>('[data-aui="card-confirm"]')!
          .click();
        await nextTick();
      }
      expect(vueSave.mock.calls.map(([params]) => params)).toEqual(
        reactSave.mock.calls.map(([params]) => params),
      );
      expect(vueSave).toHaveBeenCalledOnce();
      expect(vueDismiss).not.toHaveBeenCalled();
      expect(vue.state.get("/submitted")).toEqual(
        asForm ? { email: "a@x.com" } : undefined,
      );
      expect(vue.markup()).toBe(react.markup());
      expect(vue.state.getState()).toEqual(react.state.getState());

      await act(async () =>
        react.container
          .querySelector<HTMLButtonElement>('[data-aui="card-cancel"]')!
          .click(),
      );
      vue.container
        .querySelector<HTMLButtonElement>('[data-aui="card-cancel"]')!
        .click();
      await nextTick();
      expect(vueDismiss.mock.calls.map(([params]) => params)).toEqual(
        reactDismiss.mock.calls.map(([params]) => params),
      );
      expect(vueDismiss).toHaveBeenCalledOnce();
      expect(vue.markup()).toBe(react.markup());
      expect(vue.state.getState()).toEqual(react.state.getState());
    },
  );

  it("matches React after a click on an unbound footer button", async () => {
    const input = spec({
      main: { type: "Card", props: { cancel: { label: "Dismiss" } } },
    });
    const vue = renderVueSpec(input);
    const react = renderReactSpec(input);
    await act(async () => react.container.querySelector("button")!.click());
    vue.container.querySelector("button")!.click();
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    expect(vue.state.getState()).toEqual(react.state.getState());
  });
});
