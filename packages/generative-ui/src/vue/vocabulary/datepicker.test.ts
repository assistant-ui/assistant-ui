// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString as renderReactToString } from "react-dom/server";
import { createApp, createSSRApp, h, nextTick } from "vue";
import { renderToString as renderVueToString } from "vue/server-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStateStore } from "generative-frame/spec";
import { SpecRenderer as ReactSpecRenderer } from "generative-frame/spec/react";
import { SpecRenderer as VueSpecRenderer } from "generative-frame/spec/vue";
import { toSpecCatalog as toReactSpecCatalog } from "../../spec/toSpecCatalog";
import { toSpecCatalog as toVueSpecCatalog } from "../toSpecCatalog";
import { canonical, spec } from "../testUtils";

const actions = { capture: { description: "Capture the control value." } };
const reactCatalog = toReactSpecCatalog(undefined, { actions });
const vueCatalog = toVueSpecCatalog(undefined, { actions });
const containers: HTMLElement[] = [];
const unmounts: (() => void)[] = [];

afterEach(() => {
  for (const unmount of unmounts.splice(0)) unmount();
  for (const container of containers.splice(0)) container.remove();
  vi.restoreAllMocks();
});

const source = (props: Record<string, unknown>) =>
  spec({
    main: {
      type: "DatePicker",
      props: { label: "When", name: "when", ...props },
      on: {
        change: { action: "capture", params: { value: { $event: "" } } },
      },
    },
  });

describe("Vue DatePicker hydration", () => {
  it("renders the raw instant on the server and hydrates without a mismatch", async () => {
    const props = {
      inputType: "datetime",
      value: "2026-07-15T12:34:56.123+08:00",
    };
    const input = source(props);
    const state = createStateStore({});
    const handler = vi.fn();
    const tree = () =>
      h(VueSpecRenderer, {
        spec: input,
        state,
        handlers: { capture: handler },
        ...vueCatalog,
      });
    const app = createSSRApp({ render: tree });
    const html = await renderVueToString(app);
    const reactHTML = renderReactToString(
      createElement(ReactSpecRenderer, {
        spec: input,
        state: createStateStore({}),
        ...reactCatalog,
      }),
    );
    expect(reactHTML).toContain('type="text"');
    expect(html).toContain('type="text"');
    expect(html).toMatch(/\sreadonly(?:\s|=)/i);
    expect(html).toContain('value="2026-07-15T12:34:56.123+08:00"');
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    containers.push(container);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    app.mount(container);
    unmounts.push(() => app.unmount());
    await nextTick();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    const control = container.querySelector("input")!;
    expect(control.type).toBe("datetime-local");
    expect(control.readOnly).toBe(false);
    expect(control.value).toBe("2026-07-15T00:34:56.123");
    control.focus();
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "1", bubbles: true }),
    );
    control.value = "2026-07-16T09:45:30";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.blur();
    expect(handler.mock.lastCall?.[0]).toEqual({
      value: "2026-07-16T21:45:30.000+08:00",
    });
  });

  it("projects instant limits only after hydration", async () => {
    const input = source({
      inputType: "datetime",
      value: "2026-07-15T12:34:56.123+08:00",
      min: "2026-07-15T00:00:00+08:00",
      max: "2026-07-17T00:00:00+08:00",
    });
    const state = createStateStore({});
    const app = createSSRApp({
      render: () => h(VueSpecRenderer, { spec: input, state, ...vueCatalog }),
    });
    const html = await renderVueToString(app);
    const reactHTML = renderReactToString(
      createElement(ReactSpecRenderer, {
        spec: input,
        state: createStateStore({}),
        ...reactCatalog,
      }),
    );
    const read = (markup: string) => {
      const container = document.createElement("div");
      container.innerHTML = markup;
      return container.querySelector("input")!;
    };
    expect(read(html).getAttribute("min")).toBe(
      read(reactHTML).getAttribute("min"),
    );
    expect(read(html).getAttribute("max")).toBe(
      read(reactHTML).getAttribute("max"),
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    containers.push(container);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    app.mount(container);
    unmounts.push(() => app.unmount());
    await nextTick();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    const control = container.querySelector("input")!;
    expect(control.min).toBe("2026-07-14T12:00");
    expect(control.max).toBe("2026-07-16T12:00");
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
    "server renders $inputType $value as an editable picker",
    async ({ type, ...props }) => {
      const input = source(props);
      const html = await renderVueToString(
        createSSRApp({
          render: () =>
            h(VueSpecRenderer, {
              spec: input,
              state: createStateStore({}),
              ...vueCatalog,
            }),
        }),
      );
      expect(html).toContain(`type="${type}"`);
      const container = document.createElement("div");
      container.innerHTML = html;
      expect(container.querySelector("input")?.getAttribute("value")).toBe(
        props.value,
      );
      expect(html.toLowerCase()).not.toContain("readonly");
    },
  );

  it("client mounts with the same markup as React", async () => {
    const input = source({
      inputType: "datetime",
      value: "2026-07-15T12:34:56.123+08:00",
    });
    const container = document.createElement("div");
    document.body.append(container);
    containers.push(container);
    const app = createApp({
      render: () =>
        h(VueSpecRenderer, {
          spec: input,
          state: createStateStore({}),
          ...vueCatalog,
        }),
    });
    app.mount(container);
    unmounts.push(() => app.unmount());
    await nextTick();
    const reactContainer = document.createElement("div");
    document.body.append(reactContainer);
    containers.push(reactContainer);
    const root = createRoot(reactContainer);
    unmounts.push(() => act(() => root.unmount()));
    await act(async () =>
      root.render(
        createElement(ReactSpecRenderer, {
          spec: input,
          state: createStateStore({}),
          ...reactCatalog,
        }),
      ),
    );
    expect(container.querySelector("input")?.type).toBe("datetime-local");
    expect(canonical(container.querySelector("input")!)).toBe(
      canonical(reactContainer.querySelector("input")!),
    );
  });
});
