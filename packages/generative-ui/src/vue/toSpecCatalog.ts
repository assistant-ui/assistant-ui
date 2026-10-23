import {
  camelize,
  defineComponent,
  h,
  toHandlerKey,
  type Component,
} from "vue";
import type { ZodType } from "zod";
import {
  defineCatalog,
  type Catalog,
  type ComponentDefinition,
} from "generative-frame/spec";
import type { SpecComponents } from "generative-frame/spec/vue";
import { isDefaultGenerativeUIComponent } from "../defaultGenerativeUIComponents";
import {
  buildCatalogDefinition,
  type ToSpecCatalogOptions,
} from "../spec/catalogDefinitions";
import { defaultGenerativeUILibrary } from "./vocabulary";

/**
 * A Vue component the model may render in spec mode, with the schema for its props. The component follows the `generative-frame/spec/vue` contract: it declares its props and the events it emits, renders children and named slots as Vue slots, and writes a prop bound with `$bindState` by emitting `update:<prop>`.
 */
export type GenerativeUIComponent = {
  /** Natural-language description shown to the model when selecting the component. */
  description: string;
  /** Schema for the props the model must provide. */
  properties: ZodType;
  /** Events the component emits, which a spec binds with `on`. */
  events?: readonly string[] | undefined;
  /** Slots the component renders: `default` takes the element's children. Defaults to `["default"]`; `[]` takes no children. */
  slots?: readonly string[] | undefined;
  component: Component;
};

/** The components the model may render, keyed by the `type` a spec element names. */
export type GenerativeUILibrary = Record<string, GenerativeUIComponent>;

export type { ToSpecCatalogOptions } from "../spec/catalogDefinitions";

type DeclaredOptions = {
  props?: readonly string[] | Record<string, unknown>;
  emits?: readonly string[] | Record<string, unknown>;
};

const declared = (component: Component, option: "props" | "emits") => {
  const value = (component as DeclaredOptions)[option];
  return (Array.isArray(value) ? value : Object.keys(value ?? {})).map((name) =>
    camelize(name),
  );
};

const withImageOrigins = (
  component: Component,
  imageOrigins: readonly string[],
) => {
  const props = declared(component, "props").filter(
    (name) => name !== "imageOrigins",
  );
  const emits = declared(component, "emits");
  return defineComponent({
    inheritAttrs: false,
    props,
    emits,
    setup(received, { attrs, slots, emit }) {
      const listeners = Object.fromEntries(
        emits.map((event) => [
          toHandlerKey(event),
          (...args: unknown[]) => emit(event, ...args),
        ]),
      );
      return () =>
        h(
          component,
          { ...received, ...attrs, ...listeners, imageOrigins },
          slots,
        );
    },
  });
};

/**
 * Builds generative-frame spec mode from a Vue generative UI library: a catalog with each component's props, slots, and events, and the Vue components `SpecRenderer` from `generative-frame/spec/vue` renders it with. A built-in component keeps its spec events and slots unless the entry declares `events` or `slots`, which then replace them along with its spec description.
 */
export function toSpecCatalog(
  library: GenerativeUILibrary = defaultGenerativeUILibrary,
  options: ToSpecCatalogOptions = {},
): { catalog: Catalog; components: SpecComponents } {
  const definitions: Record<string, ComponentDefinition> = Object.create(null);
  const components: SpecComponents = Object.create(null);
  for (const [name, entry] of Object.entries(library)) {
    const isDefault =
      isDefaultGenerativeUIComponent(name, entry.properties) ||
      (Object.hasOwn(defaultGenerativeUILibrary, name) &&
        entry.component === defaultGenerativeUILibrary[name]?.component);
    definitions[name] = buildCatalogDefinition(
      name,
      entry,
      isDefault,
    ).definition;
    components[name] =
      options.imageOrigins !== undefined &&
      declared(entry.component, "props").includes("imageOrigins")
        ? withImageOrigins(entry.component, options.imageOrigins)
        : entry.component;
  }
  return {
    catalog: defineCatalog({
      components: definitions,
      ...(options.actions ? { actions: options.actions } : {}),
    }),
    components,
  };
}
