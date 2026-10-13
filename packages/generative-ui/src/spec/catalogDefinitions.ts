import { z } from "zod";
import type {
  ActionDefinition,
  ComponentDefinition,
  PropsSchema,
} from "generative-frame/spec";
import { vocabularyEvents } from "./wiring";

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
    .object({
      label: z
        .union([z.string(), z.number()])
        .describe("Footer button label text or number."),
    })
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
    description:
      "Wraps named child controls (Select, Input, Checkbox, RadioGroup, CheckboxGroup, or DatePicker with a `name`). Emits `submit` with every named control's value, keyed by `name`.",
  },
  Icon: {},
  Button: {
    slots: DEFAULT_SLOT,
    description:
      "A clickable button. Emits `press` on click. Set `submit` to submit an ancestor Form or Card instead.",
  },
  Select: {
    slots: DEFAULT_SLOT,
    description: "A dropdown selector. Emits `change` with the selected value.",
  },
  Input: {
    description:
      "A text input. Outside a Form it emits `submit` with its text on Enter (Ctrl or Cmd+Enter when `multiline`); inside a Form its value arrives with the Form's `submit`.",
  },
  DatePicker: {
    description:
      "A date, datetime, or time input. Emits `change` once per committed value: a pick from the picker, or a typed value on blur or Enter.",
  },
  Checkbox: {
    description:
      "A checkbox with a label. Emits `change` with whether it is checked.",
  },
  Slider: {
    description:
      "A numeric range control. Emits `change` with the value once an adjustment finishes.",
  },
  RadioGroup: {
    slots: DEFAULT_SLOT,
    description:
      "A group of mutually exclusive radio options. Emits `change` with the selected value.",
  },
  CheckboxGroup: {
    slots: DEFAULT_SLOT,
    description:
      "A group of checkbox options where any number can be checked. Set `progress` for a checklist the user works through. Emits `change` with the checked values.",
  },
  Card: {
    slots: DEFAULT_SLOT,
    props: (properties) =>
      properties.extend({
        asForm: z
          .boolean()
          .optional()
          .describe(
            "Render as a form; submitting it, through the confirm button or a child Button with `submit`, emits `confirm` with every named child control's value, keyed by `name`.",
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
  Tabs: { slots: DEFAULT_SLOT },
  ListView: { slots: DEFAULT_SLOT },
  ListViewItem: {
    slots: DEFAULT_SLOT,
    description:
      "A row inside a ListView. Emits `press` when the row is clicked or activated with Enter or Space.",
  },
  Steps: {},
  Timeline: {},
  Citation: {},
  Image: {},
  Divider: {},
  Diagram: {},
  Map: {},
  Header: { slots: DEFAULT_SLOT },
  Text: { slots: DEFAULT_SLOT },
  Caption: { slots: DEFAULT_SLOT },
};

type CatalogEntry = {
  description: string;
  properties: z.ZodType;
  events?: readonly string[] | undefined;
  slots?: readonly string[] | undefined;
};

export function buildCatalogDefinition(
  name: string,
  entry: CatalogEntry,
  isDefault: boolean,
): { definition: ComponentDefinition; events: readonly string[] } {
  const shape0 = isDefault ? DEFAULT_SHAPES[name] : undefined;
  const builtIn = shape0 && { ...shape0, events: vocabularyEvents(name) };
  const declared = entry.events !== undefined || entry.slots !== undefined;
  const shape: SpecShape | undefined = declared
    ? {
        slots: entry.slots ?? DEFAULT_SLOT,
        ...(entry.events ? { events: entry.events } : {}),
      }
    : (builtIn ?? { slots: DEFAULT_SLOT });
  const events = shape?.events ?? [];
  return {
    definition: {
      description: shape?.description ?? entry.description,
      props:
        builtIn?.props && entry.properties instanceof z.ZodObject
          ? builtIn.props(entry.properties)
          : (entry.properties as PropsSchema),
      ...(shape?.slots ? { slots: shape.slots } : {}),
      ...(events.length > 0 ? { events } : {}),
    },
    events,
  };
}
