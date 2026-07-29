import {
  defaultGenerativeUILibrary,
  type UISpec,
} from "@assistant-ui/react-generative-ui";

export type ComponentCategory = {
  label: string;
  components: readonly string[];
};

export const COMPONENT_CATEGORIES: readonly ComponentCategory[] = [
  {
    label: "Layout",
    components: ["Card", "Row", "Col", "Box", "Spacer", "Divider", "Carousel"],
  },
  {
    label: "Typography",
    components: ["Header", "Text", "Caption", "Markdown"],
  },
  {
    label: "Data",
    components: ["Fact", "Table", "Chart", "Badge"],
  },
  {
    label: "Media",
    components: ["Image", "Icon"],
  },
  {
    label: "Controls",
    components: [
      "Button",
      "Select",
      "Input",
      "DatePicker",
      "Checkbox",
      "RadioGroup",
      "Form",
    ],
  },
  {
    label: "Lists",
    components: ["ListView", "ListViewItem"],
  },
  {
    label: "Feedback",
    components: ["Alert"],
  },
] as const;

export const COMPONENT_EXAMPLES: Record<string, UISpec> = {
  Card: {
    $type: "Card",
    title: "Order summary",
    children: [
      {
        $type: "Text",
        value: "Two items ready for checkout.",
        size: "sm",
        color: "secondary",
      },
      {
        $type: "Fact",
        label: "Total",
        value: "$48.00",
      },
    ],
  },
  Row: {
    $type: "Row",
    gap: 2,
    align: "center",
    children: [
      { $type: "Badge", value: "In stock", variant: "success" },
      { $type: "Badge", value: "Free shipping", variant: "info" },
      { $type: "Text", value: "Ships today", size: "sm", color: "secondary" },
    ],
  },
  Col: {
    $type: "Col",
    gap: 2,
    children: [
      { $type: "Header", text: "Shipping address", size: "md" },
      { $type: "Text", value: "142 Market Street", size: "sm" },
      { $type: "Text", value: "San Francisco, CA 94105", size: "sm" },
    ],
  },
  Box: {
    $type: "Box",
    width: "100%",
    height: 8,
    radius: "full",
    background: "rgba(59, 130, 246, 0.2)",
    children: {
      $type: "Box",
      width: "62%",
      height: 8,
      radius: "full",
      background: "#3b82f6",
    },
  },
  Spacer: {
    $type: "Row",
    align: "center",
    children: [
      { $type: "Text", value: "Subtotal", size: "sm" },
      { $type: "Spacer" },
      { $type: "Text", value: "$36.00", weight: "medium" },
    ],
  },
  Divider: {
    $type: "Col",
    gap: 3,
    children: [
      { $type: "Text", value: "Account settings", weight: "medium" },
      { $type: "Divider" },
      {
        $type: "Text",
        value: "Manage how we notify you about activity.",
        size: "sm",
        color: "secondary",
      },
    ],
  },
  Carousel: {
    $type: "Carousel",
    label: "Featured stays",
    children: [
      {
        $type: "Card",
        title: "Riverside loft",
        children: {
          $type: "Text",
          value: "$186 / night · 2 guests",
          size: "sm",
          color: "secondary",
        },
      },
      {
        $type: "Card",
        title: "Hillside cabin",
        children: {
          $type: "Text",
          value: "$142 / night · 4 guests",
          size: "sm",
          color: "secondary",
        },
      },
      {
        $type: "Card",
        title: "Harbor suite",
        children: {
          $type: "Text",
          value: "$210 / night · 2 guests",
          size: "sm",
          color: "secondary",
        },
      },
    ],
  },
  Header: {
    $type: "Header",
    text: "Weekly digest",
    size: "xl",
  },
  Text: {
    $type: "Col",
    gap: 2,
    children: [
      {
        $type: "Text",
        value: "Primary body copy at the default size.",
        size: "md",
        weight: "normal",
      },
      {
        $type: "Text",
        value: "Emphasized supporting line.",
        size: "sm",
        weight: "semibold",
        color: "secondary",
      },
    ],
  },
  Caption: {
    $type: "Caption",
    value: "Last updated 2 hours ago",
  },
  Markdown: {
    $type: "Markdown",
    value:
      "**Refund approved.** Your card ending in 4242 will be credited within **3 to 5 business days**.",
  },
  Fact: {
    $type: "Fact",
    label: "Status",
    value: "Shipped",
  },
  Table: {
    $type: "Table",
    columns: [
      { label: "Symbol" },
      { label: "Shares" },
      { label: "Price" },
      { label: "Value" },
    ],
    rows: [
      ["ACME", 40, "$182.10", "$7,284.00"],
      ["GLBX", 25, "$94.55", "$2,363.75"],
      ["NORT", 15, "$310.20", "$4,653.00"],
    ],
  },
  Chart: {
    $type: "Chart",
    variant: "bar",
    stacked: true,
    showAxis: true,
    showLegend: true,
    series: [
      {
        label: "Email",
        data: [
          { label: "W1", value: 42 },
          { label: "W2", value: 38 },
          { label: "W3", value: 51 },
          { label: "W4", value: 35 },
        ],
      },
      {
        label: "Chat",
        data: [
          { label: "W1", value: 28 },
          { label: "W2", value: 33 },
          { label: "W3", value: 25 },
          { label: "W4", value: 40 },
        ],
      },
      {
        label: "Phone",
        data: [
          { label: "W1", value: 12 },
          { label: "W2", value: 9 },
          { label: "W3", value: 15 },
          { label: "W4", value: 11 },
        ],
      },
    ],
  },
  Badge: {
    $type: "Row",
    gap: 2,
    children: [
      { $type: "Badge", value: "Default" },
      { $type: "Badge", value: "Secondary", variant: "secondary" },
      { $type: "Badge", value: "Info", variant: "info" },
      { $type: "Badge", value: "Success", variant: "success" },
      { $type: "Badge", value: "Warning", variant: "warning" },
    ],
  },
  Image: {
    $type: "Image",
    src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&q=80",
    alt: "Bright loft living room with large windows and a sofa",
    size: "md",
  },
  Icon: {
    $type: "Row",
    gap: 4,
    align: "center",
    children: [
      { $type: "Icon", name: "sun", size: "md" },
      { $type: "Icon", name: "plane", size: "md" },
      { $type: "Icon", name: "map-pin", size: "md" },
      { $type: "Icon", name: "credit-card", size: "md" },
      { $type: "Icon", name: "bell", size: "md" },
    ],
  },
  Button: {
    $type: "Row",
    gap: 2,
    children: [
      {
        $type: "Button",
        label: "Add to cart",
        buttonStyle: "primary",
        $action: { type: "add_to_cart", sku: "headphone-pro-1" },
      },
      {
        $type: "Button",
        label: "Save",
        buttonStyle: "secondary",
        $action: { type: "save_item", sku: "headphone-pro-1" },
      },
      {
        $type: "Button",
        label: "Details",
        buttonStyle: "outline",
        $action: { type: "view_details", sku: "headphone-pro-1" },
      },
      {
        $type: "Button",
        label: "Share",
        buttonStyle: "ghost",
        $action: { type: "share_item", sku: "headphone-pro-1" },
      },
      {
        $type: "Button",
        label: "Remove",
        buttonStyle: "danger",
        $action: { type: "remove_item", sku: "headphone-pro-1" },
      },
    ],
  },
  Select: {
    $type: "Select",
    name: "partySize",
    label: "Party size",
    placeholder: "Select party size",
    options: [
      { label: "1 guest", value: "1" },
      { label: "2 guests", value: "2" },
      { label: "3 guests", value: "3" },
      { label: "4+ guests", value: "4" },
    ],
    $action: { type: "set_party_size" },
  },
  Input: {
    $type: "Input",
    name: "email",
    label: "Email",
    placeholder: "you@example.com",
    $action: { type: "submit_email" },
  },
  DatePicker: {
    $type: "DatePicker",
    name: "checkIn",
    label: "Check-in date",
    value: "2026-07-15",
    min: "2026-07-01",
    max: "2026-12-31",
    $action: { type: "set_check_in" },
  },
  Checkbox: {
    $type: "Checkbox",
    name: "reminder",
    label: "Send a reminder 1 hour before",
    defaultChecked: true,
    $action: { type: "toggle_reminder" },
  },
  RadioGroup: {
    $type: "RadioGroup",
    name: "seating",
    label: "Seating preference",
    defaultValue: "indoor",
    options: [
      { label: "Indoor", value: "indoor" },
      { label: "Patio", value: "patio" },
      { label: "Bar", value: "bar" },
    ],
    $action: { type: "set_seating" },
  },
  Form: {
    $type: "Form",
    gap: 3,
    $action: { type: "submit_newsletter" },
    children: [
      {
        $type: "Input",
        name: "name",
        label: "Name",
        placeholder: "Full name",
      },
      {
        $type: "Input",
        name: "email",
        label: "Email",
        placeholder: "you@example.com",
      },
      {
        $type: "Button",
        label: "Subscribe",
        buttonStyle: "primary",
        submit: true,
      },
    ],
  },
  ListView: {
    $type: "ListView",
    children: [
      {
        $type: "ListViewItem",
        $action: { type: "play_track", trackId: "t1" },
        children: {
          $type: "Row",
          align: "center",
          gap: 3,
          children: [
            {
              $type: "Image",
              src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&q=80",
              alt: "Over-ear headphones on a desk",
              size: "sm",
              round: true,
            },
            {
              $type: "Col",
              gap: 0,
              children: [
                {
                  $type: "Text",
                  value: "Morning Light",
                  weight: "medium",
                },
                { $type: "Caption", value: "Aria Sol" },
              ],
            },
            { $type: "Spacer" },
            {
              $type: "Text",
              value: "3:42",
              size: "sm",
              color: "secondary",
            },
          ],
        },
      },
      {
        $type: "ListViewItem",
        $action: { type: "play_track", trackId: "t2" },
        children: {
          $type: "Row",
          align: "center",
          gap: 3,
          children: [
            {
              $type: "Image",
              src: "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=640&q=80",
              alt: "Vinyl records stacked on a shelf",
              size: "sm",
              round: true,
            },
            {
              $type: "Col",
              gap: 0,
              children: [
                {
                  $type: "Text",
                  value: "City After Rain",
                  weight: "medium",
                },
                { $type: "Caption", value: "Northline" },
              ],
            },
            { $type: "Spacer" },
            {
              $type: "Text",
              value: "4:18",
              size: "sm",
              color: "secondary",
            },
          ],
        },
      },
      {
        $type: "ListViewItem",
        $action: { type: "play_track", trackId: "t3" },
        children: {
          $type: "Row",
          align: "center",
          gap: 3,
          children: [
            {
              $type: "Image",
              src: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=640&q=80",
              alt: "Singer performing under stage lights",
              size: "sm",
              round: true,
            },
            {
              $type: "Col",
              gap: 0,
              children: [
                {
                  $type: "Text",
                  value: "Quiet Hours",
                  weight: "medium",
                },
                { $type: "Caption", value: "Lumen" },
              ],
            },
            { $type: "Spacer" },
            {
              $type: "Text",
              value: "2:55",
              size: "sm",
              color: "secondary",
            },
          ],
        },
      },
    ],
  },
  ListViewItem: {
    $type: "ListViewItem",
    $action: { type: "view_order_event", eventId: "transit" },
    children: {
      $type: "Row",
      justify: "between",
      align: "center",
      children: [
        {
          $type: "Col",
          gap: 1,
          children: [
            {
              $type: "Text",
              value: "Out for delivery",
              weight: "medium",
            },
            {
              $type: "Caption",
              value: "Estimated 2:00 to 4:00 PM",
            },
          ],
        },
        {
          $type: "Badge",
          value: "In progress",
          variant: "info",
        },
      ],
    },
  },
  Alert: {
    $type: "Col",
    gap: 3,
    children: [
      {
        $type: "Alert",
        tone: "info",
        title: "Payment received",
        description: "Invoice #1842 was paid in full on July 12.",
      },
      {
        $type: "Alert",
        tone: "warning",
        title: "Card expiring soon",
        description:
          "Update the card on file before July 31 to avoid failed charges.",
      },
    ],
  },
};

{
  const libraryNames = Object.keys(defaultGenerativeUILibrary);
  const librarySet = new Set(libraryNames);
  const categoryNames = COMPONENT_CATEGORIES.flatMap(
    (category) => category.components,
  );
  const exampleNames = Object.keys(COMPONENT_EXAMPLES);

  const categorySeen = new Set<string>();
  const categoryDuplicates: string[] = [];
  for (const name of categoryNames) {
    if (categorySeen.has(name)) categoryDuplicates.push(name);
    categorySeen.add(name);
  }

  const exampleSeen = new Set<string>();
  const exampleDuplicates: string[] = [];
  for (const name of exampleNames) {
    if (exampleSeen.has(name)) exampleDuplicates.push(name);
    exampleSeen.add(name);
  }

  const missingFromCategories = libraryNames.filter(
    (name) => !categorySeen.has(name),
  );
  const extraInCategories = categoryNames.filter(
    (name) => !librarySet.has(name),
  );
  const missingFromExamples = libraryNames.filter(
    (name) => !(name in COMPONENT_EXAMPLES),
  );
  const extraInExamples = exampleNames.filter((name) => !librarySet.has(name));

  const problems: string[] = [];
  if (categoryDuplicates.length > 0) {
    problems.push(
      `duplicated in COMPONENT_CATEGORIES: ${categoryDuplicates.join(", ")}`,
    );
  }
  if (exampleDuplicates.length > 0) {
    problems.push(
      `duplicated in COMPONENT_EXAMPLES: ${exampleDuplicates.join(", ")}`,
    );
  }
  if (missingFromCategories.length > 0) {
    problems.push(
      `in defaultGenerativeUILibrary but missing from COMPONENT_CATEGORIES: ${missingFromCategories.join(", ")}`,
    );
  }
  if (extraInCategories.length > 0) {
    problems.push(
      `in COMPONENT_CATEGORIES but missing from defaultGenerativeUILibrary: ${extraInCategories.join(", ")}`,
    );
  }
  if (missingFromExamples.length > 0) {
    problems.push(
      `in defaultGenerativeUILibrary but missing from COMPONENT_EXAMPLES: ${missingFromExamples.join(", ")}`,
    );
  }
  if (extraInExamples.length > 0) {
    problems.push(
      `in COMPONENT_EXAMPLES but missing from defaultGenerativeUILibrary: ${extraInExamples.join(", ")}`,
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `[@assistant-ui/docs] generative UI component reference drift:\n- ${problems.join("\n- ")}`,
    );
  }
}
