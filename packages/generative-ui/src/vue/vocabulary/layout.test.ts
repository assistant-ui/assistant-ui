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

const element = (
  type: string,
  props: Record<string, unknown> = {},
  children?: string[],
): Spec["elements"] => ({
  main: { type, props, ...(children ? { children } : {}) },
  ...(children ? { child: { type: "Text", props: { value: "nested" } } } : {}),
});

describe("layout vocabulary in Vue", () => {
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
