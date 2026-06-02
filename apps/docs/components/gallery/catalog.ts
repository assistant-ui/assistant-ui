import type { UINode } from "@/components/generative-ui";

export type PrimitiveCategory =
  | "Layout"
  | "Typography"
  | "Content"
  | "Forms"
  | "Actions";

export const PRIMITIVE_CATEGORIES: PrimitiveCategory[] = [
  "Layout",
  "Typography",
  "Content",
  "Forms",
  "Actions",
];

export type PrimitiveProp = {
  name: string;
  type: string;
  description: string;
  default?: string;
};

export type PrimitiveDoc = {
  name: string;
  category: PrimitiveCategory;
  description: string;
  example: UINode;
  props: PrimitiveProp[];
};

const COLOR_TOKENS =
  "emphasis | secondary | alpha-70 | white | white-70 | white-50";
const SIZE_TOKENS = "sm | md | lg | xl | 2xl | 3xl";
const WEIGHT_TOKENS = "normal | medium | semibold | bold";
const ALIGN_TOKENS = "start | center | end";
const SUN = "https://openweathermap.org/img/wn/01d@2x.png";

export const PRIMITIVES: PrimitiveDoc[] = [
  {
    name: "Card",
    category: "Layout",
    description: "A bordered surface that frames a widget's contents.",
    example: {
      type: "Card",
      children: [{ type: "Text", value: "Inside a card." }],
    },
    props: [
      {
        name: "padding",
        type: "number",
        description: "Inner padding, in 4px units.",
        default: "4",
      },
      {
        name: "background",
        type: "string",
        description: "CSS background; a solid color, gradient, etc.",
      },
    ],
  },
  {
    name: "Box",
    category: "Layout",
    description:
      "A sized, colored rectangle. Use it for progress bars, swatches, and custom shapes.",
    example: {
      type: "Box",
      height: 8,
      radius: "full",
      background: "var(--muted)",
      children: [
        {
          type: "Box",
          width: "60%",
          height: 8,
          radius: "full",
          background: "var(--primary)",
        },
      ],
    },
    props: [
      {
        name: "width",
        type: "number | string",
        description: "Width in px (number), or any CSS length (string).",
      },
      {
        name: "height",
        type: "number | string",
        description: "Height in px (number), or any CSS length (string).",
      },
      {
        name: "radius",
        type: "sm | md | lg | full | number",
        description: "Corner radius token, or px.",
      },
      {
        name: "background",
        type: "string",
        description: 'CSS background, or the token "white".',
      },
      {
        name: "padding",
        type: "number",
        description: "Inner padding, in 4px units.",
      },
    ],
  },
  {
    name: "Row",
    category: "Layout",
    description: "Lay children out horizontally.",
    example: {
      type: "Row",
      gap: 2,
      children: [
        { type: "Badge", value: "One" },
        { type: "Badge", value: "Two" },
        { type: "Badge", value: "Three" },
      ],
    },
    props: [
      {
        name: "gap",
        type: "number",
        description: "Space between children, in 4px units.",
      },
      {
        name: "align",
        type: ALIGN_TOKENS,
        description: "Cross-axis (vertical) alignment.",
      },
      {
        name: "justify",
        type: `${ALIGN_TOKENS} | between`,
        description: "Main-axis (horizontal) distribution.",
      },
    ],
  },
  {
    name: "Col",
    category: "Layout",
    description: "Stack children vertically.",
    example: {
      type: "Col",
      gap: 1,
      children: [
        { type: "Text", value: "First line." },
        { type: "Text", value: "Second line." },
        { type: "Text", value: "Third line." },
      ],
    },
    props: [
      {
        name: "gap",
        type: "number",
        description: "Space between children, in 4px units.",
      },
      {
        name: "align",
        type: ALIGN_TOKENS,
        description: "Cross-axis (horizontal) alignment.",
      },
      {
        name: "justify",
        type: `${ALIGN_TOKENS} | between`,
        description: "Main-axis (vertical) distribution.",
      },
    ],
  },
  {
    name: "Spacer",
    category: "Layout",
    description: "A flexible gap that pushes siblings apart in a Row or Col.",
    example: {
      type: "Row",
      align: "center",
      children: [
        { type: "Text", value: "Left", size: "sm" },
        { type: "Spacer" },
        { type: "Text", value: "Right", size: "sm" },
      ],
    },
    props: [],
  },
  {
    name: "Divider",
    category: "Layout",
    description: "A thin horizontal rule between sections.",
    example: {
      type: "Col",
      gap: 2,
      children: [
        { type: "Text", value: "Above", size: "sm" },
        { type: "Divider" },
        { type: "Text", value: "Below", size: "sm" },
      ],
    },
    props: [
      {
        name: "flush",
        type: "boolean",
        description: "Extend the rule to the card's edges, ignoring padding.",
        default: "false",
      },
      {
        name: "tone",
        type: "default | light",
        description: "Use light on a dark or colored background.",
        default: "default",
      },
    ],
  },
  {
    name: "Table",
    category: "Layout",
    description:
      "Column-aligned tabular data. Compose TableRow (set header for a heading row) and TableCell children.",
    example: {
      type: "Table",
      children: [
        {
          type: "TableRow",
          header: true,
          children: [
            { type: "TableCell", value: "Item" },
            { type: "TableCell", value: "Qty", align: "end" },
          ],
        },
        {
          type: "TableRow",
          children: [
            { type: "TableCell", value: "Notebook" },
            { type: "TableCell", value: "3", align: "end" },
          ],
        },
        {
          type: "TableRow",
          children: [
            { type: "TableCell", value: "Mouse Pad" },
            { type: "TableCell", value: "1", align: "end" },
          ],
        },
      ],
    },
    props: [
      {
        name: "children",
        type: "TableRow[]",
        description: "Rows to render in the table body.",
      },
      {
        name: "TableRow.header",
        type: "boolean",
        description: "Render the row's cells as heading cells.",
        default: "false",
      },
      {
        name: "TableCell.value",
        type: "string",
        description: "Cell text; alternatively pass children for rich content.",
      },
      {
        name: "TableCell.align",
        type: ALIGN_TOKENS,
        description: "Horizontal alignment of the cell content.",
      },
      {
        name: "TableCell.colSpan",
        type: "number",
        description: "Number of columns the cell spans.",
      },
      {
        name: "TableCell.width",
        type: "number | string",
        description: "Explicit cell width, in px (number) or any CSS length.",
      },
    ],
  },
  {
    name: "Title",
    category: "Typography",
    description: "Prominent heading text.",
    example: { type: "Title", value: "Active users" },
    props: [
      {
        name: "value",
        type: "string",
        description: "Text content; alternatively pass children.",
      },
      {
        name: "size",
        type: SIZE_TOKENS,
        description: "Font size.",
        default: "xl",
      },
      {
        name: "weight",
        type: WEIGHT_TOKENS,
        description: "Font weight.",
        default: "semibold",
      },
      {
        name: "color",
        type: COLOR_TOKENS,
        description: "Text color token.",
        default: "emphasis",
      },
      {
        name: "textAlign",
        type: "left | center | right",
        description: "Horizontal text alignment.",
      },
    ],
  },
  {
    name: "Text",
    category: "Typography",
    description: "Body text.",
    example: { type: "Text", value: "Partly sunny with a light breeze." },
    props: [
      {
        name: "value",
        type: "string",
        description: "Text content; alternatively pass children.",
      },
      {
        name: "size",
        type: SIZE_TOKENS,
        description: "Font size.",
        default: "md",
      },
      { name: "weight", type: WEIGHT_TOKENS, description: "Font weight." },
      { name: "color", type: COLOR_TOKENS, description: "Text color token." },
      {
        name: "textAlign",
        type: "left | center | right",
        description: "Horizontal text alignment.",
      },
    ],
  },
  {
    name: "Caption",
    category: "Typography",
    description: "Small, muted supporting text.",
    example: { type: "Caption", value: "Updated 2 minutes ago" },
    props: [
      {
        name: "value",
        type: "string",
        description: "Text content; alternatively pass children.",
      },
      {
        name: "color",
        type: COLOR_TOKENS,
        description: "Text color token.",
        default: "secondary",
      },
    ],
  },
  {
    name: "Label",
    category: "Typography",
    description: "An accessible label for a form field.",
    example: { type: "Label", value: "Email", fieldName: "email" },
    props: [
      { name: "value", type: "string", description: "Label text." },
      {
        name: "fieldName",
        type: "string",
        description: "Name/id of the field this label describes.",
      },
      {
        name: "size",
        type: SIZE_TOKENS,
        description: "Font size.",
        default: "sm",
      },
      {
        name: "weight",
        type: WEIGHT_TOKENS,
        description: "Font weight.",
        default: "medium",
      },
      {
        name: "color",
        type: COLOR_TOKENS,
        description: "Text color token.",
        default: "secondary",
      },
    ],
  },
  {
    name: "Markdown",
    category: "Typography",
    description: "Render formatted content from a markdown string.",
    example: {
      type: "Markdown",
      value: "**Bold** and _italic_ with a [link](https://example.com).",
    },
    props: [
      {
        name: "value",
        type: "string",
        description: "Markdown source; alternatively pass children.",
      },
    ],
  },
  {
    name: "Image",
    category: "Content",
    description: "Display a remote image at a fixed size.",
    example: { type: "Image", src: SUN, size: 64, rounded: false },
    props: [
      { name: "src", type: "string", description: "Image URL." },
      {
        name: "size",
        type: "number",
        description: "Width and height, in pixels.",
        default: "40",
      },
      {
        name: "alt",
        type: "string",
        description: "Alternative text.",
        default: '""',
      },
      {
        name: "rounded",
        type: "boolean",
        description: "Apply rounded corners.",
        default: "true",
      },
    ],
  },
  {
    name: "Icon",
    category: "Content",
    description: "A small inline icon from the built-in set.",
    example: {
      type: "Row",
      gap: 3,
      children: [
        { type: "Icon", name: "calendar" },
        { type: "Icon", name: "shield-check" },
        { type: "Icon", name: "map-pin" },
        { type: "Icon", name: "star" },
        { type: "Icon", name: "cloud-sun" },
      ],
    },
    props: [
      {
        name: "name",
        type: "calendar | shield-check | map-pin | check | x | star | cloud-sun | music | play | user | plane",
        description: "Icon name from the built-in set.",
      },
      {
        name: "size",
        type: "number",
        description: "Icon size, in pixels.",
        default: "20",
      },
      { name: "color", type: COLOR_TOKENS, description: "Icon color token." },
    ],
  },
  {
    name: "Chart",
    category: "Content",
    description: "Plot data as a bar, line, area, or sparkline chart.",
    example: {
      type: "Chart",
      variant: "bar",
      data: [
        { label: "Mon", value: 12 },
        { label: "Tue", value: 19 },
        { label: "Wed", value: 14 },
        { label: "Thu", value: 22 },
        { label: "Fri", value: 18 },
      ],
    },
    props: [
      {
        name: "variant",
        type: "bar | line | area | sparkline",
        description: "Chart style.",
        default: "bar",
      },
      {
        name: "data",
        type: "Record<string, string | number>[]",
        description: "Data points to plot.",
        default: "[]",
      },
      {
        name: "xKey",
        type: "string",
        description: "Key on each datum for the x-axis label.",
        default: "label",
      },
      {
        name: "dataKey",
        type: "string",
        description: "Key for the plotted value (single series).",
        default: "value",
      },
      {
        name: "series",
        type: "{ dataKey: string; color?: string; name?: string }[]",
        description:
          "Plot multiple series, one entry per key. Overrides dataKey.",
      },
      {
        name: "stacked",
        type: "boolean",
        description: "Stack the series (bar and area variants).",
        default: "false",
      },
      {
        name: "color",
        type: "string",
        description: "Series color; a CSS color or var.",
        default: "var(--chart-1)",
      },
      {
        name: "height",
        type: "number",
        description: "Chart height, in pixels.",
        default: "160 (56 for sparkline)",
      },
    ],
  },
  {
    name: "Badge",
    category: "Content",
    description: "A compact status or metadata pill.",
    example: {
      type: "Row",
      gap: 2,
      children: [
        { type: "Badge", value: "+2.32%" },
        { type: "Badge", value: "Beta", variant: "secondary" },
        { type: "Badge", value: "Draft", variant: "outline" },
      ],
    },
    props: [
      { name: "value", type: "string", description: "Text content." },
      {
        name: "variant",
        type: "default | secondary | destructive | outline",
        description: "Badge style.",
        default: "default",
      },
    ],
  },
  {
    name: "Input",
    category: "Forms",
    description: "A single-line text input control.",
    example: {
      type: "Input",
      inputType: "email",
      placeholder: "you@example.com",
    },
    props: [
      {
        name: "name",
        type: "string",
        description: "Form field name submitted with the value.",
      },
      {
        name: "inputType",
        type: "text | number | email | password | tel | url",
        description: "Native input type.",
        default: "text",
      },
      {
        name: "placeholder",
        type: "string",
        description: "Placeholder shown when empty.",
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Initial value of the input.",
      },
      {
        name: "required",
        type: "boolean",
        description: "Mark as required for submission.",
        default: "false",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "Disable interactions.",
        default: "false",
      },
    ],
  },
  {
    name: "Textarea",
    category: "Forms",
    description: "A multi-line text input control.",
    example: {
      type: "Textarea",
      placeholder: "Write a message...",
      rows: 3,
    },
    props: [
      {
        name: "name",
        type: "string",
        description: "Form field name submitted with the value.",
      },
      {
        name: "placeholder",
        type: "string",
        description: "Placeholder shown when empty.",
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Initial value of the textarea.",
      },
      {
        name: "rows",
        type: "number",
        description: "Initial number of visible rows.",
        default: "3",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "Disable interactions.",
        default: "false",
      },
    ],
  },
  {
    name: "Select",
    category: "Forms",
    description: "A single-value dropdown select control.",
    example: {
      type: "Select",
      placeholder: "Choose a flavor",
      options: [
        { label: "Vanilla", value: "vanilla" },
        { label: "Chocolate", value: "chocolate" },
        { label: "Strawberry", value: "strawberry" },
      ],
    },
    props: [
      {
        name: "options",
        type: "(string | { label?: string; value: string })[]",
        description: "Selectable options.",
        default: "[]",
      },
      {
        name: "name",
        type: "string",
        description: "Form field name submitted with the value.",
      },
      {
        name: "placeholder",
        type: "string",
        description: "Text shown when no value is selected.",
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Initial selected value.",
      },
      {
        name: "block",
        type: "boolean",
        description: "Stretch the trigger to the full width.",
        default: "false",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "Disable interactions.",
        default: "false",
      },
    ],
  },
  {
    name: "Checkbox",
    category: "Forms",
    description: "A binary selection control with an optional label.",
    example: {
      type: "Checkbox",
      label: "Subscribe to updates",
      defaultChecked: true,
    },
    props: [
      {
        name: "label",
        type: "string",
        description: "Text rendered next to the checkbox.",
      },
      {
        name: "name",
        type: "string",
        description: "Form field name submitted with the value.",
      },
      {
        name: "defaultChecked",
        type: "boolean",
        description: "Initial checked state.",
        default: "false",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "Disable interactions.",
        default: "false",
      },
    ],
  },
  {
    name: "RadioGroup",
    category: "Forms",
    description: "Choose a single option from a set.",
    example: {
      type: "RadioGroup",
      defaultValue: "md",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    props: [
      {
        name: "options",
        type: "(string | { label?: string; value: string })[]",
        description: "Options to render as radio items.",
        default: "[]",
      },
      {
        name: "name",
        type: "string",
        description: "Form field name submitted with the value.",
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Initial selected value.",
      },
      {
        name: "direction",
        type: "row | col",
        description: "Layout direction of the radio items.",
        default: "row",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "Disable interactions for the whole group.",
        default: "false",
      },
    ],
  },
  {
    name: "DatePicker",
    category: "Forms",
    description: "Select a date from a calendar popover.",
    example: { type: "DatePicker", placeholder: "Pick a date" },
    props: [
      {
        name: "placeholder",
        type: "string",
        description: "Text shown when no date is selected.",
        default: '"Pick a date"',
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Initial ISO date string (e.g. 2024-01-31).",
      },
      {
        name: "min",
        type: "string",
        description: "Earliest selectable ISO date (inclusive).",
      },
      {
        name: "max",
        type: "string",
        description: "Latest selectable ISO date (inclusive).",
      },
      {
        name: "block",
        type: "boolean",
        description: "Stretch the trigger to the full width.",
        default: "false",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "Disable interactions.",
        default: "false",
      },
    ],
  },
  {
    name: "Form",
    category: "Forms",
    description: "A layout container for form controls and submission.",
    example: {
      type: "Form",
      gap: 2,
      children: [
        { type: "Label", value: "Email", fieldName: "email" },
        {
          type: "Input",
          name: "email",
          inputType: "email",
          placeholder: "you@example.com",
        },
        { type: "Button", label: "Submit", block: true },
      ],
    },
    props: [
      {
        name: "direction",
        type: "row | col",
        description: "Direction children are laid out in.",
        default: "col",
      },
      {
        name: "gap",
        type: "number",
        description: "Space between children, in 4px units.",
      },
      {
        name: "align",
        type: ALIGN_TOKENS,
        description: "Cross-axis alignment of children.",
      },
      {
        name: "justify",
        type: `${ALIGN_TOKENS} | between`,
        description: "Main-axis distribution of children.",
      },
      {
        name: "padding",
        type: "number",
        description: "Inner padding, in 4px units.",
      },
    ],
  },
  {
    name: "Button",
    category: "Actions",
    description: "A call-to-action button.",
    example: {
      type: "Row",
      gap: 2,
      children: [
        { type: "Button", label: "Approve" },
        { type: "Button", label: "Decline", variant: "ghost" },
      ],
    },
    props: [
      { name: "label", type: "string", description: "Button text." },
      {
        name: "variant",
        type: "default | secondary | outline | ghost",
        description: "Button style.",
        default: "default",
      },
      {
        name: "block",
        type: "boolean",
        description: "Stretch to the full available width.",
        default: "false",
      },
    ],
  },
];
