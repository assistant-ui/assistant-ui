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
  it("names a numeric tab list like React", () => {
    const input = spec({
      main: { type: "Tabs", props: { tabs: [0], label: 42 } },
    });
    const vue = renderVueSpec(input);
    expect(vue.markup()).toBe(renderReactSpec(input).markup());
    expect(
      vue.container
        .querySelector('[role="tablist"]')
        ?.getAttribute("aria-label"),
    ).toBe("42");
    expect(vue.container.querySelector('[role="tab"]')?.textContent).toBe("0");
  });

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
  it.each([
    "url(https://example.com/a.png)",
    "image-set (red 1x)",
    "u\\72l(red)",
  ])("ignores resource background %s on Card and Box", (background) => {
    for (const type of ["Card", "Box"]) {
      const markup = renderVueSpec(
        spec(element(type, { background })),
      ).markup();
      expect(markup).not.toContain("background:");
      expect(markup).not.toContain("data-aui-background");
    }
  });

  it("renders a zero Card title", () => {
    const { markup } = renderVueSpec(spec(element("Card", { title: 0 })));
    expect(markup()).toContain('<header data-aui="card-title">0</header>');
  });

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

describe("invalid controls in Tabs", () => {
  const render = (
    framework: "react" | "vue",
    surface: "Form" | "Card",
    visibleRequired: boolean,
    nested = false,
  ) => {
    const save = vi.fn();
    const input = spec({
      main:
        surface === "Form"
          ? {
              type: "Form",
              children: ["tabs", "submit"],
              on: {
                submit: {
                  action: "save",
                  params: { values: { $event: "" } },
                },
              },
            }
          : {
              type: "Card",
              props: { asForm: true, confirm: { label: "Save" } },
              children: ["tabs"],
              on: {
                confirm: {
                  action: "save",
                  params: { values: { $event: "" } },
                },
              },
            },
      tabs: {
        type: "Tabs",
        props: { tabs: ["Overview", "Contact"] },
        children: ["overview", "contact"],
      },
      overview: visibleRequired
        ? { type: "Input", props: { name: "overview", required: true } }
        : { type: "Text", props: { value: "Overview" } },
      contact: nested
        ? {
            type: "Tabs",
            props: { tabs: ["Billing", "Address"] },
            children: ["billing", "address"],
          }
        : { type: "Box", children: ["email", "address"] },
      billing: { type: "Text", props: { value: "Billing" } },
      address: { type: "Input", props: { name: "address", required: true } },
      email: { type: "Input", props: { name: "email", required: true } },
      submit: { type: "Button", props: { label: "Save", submit: true } },
    });
    const rendered = renderEventSpec(input, framework, { save });
    const form = rendered.container.querySelector("form")!;
    const panels = [
      ...rendered.container.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
    ];
    const tabs = [
      ...rendered.container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    return { form, panels, tabs, save };
  };

  const submit = async (
    form: HTMLFormElement,
    framework: "react" | "vue",
    surface: "Form" | "Card",
  ) => {
    vi.useFakeTimers();
    try {
      const button =
        surface === "Card"
          ? form.querySelector<HTMLButtonElement>('[data-aui="card-confirm"]')!
          : form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      if (framework === "react") {
        await act(async () => {
          form.requestSubmit(button);
          await vi.runAllTimersAsync();
        });
      } else {
        form.requestSubmit(button);
        await vi.runAllTimersAsync();
        await nextTick();
      }
    } finally {
      vi.useRealTimers();
    }
  };

  it.each(
    (["react", "vue"] as const).flatMap((framework) =>
      (["Form", "Card"] as const).map(
        (surface) => [framework, surface] as const,
      ),
    ),
  )(
    "%s %s reveals the hidden required Input and reports validity once per submit",
    async (framework, surface) => {
      const { form, panels, tabs, save } = render(framework, surface, false);
      const email = form.querySelector<HTMLInputElement>(
        'input[name="email"]',
      )!;
      const address = form.querySelector<HTMLInputElement>(
        'input[name="address"]',
      )!;
      const report = vi.spyOn(email, "reportValidity");
      const secondInvalid = vi.fn();
      address.addEventListener("invalid", secondInvalid);

      expect(email.required).toBe(true);
      expect(address.required).toBe(true);
      expect(panels.map((panel) => panel.hidden)).toEqual([false, true]);
      await submit(form, framework, surface);
      expect(save).not.toHaveBeenCalled();
      expect(secondInvalid).toHaveBeenCalledOnce();
      expect(panels.map((panel) => panel.hidden)).toEqual([true, false]);
      expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(email);
      expect(report).toHaveBeenCalledOnce();

      if (framework === "react") {
        await act(async () => tabs[0]!.click());
      } else {
        tabs[0]!.click();
        await nextTick();
      }
      await submit(form, framework, surface);
      expect(panels.map((panel) => panel.hidden)).toEqual([true, false]);
      expect(document.activeElement).toBe(email);
      expect(report).toHaveBeenCalledTimes(2);
    },
  );

  it.each(
    (["react", "vue"] as const).flatMap((framework) =>
      (["Form", "Card"] as const).map(
        (surface) => [framework, surface] as const,
      ),
    ),
  )(
    "%s %s leaves the selected tab in place for a visible invalid Input",
    async (framework, surface) => {
      const { form, panels, tabs, save } = render(framework, surface, true);
      const overview = form.querySelector<HTMLInputElement>(
        'input[name="overview"]',
      )!;
      const report = vi.spyOn(overview, "reportValidity");
      await submit(form, framework, surface);
      expect(save).not.toHaveBeenCalled();
      expect(panels.map((panel) => panel.hidden)).toEqual([false, true]);
      expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
      expect(report).not.toHaveBeenCalled();
    },
  );

  it.each(
    (["react", "vue"] as const).flatMap((framework) =>
      (["Form", "Card"] as const).map(
        (surface) => [framework, surface] as const,
      ),
    ),
  )(
    "%s %s reveals nested hidden Tabs and focuses the required Input",
    async (framework, surface) => {
      const { form, save } = render(framework, surface, false, true);
      const tabGroups = [
        ...form.querySelectorAll<HTMLElement>('[data-aui="tabs"]'),
      ];
      const outerPanels = [...tabGroups[0]!.children].filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.getAttribute("role") === "tabpanel",
      );
      const innerPanels = [...tabGroups[1]!.children].filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.getAttribute("role") === "tabpanel",
      );
      const address = form.querySelector<HTMLInputElement>(
        'input[name="address"]',
      )!;
      const report = vi.spyOn(address, "reportValidity");

      expect(outerPanels.map((panel) => panel.hidden)).toEqual([false, true]);
      expect(innerPanels.map((panel) => panel.hidden)).toEqual([false, true]);
      await submit(form, framework, surface);
      expect(save).not.toHaveBeenCalled();
      expect(outerPanels.map((panel) => panel.hidden)).toEqual([true, false]);
      expect(innerPanels.map((panel) => panel.hidden)).toEqual([true, false]);
      expect(document.activeElement).toBe(address);
      expect(report).toHaveBeenCalledOnce();

      address.value = "1 Main St";
      await submit(form, framework, surface);
      expect(save).toHaveBeenCalledOnce();
      expect(save.mock.calls[0]?.[0]).toEqual({
        values: { address: "1 Main St" },
      });
    },
  );
});
