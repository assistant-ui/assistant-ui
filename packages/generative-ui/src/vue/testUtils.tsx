import { act } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, nextTick, shallowRef } from "vue";
import type { Spec } from "generative-frame/spec";
import { createStateStore, type SpecStateStore } from "generative-frame/spec";
import { SpecRenderer as ReactSpecRenderer } from "generative-frame/spec/react";
import { SpecRenderer as VueSpecRenderer } from "generative-frame/spec/vue";
import { toSpecCatalog as toReactSpecCatalog } from "../spec/toSpecCatalog";
import { toSpecCatalog } from "./toSpecCatalog";

const react = toReactSpecCatalog();
const vue = toSpecCatalog();
const unmounts: (() => void)[] = [];

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const ID_REFERENCES = new Set([
  "id",
  "for",
  "aria-controls",
  "aria-describedby",
  "aria-labelledby",
  "aria-owns",
]);

/**
 * An element tree as canonical text: tags, attributes sorted by name, and text, without comments or empty text nodes. Generated ids are numbered in order of appearance, in `id`, in the attributes that refer to one, and in a `name` marked as generated, because React and Vue generate them differently.
 */
export function canonical(node: Node, ids = new Map<string, string>()): string {
  if (node.nodeType === Node.TEXT_NODE) return escape(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as Element;
  const attributes = [...element.attributes]
    // React 18 writes `value=""` on an empty controlled input and React 19 does
    // not; an empty value attribute on an input carries nothing either way.
    .filter(
      (attribute) =>
        !(
          element.localName === "input" &&
          attribute.name === "value" &&
          attribute.value === ""
        ),
    )
    .map((attribute) => {
      const generated =
        attribute.name === "name" &&
        element.hasAttribute("data-aui-generated-name");
      const value =
        generated || ID_REFERENCES.has(attribute.name)
          ? attribute.value
              .split(" ")
              .map((id) => {
                if (id === "") return id;
                if (!ids.has(id)) ids.set(id, `id${ids.size}`);
                return ids.get(id);
              })
              .join(" ")
          : attribute.value;
      return `${attribute.name}="${escape(value)}"`;
    })
    .sort()
    .join(" ");
  const children = [...element.childNodes]
    .map((child) => canonical(child, ids))
    .join("");
  return `<${element.localName}${attributes ? ` ${attributes}` : ""}>${children}</${element.localName}>`;
}

export type RenderedSpec = {
  container: HTMLElement;
  state: SpecStateStore;
  markup(): string;
  update(spec: Spec): Promise<void>;
};

const markupOf = (container: HTMLElement) => () => {
  const ids = new Map<string, string>();
  return [...container.childNodes].map((node) => canonical(node, ids)).join("");
};

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
  return {
    container,
    state,
    markup: markupOf(container),
    update: async (next) => {
      await act(async () => {
        root.render(
          <ReactSpecRenderer
            spec={next}
            catalog={react.catalog}
            components={react.components}
            state={state}
            handlers={handlers}
          />,
        );
      });
    },
  };
}

export function renderVueSpec(
  spec: Spec,
  handlers: Record<string, (params: Record<string, unknown>) => unknown> = {},
): RenderedSpec {
  const container = document.createElement("div");
  document.body.append(container);
  const state = createStateStore(spec.state ?? {});
  const source = shallowRef(spec);
  const app = createApp({
    render: () =>
      h(VueSpecRenderer, {
        spec: source.value,
        catalog: vue.catalog,
        components: vue.components,
        state,
        handlers,
      }),
  });
  app.mount(container);
  unmounts.push(() => app.unmount());
  return {
    container,
    state,
    markup: markupOf(container),
    update: async (next) => {
      source.value = next;
      await nextTick();
    },
  };
}

export function cleanupSpecs() {
  for (const unmount of unmounts.splice(0)) unmount();
  document.body.replaceChildren();
}

export const spec = (
  elements: Spec["elements"],
  state: Spec["state"] = {},
): Spec => ({ root: "main", elements, state });
