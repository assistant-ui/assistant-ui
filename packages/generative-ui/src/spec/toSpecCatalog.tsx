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

// Spec mode binds behavior with `on`, so the components the `present` tool
// describes as carrying `_action` describe the events they emit instead.
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
    events: ["press"],
    description:
      "A clickable button. Emits `press` on click. Set `submit` to submit an ancestor Form or Card instead.",
  },
  Select: {
    events: ["change"],
    description: "A dropdown selector. Emits `change` with the selected value.",
  },
  Input: {
    events: ["submit"],
    description:
      "A text input. Outside a Form it emits `submit` with its text on Enter (Ctrl or Cmd+Enter when `multiline`).",
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
    events: ["change"],
    description:
      "A group of mutually exclusive radio options. Emits `change` with the selected value.",
  },
  CheckboxGroup: {
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
            "Render as a form; submitting it emits `confirm` with every named child control's value, keyed by `name`.",
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

/** The props controls keep their current value in, which `$bindState` writes back to. */
const VALUE_PROPS = ["defaultValue", "defaultChecked", "value"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasChildren = (element: SpecElement) =>
  (element.children?.length ?? 0) > 0;

function toSpecComponent(
  // oxlint-disable-next-line typescript/no-explicit-any
  render: (props: any) => ReactNode,
  events: readonly string[],
) {
  return function GenerativeUISpecElement({
    element,
    props,
    children,
    bindings,
    emit,
    setProp,
  }: SpecComponentProps) {
    const boundValues = VALUE_PROPS.filter((name) =>
      Object.hasOwn(bindings, name),
    );
    // A component only acts interactive (a ListViewItem becomes a clickable
    // row) when the element binds the event or a value it writes back.
    const live = events.filter(
      (event) =>
        boundValues.length > 0 || Object.hasOwn(element.on ?? {}, event),
    );
    const $dispatch: GenerativeUIDispatch = (action) => {
      const input = action["$input"];
      if (input !== undefined) {
        for (const name of boundValues) setProp(name, input);
      }
      emit(action.type, input);
    };
    // Card's footer buttons each carry their own action, so an event named
    // after an object prop is wired to that prop.
    const wired: Record<string, unknown> = { ...props };
    for (const event of live) {
      const footer = props[event];
      if (isRecord(footer)) {
        wired[event] = { ...footer, [MODEL_KEYS.action]: { type: event } };
      }
    }
    return render({
      ...wired,
      ...(hasChildren(element) ? { children } : {}),
      $status: "done",
      $dispatch,
      ...(live[0] !== undefined ? { $action: { type: live[0] } } : {}),
    });
  };
}

/**
 * Builds generative-frame spec mode from a generative UI library: a catalog
 * with each component's props, slots, and events, and the React
 * implementations `SpecRenderer` and `createSpecToolkit` render it with.
 * Interactive components emit their value as the event payload, and a value
 * prop bound with `$bindState` is written back when they do.
 */
export function toSpecCatalog(
  library: GenerativeUILibrary = defaultGenerativeUILibrary,
  options: ToSpecCatalogOptions = {},
): { catalog: Catalog; components: SpecComponents } {
  const definitions: Record<string, ComponentDefinition> = {};
  const components: SpecComponents = {};
  for (const [name, entry] of Object.entries(library)) {
    const shape = isDefaultGenerativeUIComponent(name, entry.properties)
      ? DEFAULT_SHAPES[name]
      : { slots: DEFAULT_SLOT };
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
    components[name] = toSpecComponent(entry.render, events);
  }
  return {
    catalog: defineCatalog({
      components: definitions,
      ...(options.actions ? { actions: options.actions } : {}),
    }),
    components,
  };
}
