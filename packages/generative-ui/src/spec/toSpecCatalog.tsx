import type { ReactNode } from "react";
import {
  defineCatalog,
  type ActionDefinition,
  type Catalog,
  type ComponentDefinition,
  type SpecElement,
} from "generative-frame/spec";
import type {
  SpecComponentProps,
  SpecComponents,
} from "generative-frame/spec/react";
import { A2uiBindingContext } from "../bindingContext";
import { MODEL_KEYS } from "../constants";
import { isDefaultGenerativeUIComponent } from "../defaultGenerativeUIComponents";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "../types";
import { defaultGenerativeUILibrary } from "../vocabulary";
import {
  BOUND_VALUE_PROPS,
  buildCatalogDefinition,
} from "./catalogDefinitions";

/** Options for {@link toSpecCatalog}. */
export type ToSpecCatalogOptions = {
  /** Host actions the model may bind to component events, next to the built-in `setState`. */
  actions?: Record<string, ActionDefinition>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasChildren = (element: SpecElement) =>
  (element.children?.length ?? 0) > 0;

function VocabularyElement({
  render,
  props,
}: {
  // oxlint-disable-next-line typescript/no-explicit-any
  render: (props: any) => ReactNode;
  props: Record<string, unknown>;
}): ReactNode {
  return render(props);
}

function toSpecComponent(
  // oxlint-disable-next-line typescript/no-explicit-any
  render: (props: any) => ReactNode,
  events: readonly string[],
  isVocabulary: boolean,
) {
  return function GenerativeUISpecElement({
    id,
    element,
    props,
    children,
    slots,
    bindings,
    emit,
    setProp,
  }: SpecComponentProps) {
    // A component only acts interactive (a ListViewItem becomes a clickable row) when the element binds the event.
    const live = events.filter((event) =>
      Object.hasOwn(element.on ?? {}, event),
    );
    const $dispatch: GenerativeUIDispatch = (action) =>
      emit(action.type, action["$input"]);
    const boundProps = Object.keys(bindings);
    const $bindings = boundProps.length
      ? Object.fromEntries(
          boundProps.map((prop) => [
            prop,
            (value: unknown) => setProp(prop, value),
          ]),
        )
      : undefined;
    // Card's footer buttons each carry their own action, so an event named after an object prop is wired to that prop.
    const wired: Record<string, unknown> = { ...props };
    for (const event of live) {
      const footer = props[event];
      if (isRecord(footer)) {
        wired[event] = { ...footer, [MODEL_KEYS.action]: { type: event } };
      }
    }
    const bound = isVocabulary
      ? BOUND_VALUE_PROPS.find(([prop]) => Object.hasOwn(bindings, prop))
      : undefined;
    const name = typeof props["name"] === "string" ? props["name"] : id;
    if (bound) {
      const [prop, controlled] = bound;
      delete wired[prop];
      wired["name"] = name;
      wired[controlled] = props[prop];
    }
    const rendered = (
      <VocabularyElement
        render={render}
        props={{
          ...wired,
          ...(hasChildren(element) ? { children } : {}),
          ...(Object.keys(slots).length > 0 ? { $slots: slots } : {}),
          ...($bindings ? { $bindings } : {}),
          $status: "done",
          $dispatch,
          ...(events[0] !== undefined && live.includes(events[0])
            ? { $action: { type: events[0] } }
            : {}),
        }}
      />
    );
    if (!bound || !A2uiBindingContext) return rendered;
    const [prop] = bound;
    return (
      <A2uiBindingContext.Provider
        value={{
          fields: new Map([[name, { value: props[prop], arrayValue: false }]]),
          update: (_field, value) => setProp(prop, value),
        }}
      >
        {rendered}
      </A2uiBindingContext.Provider>
    );
  };
}

/**
 * Builds generative-frame spec mode from a generative UI library: a catalog with each component's props, slots, and events, and the React implementations `SpecRenderer` and `createSpecToolkit` render it with. Value controls emit their value as the event payload, and a control whose value prop is bound with `$bindState` follows that state and writes every change back to it. An entry that declares `events` or `slots` replaces a vocabulary component's built-in events, slots, and spec description (so an override should bring its own `description`), and its component receives rendered named slots in `$slots` and a setter for each bound prop in `$bindings`.
 */
export function toSpecCatalog(
  library: GenerativeUILibrary = defaultGenerativeUILibrary,
  options: ToSpecCatalogOptions = {},
): { catalog: Catalog; components: SpecComponents } {
  const definitions: Record<string, ComponentDefinition> = {};
  const components: SpecComponents = {};
  for (const [name, entry] of Object.entries(library)) {
    const isDefault =
      isDefaultGenerativeUIComponent(name, entry.properties) ||
      (Object.hasOwn(defaultGenerativeUILibrary, name) &&
        entry.render === defaultGenerativeUILibrary[name]?.render);
    const { definition, events } = buildCatalogDefinition(
      name,
      entry,
      isDefault,
    );
    definitions[name] = definition;
    components[name] = toSpecComponent(entry.render, events, isDefault);
  }
  return {
    catalog: defineCatalog({
      components: definitions,
      ...(options.actions ? { actions: options.actions } : {}),
    }),
    components,
  };
}
