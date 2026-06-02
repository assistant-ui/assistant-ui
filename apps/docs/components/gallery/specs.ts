import type { UINode } from "@/components/generative-ui";

const weather: UINode = {
  type: "WeatherWidget",
  version: "3.1",
  id: "sample-sf",
  location: { name: "San Francisco" },
  units: { temperature: "fahrenheit" },
  current: {
    conditionCode: "partly-cloudy",
    temperature: 72,
    tempMin: 58,
    tempMax: 74,
    windSpeed: 8,
    precipitationLevel: "none",
    visibility: 16,
  },
  forecast: [
    { label: "Mon", conditionCode: "clear", tempMin: 57, tempMax: 73 },
    { label: "Tue", conditionCode: "partly-cloudy", tempMin: 56, tempMax: 71 },
    { label: "Wed", conditionCode: "cloudy", tempMin: 55, tempMax: 68 },
    { label: "Thu", conditionCode: "rain", tempMin: 54, tempMax: 64 },
    { label: "Fri", conditionCode: "clear", tempMin: 56, tempMax: 70 },
  ],
  time: { timeBucket: 5 },
  updatedAt: "2026-04-25T16:00:00.000Z",
};

const chart: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 2,
      children: [
        { type: "Title", value: "Active users", size: "md" },
        { type: "Caption", value: "Monthly signups, last 6 months" },
        {
          type: "Chart",
          variant: "bar",
          data: [
            { label: "Jan", value: 320 },
            { label: "Feb", value: 412 },
            { label: "Mar", value: 386 },
            { label: "Apr", value: 503 },
            { label: "May", value: 478 },
            { label: "Jun", value: 564 },
          ],
        },
      ],
    },
  ],
};

const stock: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        {
          type: "Row",
          align: "center",
          gap: 2,
          children: [
            {
              type: "Col",
              children: [
                { type: "Title", value: "ACME", size: "md" },
                { type: "Caption", value: "Acme Corp." },
              ],
            },
            { type: "Spacer" },
            { type: "Badge", value: "+2.32%" },
          ],
        },
        { type: "Title", value: "$184.32", size: "2xl" },
        {
          type: "Chart",
          variant: "sparkline",
          color: "var(--chart-2)",
          data: [171, 169, 173, 175, 174, 178, 176, 181, 180, 184].map(
            (value) => ({ value }),
          ),
        },
      ],
    },
  ],
};

const event: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        {
          type: "Row",
          gap: 3,
          children: [
            { type: "Icon", name: "calendar", size: 22, color: "secondary" },
            {
              type: "Col",
              gap: 0,
              children: [
                { type: "Caption", value: "Friday, Dec 28" },
                { type: "Text", value: "Q1 roadmap review", weight: "medium" },
                { type: "Caption", value: "1:00 - 2:00 PM" },
                {
                  type: "Row",
                  align: "center",
                  gap: 1,
                  children: [
                    {
                      type: "Icon",
                      name: "map-pin",
                      size: 12,
                      color: "secondary",
                    },
                    { type: "Caption", value: "Cowell Theater" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Row",
          gap: 2,
          children: [
            { type: "Button", label: "Add to calendar" },
            { type: "Button", label: "Discard", variant: "ghost" },
          ],
        },
      ],
    },
  ],
};

const confirm: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        {
          type: "Row",
          gap: 3,
          children: [
            {
              type: "Icon",
              name: "shield-check",
              size: 20,
              color: "secondary",
            },
            {
              type: "Col",
              gap: 0,
              children: [
                { type: "Text", value: "Send 3 invites?", weight: "medium" },
                {
                  type: "Caption",
                  value: "This emails an invitation to 3 recipients.",
                },
              ],
            },
          ],
        },
        {
          type: "Row",
          gap: 2,
          children: [
            { type: "Button", label: "Approve" },
            { type: "Button", label: "Decline", variant: "outline" },
          ],
        },
      ],
    },
  ],
};

const orderLine = (name: string, detail: string, price: string): UINode => ({
  type: "Row",
  align: "center",
  gap: 3,
  children: [
    {
      type: "Col",
      gap: 0,
      children: [
        { type: "Text", value: name, size: "sm", weight: "medium" },
        { type: "Caption", value: detail },
      ],
    },
    { type: "Spacer" },
    { type: "Text", value: price, size: "sm" },
  ],
});

const summaryRow = (label: string, value: string, bold?: boolean): UINode => ({
  type: "Row",
  children: [
    {
      type: "Text",
      value: label,
      size: "sm",
      color: bold ? "emphasis" : "secondary",
      weight: bold ? "medium" : "normal",
    },
    { type: "Spacer" },
    { type: "Text", value, size: "sm", weight: bold ? "medium" : "normal" },
  ],
});

const order: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        { type: "Caption", value: "Hoick Coffee" },
        orderLine("Black Sugar Latte", "16oz Iced · Boba", "$6.50"),
        orderLine("Classic Milk Tea", "16oz Iced · Double Boba", "$6.75"),
        orderLine("Matcha Latte", "16oz Iced · Boba", "$6.50"),
        { type: "Divider" },
        summaryRow("Subtotal", "$19.75"),
        summaryRow("Tax (8.75%)", "$1.73"),
        summaryRow("Total", "$21.48", true),
        { type: "Button", label: "Place order", block: true },
      ],
    },
  ],
};

const revenue: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 2,
      children: [
        { type: "Caption", value: "Revenue" },
        { type: "Title", value: "$48,250", size: "2xl" },
        {
          type: "Row",
          align: "center",
          gap: 1,
          children: [
            { type: "Badge", value: "+12.4%" },
            { type: "Caption", value: "vs last month" },
          ],
        },
        {
          type: "Chart",
          variant: "line",
          color: "var(--chart-2)",
          data: [
            { label: "Wk 1", value: 9200 },
            { label: "Wk 2", value: 10400 },
            { label: "Wk 3", value: 9800 },
            { label: "Wk 4", value: 12600 },
            { label: "Wk 5", value: 12100 },
            { label: "Wk 6", value: 14200 },
          ],
        },
      ],
    },
  ],
};

const track = (rank: string, name: string, artist: string): UINode => ({
  type: "Row",
  align: "center",
  gap: 3,
  children: [
    { type: "Caption", value: rank },
    {
      type: "Col",
      gap: 0,
      children: [
        { type: "Text", value: name, size: "sm", weight: "medium" },
        { type: "Caption", value: artist },
      ],
    },
    { type: "Spacer" },
    { type: "Icon", name: "play", size: 16, color: "secondary" },
  ],
});

const playlist: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        {
          type: "Row",
          align: "center",
          gap: 2,
          children: [
            { type: "Icon", name: "music", size: 18, color: "secondary" },
            { type: "Title", value: "Morning focus", size: "md" },
          ],
        },
        track("1", "Weightless", "Marconi Union"),
        track("2", "An Ending", "Brian Eno"),
        track("3", "Saudade", "Thievery Corporation"),
        { type: "Divider" },
        { type: "Button", label: "Play all", block: true },
      ],
    },
  ],
};

const teammate = (name: string, role: string): UINode => ({
  type: "Row",
  align: "center",
  gap: 3,
  children: [
    { type: "Icon", name: "user", size: 20, color: "secondary" },
    {
      type: "Col",
      gap: 0,
      children: [
        { type: "Text", value: name, size: "sm", weight: "medium" },
        { type: "Caption", value: role },
      ],
    },
    { type: "Spacer" },
    { type: "Button", label: "View", variant: "ghost" },
  ],
});

const contacts: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        { type: "Caption", value: "Technical staff" },
        teammate("Ava Chen", "Staff Engineer"),
        teammate("James Hill", "Member of Technical Staff"),
        teammate("Rohan Mehta", "Member of Technical Staff"),
      ],
    },
  ],
};

const article: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 2,
      children: [
        { type: "Caption", value: "Breakout session" },
        { type: "Title", value: "Orchestrating agents at scale", size: "md" },
        {
          type: "Text",
          value:
            "Connect, create, and deploy enterprise agents with a new suite of agentic platform tools.",
          size: "sm",
          color: "secondary",
        },
        {
          type: "Row",
          gap: 2,
          children: [
            { type: "Button", label: "Read more" },
            { type: "Button", label: "Save", variant: "ghost" },
          ],
        },
      ],
    },
  ],
};

const flight: UINode = {
  type: "Card",
  background: "linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        {
          type: "Row",
          align: "center",
          gap: 2,
          children: [
            { type: "Icon", name: "plane", size: 16, color: "white" },
            { type: "Caption", value: "PA 845", color: "white" },
            { type: "Spacer" },
            { type: "Caption", value: "Fri, Apr 25", color: "white-50" },
          ],
        },
        { type: "Divider", flush: true, tone: "light" },
        {
          type: "Col",
          gap: 3,
          children: [
            {
              type: "Row",
              align: "center",
              children: [
                { type: "Text", value: "San Francisco", color: "white" },
                { type: "Spacer" },
                { type: "Text", value: "London", color: "white" },
              ],
            },
            {
              type: "Box",
              height: 6,
              radius: "full",
              background: "rgba(255, 255, 255, 0.25)",
              children: [
                {
                  type: "Box",
                  width: "62%",
                  height: 6,
                  radius: "full",
                  background: "white",
                },
              ],
            },
            {
              type: "Row",
              align: "center",
              children: [
                {
                  type: "Row",
                  align: "center",
                  gap: 2,
                  children: [
                    {
                      type: "Text",
                      value: "4:00 PM",
                      size: "sm",
                      color: "white",
                    },
                    {
                      type: "Text",
                      value: "On time",
                      size: "sm",
                      color: "white-50",
                    },
                  ],
                },
                { type: "Spacer" },
                {
                  type: "Row",
                  align: "center",
                  gap: 2,
                  children: [
                    {
                      type: "Text",
                      value: "On time",
                      size: "sm",
                      color: "white-50",
                    },
                    {
                      type: "Text",
                      value: "10:25 AM +1",
                      size: "sm",
                      color: "white",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const field = (label: string, fieldName: string, control: UINode): UINode => ({
  type: "Col",
  gap: 1,
  children: [{ type: "Label", value: label, fieldName }, control],
});

const createTask: UINode = {
  type: "Card",
  children: [
    {
      type: "Form",
      gap: 4,
      children: [
        { type: "Title", value: "New task", size: "md" },
        field("Title", "title", {
          type: "Input",
          name: "title",
          defaultValue: "Design resizable popup mode",
        }),
        field("Description", "description", {
          type: "Textarea",
          name: "description",
          rows: 3,
          placeholder: "Describe the task...",
        }),
        field("Due date", "due", {
          type: "DatePicker",
          block: true,
          placeholder: "Pick a date",
        }),
        {
          type: "Row",
          gap: 2,
          children: [
            { type: "Button", label: "Create task" },
            { type: "Button", label: "Cancel", variant: "ghost" },
          ],
        },
      ],
    },
  ],
};

const softwarePurchase: UINode = {
  type: "Card",
  children: [
    {
      type: "Form",
      gap: 4,
      children: [
        { type: "Title", value: "Software purchase", size: "md" },
        field("Vendor or tool", "vendor", {
          type: "Input",
          name: "vendor",
          defaultValue: "ChatGPT Business",
        }),
        field("Plan", "plan", {
          type: "Select",
          name: "plan",
          defaultValue: "business",
          block: true,
          options: [
            { label: "Team", value: "team" },
            { label: "Business", value: "business" },
            { label: "Enterprise", value: "enterprise" },
          ],
        }),
        field("Billing", "billing", {
          type: "Select",
          name: "billing",
          defaultValue: "monthly",
          block: true,
          options: [
            { label: "Monthly", value: "monthly" },
            { label: "Annual", value: "annual" },
          ],
        }),
        field("Start date", "start", {
          type: "DatePicker",
          block: true,
          placeholder: "Pick a date",
        }),
        { type: "Divider" },
        {
          type: "Row",
          align: "center",
          children: [
            { type: "Text", value: "Total", size: "sm", color: "secondary" },
            { type: "Spacer" },
            { type: "Title", value: "$125 / mo", size: "md" },
          ],
        },
        {
          type: "Row",
          gap: 2,
          children: [
            { type: "Button", label: "Confirm" },
            { type: "Button", label: "Discard", variant: "outline" },
          ],
        },
      ],
    },
  ],
};

const feedback: UINode = {
  type: "Card",
  children: [
    {
      type: "Form",
      gap: 4,
      children: [
        { type: "Title", value: "Share feedback", size: "md" },
        {
          type: "Col",
          gap: 2,
          children: [
            { type: "Label", value: "How was your experience?" },
            {
              type: "RadioGroup",
              defaultValue: "great",
              options: [
                { label: "Great", value: "great" },
                { label: "Okay", value: "okay" },
                { label: "Poor", value: "poor" },
              ],
            },
          ],
        },
        {
          type: "Col",
          gap: 2,
          children: [
            { type: "Label", value: "What did you use?" },
            { type: "Checkbox", label: "Docs", defaultChecked: true },
            { type: "Checkbox", label: "API" },
            { type: "Checkbox", label: "Dashboard" },
          ],
        },
        field("Comments", "comments", {
          type: "Textarea",
          name: "comments",
          rows: 3,
          placeholder: "Tell us more...",
        }),
        { type: "Button", label: "Submit feedback", block: true },
      ],
    },
  ],
};

const tableRow = (...cells: string[]): UINode => ({
  type: "TableRow",
  children: cells.map((value, i) => ({
    type: "TableCell",
    value,
    ...(i > 0 ? { align: "end" } : {}),
  })),
});

const comparisonTable: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        { type: "Title", value: "Plan comparison", size: "md" },
        { type: "Caption", value: "Monthly pricing per workspace" },
        {
          type: "Table",
          children: [
            {
              type: "TableRow",
              header: true,
              children: [
                { type: "TableCell", value: "Plan" },
                { type: "TableCell", value: "Price", align: "end" },
                { type: "TableCell", value: "Seats", align: "end" },
              ],
            },
            tableRow("Free", "$0", "1"),
            tableRow("Pro", "$20", "5"),
            tableRow("Team", "$40", "25"),
          ],
        },
      ],
    },
  ],
};

const trafficSplit: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        { type: "Title", value: "Active users", size: "md" },
        { type: "Caption", value: "Monthly traffic split, last 6 months" },
        {
          type: "Chart",
          variant: "bar",
          stacked: true,
          series: [
            { dataKey: "desktop", name: "Desktop", color: "var(--chart-1)" },
            { dataKey: "mobile", name: "Mobile", color: "var(--chart-2)" },
          ],
          data: [
            { label: "Jan", desktop: 220, mobile: 140 },
            { label: "Feb", desktop: 260, mobile: 180 },
            { label: "Mar", desktop: 240, mobile: 210 },
            { label: "Apr", desktop: 300, mobile: 240 },
            { label: "May", desktop: 290, mobile: 270 },
            { label: "Jun", desktop: 340, mobile: 300 },
          ],
        },
        {
          type: "Row",
          gap: 3,
          children: [
            {
              type: "Row",
              align: "center",
              gap: 1,
              children: [
                {
                  type: "Box",
                  width: 8,
                  height: 8,
                  radius: "full",
                  background: "var(--chart-1)",
                },
                { type: "Caption", value: "Desktop" },
              ],
            },
            {
              type: "Row",
              align: "center",
              gap: 1,
              children: [
                {
                  type: "Box",
                  width: 8,
                  height: 8,
                  radius: "full",
                  background: "var(--chart-2)",
                },
                { type: "Caption", value: "Mobile" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const channelMessage: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 2,
      children: [
        {
          type: "Row",
          align: "center",
          gap: 2,
          children: [
            {
              type: "Text",
              value: "#proj-assistant",
              size: "sm",
              weight: "medium",
            },
            { type: "Spacer" },
            { type: "Caption", value: "4:48 PM" },
          ],
        },
        {
          type: "Row",
          align: "center",
          gap: 2,
          children: [
            { type: "Icon", name: "user", size: 16, color: "secondary" },
            {
              type: "Text",
              value: "Zach Johnston",
              size: "sm",
              weight: "medium",
            },
          ],
        },
        {
          type: "Markdown",
          value:
            "**End of week update:**\n\n- Designed a new header system with custom menu actions\n- Made progress on the training material\n- Coordinated with partners on remaining requirements\n\n_Next week:_ build out the Figma library and switch to the new icons.",
        },
      ],
    },
  ],
};

const receipt: UINode = {
  type: "Card",
  children: [
    {
      type: "Col",
      gap: 3,
      children: [
        {
          type: "Row",
          align: "center",
          gap: 2,
          children: [
            { type: "Icon", name: "check", size: 18, color: "secondary" },
            { type: "Text", value: "Purchase complete", weight: "medium" },
          ],
        },
        {
          type: "Row",
          align: "center",
          gap: 3,
          children: [
            {
              type: "Box",
              width: 56,
              height: 56,
              radius: "lg",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            },
            {
              type: "Col",
              gap: 0,
              children: [
                {
                  type: "Text",
                  value: "Blue folding chair",
                  size: "sm",
                  weight: "medium",
                },
                {
                  type: "Caption",
                  value: "Free delivery · 14-day returns",
                },
              ],
            },
          ],
        },
        { type: "Divider" },
        summaryRow("Estimated delivery", "Thu, Oct 8"),
        summaryRow("Sold by", "assistant-ui"),
        summaryRow("Paid", "$20.00", true),
        {
          type: "Button",
          label: "View details",
          block: true,
          variant: "outline",
        },
      ],
    },
  ],
};

/** A weather card expressed entirely as a JSON UI spec. */
export const WEATHER_SPEC = weather;

/** JSON UI specs for the gallery widgets, keyed by slug. */
export const GALLERY_SPECS: Record<string, UINode> = {
  weather,
  chart,
  stock,
  event,
  confirm,
  order,
  revenue,
  playlist,
  contacts,
  article,
  flight,
  "create-task": createTask,
  "software-purchase": softwarePurchase,
  feedback,
  "comparison-table": comparisonTable,
  "traffic-split": trafficSplit,
  "channel-message": channelMessage,
  receipt,
};
