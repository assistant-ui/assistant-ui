import type { UINode } from "@/components/generative-ui";

export type PrimitiveCategory = "Layout" | "Typography" | "Content" | "Actions";

export const PRIMITIVE_CATEGORIES: PrimitiveCategory[] = [
  "Layout",
  "Typography",
  "Content",
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
    description: "Plot data as a bar, line, or sparkline chart.",
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
        type: "bar | line | sparkline",
        description: "Chart style.",
        default: "bar",
      },
      {
        name: "data",
        type: "{ label?: string; value: number }[]",
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
        description: "Key on each datum for the plotted value.",
        default: "value",
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
