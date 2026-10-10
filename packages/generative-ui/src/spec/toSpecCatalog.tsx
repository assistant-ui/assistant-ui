import type { ReactNode } from "react";
import { z } from "zod";
import {
  defineCatalog,
  type ActionDefinition,
  type Catalog,
  type ComponentDefinition,
  type PropsSchema,
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

/** Options for {@link toSpecCatalog}. */
export type ToSpecCatalogOptions = {
  /** Host actions the model may bind to component events, next to the built-in `setState`. */
  actions?: Record<string, ActionDefinition>;
};

type SpecShape = {
  slots?: readonly string[];
  events?: readonly string[];
  description?: string;
  props?: (properties: z.ZodObject) => PropsSchema;
};

const DEFAULT_SLOT = ["default"] as const;

const footerButton = (label: string, event: string) =>
  z
    .object({ label: z.string().describe("Footer button label.") })
    .optional()
    .describe(`${label} button shown in the footer; emits \`${event}\`.`);

// Spec mode binds behavior with `on`, so the components the `present` tool describes as carrying `_action` describe the events they emit instead.
const DEFAULT_SHAPES: Readonly<Record<string, SpecShape>> = {
  Alert: { slots: DEFAULT_SLOT },
  Carousel: { slots: DEFAULT_SLOT },
  Table: { slots: DEFAULT_SLOT },
  Markdown: { slots: DEFAULT_SLOT },
  Chart: {},
  Fact: { slots: DEFAULT_SLOT },
  Form: {
    slots: DEFAULT_SLOT,
    events: ["submit"],
    description:
      "Wraps named child controls (Select, Input, Checkbox, RadioGroup, CheckboxGroup, or DatePicker with a `name`). Emits `submit` with every named control's value, keyed by `name`.",
  },
  Icon: {},
  Button: {
    slots: DEFAULT_SLOT,
    events: ["press"],
    description:
      "A clickable button. Emits `press` on click. Set `submit` to submit an ancestor Form or Card instead.",
  },
  Select: {
    slots: DEFAULT_SLOT,
    events: ["change"],
    description: "A dropdown selector. Emits `change` with the selected value.",
  },
  Input: {
    events: ["submit"],
    description:
      "A text input. Outside a Form it emits `submit` with its text on Enter (Ctrl or Cmd+Enter when `multiline`); inside a Form its value arrives with the Form's `submit`.",
  },
  DatePicker: {
    events: ["change"],
    description:
      "A date, datetime, or time input. Emits `change` once per committed value: a pick from the picker, or a typed value on blur or Enter.",
  },
  Checkbox: {
    events: ["change"],
    description:
      "A checkbox with a label. Emits `change` with whether it is checked.",
  },
  Slider: {
    events: ["change"],
    description:
      "A numeric range control. Emits `change` with the value once an adjustment finishes.",
  },
  RadioGroup: {
    slots: DEFAULT_SLOT,
    events: ["change"],
    description:
      "A group of mutually exclusive radio options. Emits `change` with the selected value.",
  },
  CheckboxGroup: {
    slots: DEFAULT_SLOT,
    events: ["change"],
    description:
      "A group of checkbox options where any number can be checked. Emits `change` with the checked values.",
  },
  Card: {
    slots: DEFAULT_SLOT,
    events: ["confirm", "cancel"],
    props: (properties) =>
      properties.extend({
        asForm: z
          .boolean()
          .optional()
          .describe(
            "Render as a form; its confirm button submits it, emitting `confirm` with every named child control's value, keyed by `name`.",
          ),
        confirm: footerButton("Confirm", "confirm"),
        cancel: footerButton("Cancel", "cancel"),
      }) as PropsSchema,
  },
  Col: { slots: DEFAULT_SLOT },
  Row: { slots: DEFAULT_SLOT },
  Spacer: {},
  Badge: { slots: DEFAULT_SLOT },
  Box: { slots: DEFAULT_SLOT },
  ListView: { slots: DEFAULT_SLOT },
  ListViewItem: {
    slots: DEFAULT_SLOT,
    events: ["press"],
    description:
      "A row inside a ListView. Emits `press` when the row is clicked or activated with Enter or Space.",
  },
  Image: {},
  Divider: {},
  Header: { slots: DEFAULT_SLOT },
  Text: { slots: DEFAULT_SLOT },
  Caption: { slots: DEFAULT_SLOT },
};

// A control whose schema prop a spec binds with `$bindState` reads the controlled prop instead, so it stays mounted and reports every change through the binding context.
const BOUND_VALUE_PROPS = [
  ["defaultValue", "value"],
  ["value", "value"],
  ["defaultChecked", "checked"],
] as const;

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
          $status: "done",
          $dispatch,
          ...(live[0] !== undefined ? { $action: { type: live[0] } } : {}),
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
 * Builds generative-frame spec mode from a generative UI library: a catalog with each component's props, slots, and events, and the React implementations `SpecRenderer` and `createSpecToolkit` render it with. Value controls emit their value as the event payload, and a control whose value prop is bound with `$bindState` follows that state and writes every change back to it.
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
    const shape = isDefault ? DEFAULT_SHAPES[name] : { slots: DEFAULT_SLOT };
    const events = shape?.events ?? [];
    definitions[name] = {
      description: shape?.description ?? entry.description,
      props:
        shape?.props && entry.properties instanceof z.ZodObject
          ? shape.props(entry.properties)
          : (entry.properties as PropsSchema),
      ...(shape?.slots ? { slots: shape.slots } : {}),
      ...(events.length > 0 ? { events } : {}),
    };
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
