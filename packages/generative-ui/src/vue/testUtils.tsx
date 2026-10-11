import { act } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h } from "vue";
import type { Spec } from "generative-frame/spec";
import { createStateStore, type SpecStateStore } from "generative-frame/spec";
import { SpecRenderer as ReactSpecRenderer } from "generative-frame/spec/react";
import { SpecRenderer as VueSpecRenderer } from "generative-frame/spec/vue";
import { toSpecCatalog as toReactSpecCatalog } from "../spec/toSpecCatalog";
import { toSpecCatalog } from "./toSpecCatalog";

const react = toReactSpecCatalog();
const vue = toSpecCatalog();
const unmounts: (() => void)[] = [];

/** An element tree as canonical text: tags, attributes sorted by name, and text, without comments or empty text nodes. */
export function canonical(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as Element;
  const attributes = [...element.attributes]
    .map((attribute) => `${attribute.name}="${attribute.value}"`)
    .sort()
    .join(" ");
  const children = [...element.childNodes].map(canonical).join("");
  return `<${element.localName}${attributes ? ` ${attributes}` : ""}>${children}</${element.localName}>`;
}

export type RenderedSpec = {
  container: HTMLElement;
  state: SpecStateStore;
  markup(): string;
};

const markupOf = (container: HTMLElement) => () =>
  [...container.childNodes].map(canonical).join("");

export function renderReactSpec(
  spec: Spec,
  handlers: Record<string, (params: Record<string, unknown>) => unknown> = {},
): RenderedSpec {
  const container = document.createElement("div");
  document.body.append(container);
  const state = createStateStore(spec.state ?? {});
  const root = createRoot(container);
  act(() =>
    root.render(
      <ReactSpecRenderer
        spec={spec}
        catalog={react.catalog}
        components={react.components}
        state={state}
        handlers={handlers}
      />,
    ),
  );
  unmounts.push(() => act(() => root.unmount()));
  return { container, state, markup: markupOf(container) };
}

export function renderVueSpec(
  spec: Spec,
  handlers: Record<string, (params: Record<string, unknown>) => unknown> = {},
): RenderedSpec {
  const container = document.createElement("div");
  document.body.append(container);
  const state = createStateStore(spec.state ?? {});
  const app = createApp({
    render: () =>
      h(VueSpecRenderer, {
        spec,
        catalog: vue.catalog,
        components: vue.components,
        state,
        handlers,
      }),
  });
  app.mount(container);
  unmounts.push(() => app.unmount());
  return { container, state, markup: markupOf(container) };
}

export function cleanupSpecs() {
  for (const unmount of unmounts.splice(0)) unmount();
  document.body.replaceChildren();
}

export const spec = (
  elements: Spec["elements"],
  state: Spec["state"] = {},
): Spec => ({ root: "main", elements, state });
